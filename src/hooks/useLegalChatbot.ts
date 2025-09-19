import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export interface CaseData {
  category?: string;
  subcategory?: string;
  urgency?: 'low' | 'medium' | 'high' | 'urgent';
  entities?: {
    parties?: string[];
    dates?: string[];
    amounts?: string[];
    locations?: string[];
    legal_documents?: string[];
    legal_deadlines?: string[];
    legal_relationships?: string[];
    assets_property?: string[];
    institutions?: string[];
  };
  requiredDocuments?: string[];
  nextQuestions?: string[];
  legal_issues?: string[];
  legal_classification?: {
    primary_legal_area?: string;
    secondary_legal_areas?: string[];
    applicable_statutes?: string[];
    legal_concepts?: string[];
  };
  violation_types?: string[];
  legal_remedies_sought?: string[];
  legal_complexity?: 'simple' | 'moderate' | 'complex';
  readyForNextStep?: boolean;
}

export interface ChatbotState {
  messages: ChatMessage[];
  isLoading: boolean;
  conversationId: string | null;
  mode: 'qa' | 'intake';
  language: 'en' | 'ar' | 'de';
  extractedData: CaseData | null;
  needsPersonalDetails: boolean;
  anonymousSessionId?: string | null;
}

export const useLegalChatbot = (initialMode: 'qa' | 'intake' = 'intake') => {
  const { toast } = useToast();

  const [state, setState] = useState<ChatbotState>({
    messages: [],
    isLoading: false,
    conversationId: null,
    mode: initialMode,
    language: 'en',
    extractedData: null,
    needsPersonalDetails: false,
    anonymousSessionId: null,
  });

  // Refs to avoid stale closures for IDs
  const conversationIdRef = useRef<string | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);

  // Initialize conversation (optionally with known user/case)
  const initializeConversation = useCallback(async (userId?: string, initialCaseId?: string) => {
    try {
      const sessionId = crypto.randomUUID();

      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: state.mode === 'intake' ? userId || null : userId,
          case_id: initialCaseId || null,
          session_id: sessionId,
          mode: state.mode,
          language: state.language,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      const newConversationId = conversation.id as string;
      conversationIdRef.current = newConversationId;

      // For anonymous Q&A sessions, create an anonymous session entry
      let anonymousSessionId = null;
      if (!userId && state.mode === 'qa') {
        const { data: anonymousSession, error: anonymousError } = await supabase
          .from('anonymous_qa_sessions')
          .insert({
            session_id: sessionId,
            conversation_id: newConversationId,
            language: state.language,
            status: 'active',
            total_messages: 1, // welcome message
            last_activity: new Date().toISOString()
          })
          .select('id')
          .single();

        if (anonymousError) {
          console.error('Error creating anonymous session:', anonymousError);
        } else {
          anonymousSessionId = anonymousSession.id;
        }
      }

      setState(prev => ({
        ...prev,
        conversationId: newConversationId,
        anonymousSessionId,
        messages: [{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getWelcomeMessage(prev.mode, prev.language),
          timestamp: new Date(),
        }]
      }));

      // Ensure we have a case id for persistence
      const effectiveCaseId = conversation.case_id ?? initialCaseId ?? null;
      if (effectiveCaseId) {
        setCaseId(effectiveCaseId);
      } else if (state.mode === 'intake' && userId) {
        // Optional: create a draft case immediately so saveCaseStep works
        const { data: draftCase, error: caseErr } = await supabase
          .from('cases')
          .insert({ 
            status: 'draft',
            category: 'general',
            title: 'New Legal Inquiry',
            user_id: userId || null
          })
          .select('id')
          .single();

        if (!caseErr && draftCase?.id) {
          setCaseId(draftCase.id);
          await supabase.from('conversations').update({ case_id: draftCase.id }).eq('id', newConversationId);
        }
      }

      return newConversationId;
    } catch (err) {
      console.error('Failed to initialize conversation:', err);
      toast({
        title: 'Error',
        description: 'Failed to start conversation. Please try again.',
        variant: 'destructive',
      });
      return null;
    }
  }, [state.mode, state.language, toast]);

  // Send message to AI
  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content?.trim();
    if (!trimmed) return;

    const activeConversationId = conversationIdRef.current ?? state.conversationId;
    if (!activeConversationId) {
      toast({
        title: 'Error',
        description: 'No active conversation. Please start again.',
        variant: 'destructive',
      });
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
    };

    // Optimistically append user message and set loading
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
    }));

    // Update anonymous session metadata if applicable
    if (state.anonymousSessionId) {
      const messageCount = state.messages.length + 1; // +1 for the message we just added
      const updateData: any = {
        total_messages: messageCount,
        last_activity: new Date().toISOString()
      };

      // Store first message preview if this is the first user message
      if (messageCount === 2) { // 1 welcome + 1 user message
        updateData.first_message_preview = trimmed.substring(0, 100);
      }

      try {
        await supabase
          .from('anonymous_qa_sessions')
          .update(updateData)
          .eq('id', state.anonymousSessionId);
      } catch (err) {
        console.error('Error updating anonymous session:', err);
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('legal-chatbot', {
        body: {
          message: trimmed,
          conversation_id: activeConversationId,
          mode: state.mode,
          language: state.language,
        },
      });

      if (error) throw error;

      const aiText: string = data?.response ?? 'I could not generate a response.';
      const newExtracted: CaseData | null = data?.extractedData ?? null;
      const needsPD: boolean = Boolean(data?.needsPersonalDetails);

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: aiText,
        timestamp: new Date(),
        metadata: newExtracted || undefined,
      };

      // If the function returns a conversationId or caseId, sync them
      if (data?.conversationId && data.conversationId !== conversationIdRef.current) {
        conversationIdRef.current = data.conversationId;
      }
      if (data?.caseId && data.caseId !== caseId) {
        setCaseId(data.caseId);
      } else if (!caseId && data?.conversationId) {
        // fallback: fetch case linked to conversation
        const { data: conv } = await supabase
          .from('conversations')
          .select('case_id')
          .eq('id', data.conversationId)
          .single();
        if (conv?.case_id) setCaseId(conv.case_id);
      }

      // Update anonymous session with final message count
      if (state.anonymousSessionId) {
        try {
          await supabase
            .from('anonymous_qa_sessions')
            .update({
              total_messages: state.messages.length + 2, // +2 for user and AI messages
              last_activity: new Date().toISOString()
            })
            .eq('id', state.anonymousSessionId);
        } catch (err) {
          console.error('Error updating anonymous session final count:', err);
        }
      }

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, aiMessage],
        isLoading: false,
        extractedData: newExtracted ? { ...(prev.extractedData || {}), ...newExtracted } : prev.extractedData,
        needsPersonalDetails: needsPD || prev.needsPersonalDetails,
      }));
    } catch (err) {
      console.error('Error sending message:', err);

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I encountered an error. Please try again or contact support.',
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false,
      }));

      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    }
  }, [state.mode, state.language, state.messages.length, state.anonymousSessionId, toast, caseId]);

  // Switch between Q&A and Intake modes -> start fresh
  const switchMode = useCallback((newMode: 'qa' | 'intake') => {
    conversationIdRef.current = null;
    setState(prev => ({
      ...prev,
      mode: newMode,
      conversationId: null,
      anonymousSessionId: null,
      messages: [{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getWelcomeMessage(newMode, prev.language),
        timestamp: new Date(),
      }],
      extractedData: null,
      needsPersonalDetails: false,
    }));
    setCaseId(null);
  }, []);

  // Change language -> start fresh
  const setLanguage = useCallback((language: 'en' | 'ar' | 'de') => {
    conversationIdRef.current = null;
    setState(prev => ({
      ...prev,
      language,
      conversationId: null,
      anonymousSessionId: null,
      messages: [{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getWelcomeMessage(prev.mode, language),
        timestamp: new Date(),
      }],
      extractedData: null,
      needsPersonalDetails: false,
    }));
    setCaseId(null);
  }, []);

  // Clear conversation -> keep mode/lang, but drop IDs so a new one is created
  const clearConversation = useCallback(() => {
    conversationIdRef.current = null;
    setState(prev => ({
      ...prev,
      conversationId: null,
      anonymousSessionId: null,
      messages: [{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getWelcomeMessage(prev.mode, prev.language),
        timestamp: new Date(),
      }],
      extractedData: null,
      needsPersonalDetails: false,
    }));
    setCaseId(null);
  }, []);

  // Mark personal details as completed
  const setPersonalDetailsCompleted = useCallback(() => {
    setState(prev => ({ ...prev, needsPersonalDetails: false }));
  }, []);

  const saveCaseStep = useCallback(async (step: number, stepData?: any) => {
    if (!caseId) return;
    try {
      const updateData: any = {
        step,
        draft_data: {
          extractedData: state.extractedData,
          currentStep: step,
          lastUpdated: new Date().toISOString(),
          ...stepData,
        },
      };
      await supabase.from('cases').update(updateData).eq('id', caseId);
    } catch (error) {
      console.error('Error saving case step:', error);
    }
  }, [caseId, state.extractedData]);

  return {
    ...state,
    caseId,
    setCaseId,
    initializeConversation,
    sendMessage,
    switchMode,
    setLanguage,
    clearConversation,
    setPersonalDetailsCompleted,
    saveCaseStep,
  };
};

function getWelcomeMessage(mode: 'qa' | 'intake', language: 'en' | 'ar' | 'de'): string {
  const messages = {
    qa: {
      en: "Hello! I'm Lexa, your AI legal assistant specialized in Egyptian law. I can help answer your legal questions based on Egyptian jurisdiction. Please note that I provide legal information, not legal advice. For specific legal matters, please consult with a qualified Egyptian lawyer. How can I help you today?",
      ar: 'مرحباً! أنا ليكسا، مساعدك القانوني الذكي المتخصص في القانون المصري. يمكنني مساعدتك في الإجابة على أسئلتك القانونية بناءً على القضاء المصري. يرجى ملاحظة أنني أقدم معلومات قانونية وليس استشارة قانونية. للأمور القانونية المحددة، يرجى استشارة محامٍ مصري مؤهل. كيف يمكنني مساعدتك اليوم؟',
      de: 'Hallo! Ich bin Lexa, Ihr KI-Rechtsassistent, der sich auf ägyptisches Recht spezialisiert hat. Ich kann Ihnen bei der Beantwortung Ihrer Rechtsfragen basierend auf ägyptischer Rechtsprechung helfen. Bitte beachten Sie, dass ich Rechtsinformationen und keine Rechtsberatung anbiete. Für spezifische Rechtsangelegenheiten wenden Sie sich bitte an einen qualifizierten ägyptischen Anwalt. Wie kann ich Ihnen heute helfen?',
    },
    intake: {
      en: "Hello! I'm Lexa, your AI legal assistant. I'm here to help you with your legal case intake. I'll ask you some questions to understand your situation and connect you with the right Egyptian lawyer. This conversation will help us categorize your case and gather the necessary information. Please note that I'm collecting information, not providing legal advice. Let's start - could you please describe your legal issue?",
      ar: 'مرحباً! أنا ليكسا، مساعدك القانوني الذكي. أنا هنا لمساعدتك في استقبال قضيتك القانونية. سأطرح عليك بعض الأسئلة لفهم وضعك وربطك بالمحامي المصري المناسب. ستساعدنا هذه المحادثة في تصنيف قضيتك وجمع المعلومات اللازمة. يرجى ملاحظة أنني أجمع المعلومات وليس أقدم استشارة قانونية. لنبدأ - هل يمكنك وصف مشكلتك القانونية؟',
      de: 'Hallo! Ich bin Lexa, Ihr KI-Rechtsassistent. Ich bin hier, um Ihnen bei der Aufnahme Ihres Rechtsfalls zu helfen. Ich werde Ihnen einige Fragen stellen, um Ihre Situation zu verstehen und Sie mit dem richtigen ägyptischen Anwalt zu verbinden. Dieses Gespräch hilft uns, Ihren Fall zu kategorisieren und die notwendigen Informationen zu sammeln. Bitte beachten Sie, dass ich Informationen sammle und keine Rechtsberatung anbiete. Lassen Sie uns beginnen - könnten Sie bitte Ihr Rechtsproblem beschreiben?',
    },
  };
  return messages[mode][language];
}