import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { generateCaseTitle } from '@/utils/caseUtils';
import { useCaseState } from './useCaseState';

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
  const { caseId, caseNumber, conversationId: globalConversationId, idempotencyKey, setCaseData, setConversationId: setGlobalConversationId, setIdempotencyKey, clearCase } = useCaseState();

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

  // Create case first and return durable case_id/case_number with idempotency
  const createCase = useCallback(async (userId: string): Promise<{ caseId: string; caseNumber: string } | null> => {
    try {
      console.log('Creating case for user:', userId);
      
      // Generate idempotency key if not already set
      let currentIdempotencyKey = idempotencyKey;
      if (!currentIdempotencyKey) {
        currentIdempotencyKey = crypto.randomUUID();
        setIdempotencyKey(currentIdempotencyKey);
      }

      // Try to find existing case with same idempotency key first
      const { data: existingCase } = await supabase
        .from('cases')
        .select('id, case_number')
        .eq('user_id', userId)
        .eq('idempotency_key', currentIdempotencyKey)
        .maybeSingle();

      if (existingCase) {
        console.log('Using existing case with idempotency key:', existingCase);
        return { caseId: existingCase.id, caseNumber: existingCase.case_number };
      }
      
      // Generate unique case number
      const now = new Date();
      const year = now.getFullYear();
      const dayOfYear = Math.floor((now.getTime() - new Date(year, 0, 0).getTime()) / 86400000);
      const hour = now.getHours().toString().padStart(2, '0');
      const minute = now.getMinutes().toString().padStart(2, '0');
      const second = now.getSeconds().toString().padStart(2, '0');
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const uniqueCaseNumber = `CASE-${year}-${dayOfYear.toString().padStart(3, '0')}-${hour}${minute}${second}-${randomSuffix}`;
      
      const { data: newCase, error: caseError } = await supabase
        .from('cases')
        .insert({ 
          status: 'intake',
          category: 'General Consultation',
          title: 'New Legal Inquiry',
          user_id: userId,
          case_number: uniqueCaseNumber,
          language: state.language,
          jurisdiction: 'egypt',
          description: 'Case created from intake conversation',
          idempotency_key: currentIdempotencyKey,
        })
        .select()
        .single();

      if (caseError) {
        // Check if this is a duplicate key error due to race condition
        if (caseError.code === '23505' && caseError.message.includes('unique_case_per_user_idempotency')) {
          // Race condition: another request created the case, fetch it
          const { data: raceCase } = await supabase
            .from('cases')
            .select('id, case_number')
            .eq('user_id', userId)
            .eq('idempotency_key', currentIdempotencyKey)
            .maybeSingle();
          
          if (raceCase) {
            console.log('Using case created by race condition:', raceCase);
            return { caseId: raceCase.id, caseNumber: raceCase.case_number };
          }
        }
        
        console.error('Error creating case:', caseError);
        toast({
          title: "Case Creation Failed",
          description: "Failed to create case. Please try again.",
          variant: "destructive"
        });
        return null;
      }

      console.log('Case created successfully:', newCase.id, newCase.case_number);
      return { caseId: newCase.id, caseNumber: newCase.case_number };
    } catch (error) {
      console.error('Unexpected error creating case:', error);
      toast({
        title: "Case Creation Failed",
        description: "Unexpected error creating case. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [state.language, toast, idempotencyKey, setIdempotencyKey]);

  // Initialize conversation (optionally with known user/case)
  const initializeConversation = useCallback(async (userId?: string, initialCaseId?: string) => {
    try {
      // For intake mode, ensure we have a userId
      if (state.mode === 'intake' && !userId) {
        console.log('Intake mode requires userId, skipping initialization');
        return null;
      }

      // For anonymous QA mode, explicitly handle the case
      if (state.mode === 'qa' && !userId) {
        console.log('Initializing anonymous QA conversation');
      } else if (state.mode === 'intake') {
        // Check if we have a valid session for authenticated operations
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session) {
          console.log('No active session for intake mode, retrying...');
          // Brief retry for session readiness
          await new Promise(resolve => setTimeout(resolve, 100));
          const { data: retrySession } = await supabase.auth.getSession();
          if (!retrySession?.session) {
            console.log('Still no session after retry, aborting');
            return null;
          }
        }
      }

      console.log('Initializing conversation with:', { 
        userId: userId || null, 
        initialCaseId, 
        mode: state.mode, 
        language: state.language,
        isAnonymous: !userId
      });
      
      const sessionId = crypto.randomUUID();
      let effectiveCaseId = initialCaseId;

      // For intake mode, create case FIRST to get durable case_id
      if (state.mode === 'intake' && userId && !initialCaseId) {
        const caseResult = await createCase(userId);
        if (!caseResult) {
          throw new Error('Failed to create case');
        }
        effectiveCaseId = caseResult.caseId;
        
        // Verify the case exists before proceeding
        const { data: verifyCase, error: verifyError } = await supabase
          .from('cases')
          .select('id')
          .eq('id', effectiveCaseId)
          .single();
          
        if (verifyError || !verifyCase) {
          console.error('Case verification failed:', verifyError);
          throw new Error(`Case ${effectiveCaseId} does not exist after creation`);
        }
        
        // Store in global state immediately
        setCaseData(caseResult.caseId, caseResult.caseNumber);
        console.log('Case created and verified:', caseResult);
      }

      // Prepare conversation data - only include case_id if we have a valid one
      const conversationData: any = {
        user_id: userId || null,
        session_id: sessionId,
        mode: state.mode,
        language: state.language,
        status: 'active' as const,
      };

      // Only add case_id if we have a valid one (to avoid foreign key violations)
      if (effectiveCaseId) {
        conversationData.case_id = effectiveCaseId;
      }

      console.log('Inserting conversation with data:', conversationData);

      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert(conversationData)
        .select()
        .single();

      if (error) {
        console.error('Conversation creation error:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          mode: state.mode,
          userId: userId || null,
          isAnonymous: !userId
        });
        throw error;
      }

      console.log('Conversation created successfully:', conversation);
      const newConversationId = conversation.id as string;
      conversationIdRef.current = newConversationId;
      setGlobalConversationId(newConversationId);

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
        messages: [] // Don't use local messages - read from DB
      }));

      // Welcome message will not be locally written to case_messages.
      // The server (edge function) persists messages; UI reads from DB via admin views.
      // Removed local welcome insert to avoid duplicate writes.

      // Small delay to ensure conversation is committed to database
      // This helps prevent race conditions with the first user message
      await new Promise(resolve => setTimeout(resolve, 100));

      return newConversationId;
    } catch (err) {
      console.error('Failed to initialize conversation:', err);
      
      // Provide more specific error message based on the error type and mode
      let errorMessage = 'Failed to start conversation. Please try again.';
      let shouldShowToast = true;
      
      if (err && typeof err === 'object' && 'message' in err) {
        const errorMsg = (err as any).message;
        const errorCode = (err as any).code;
        
        // Handle anonymous QA failures more gracefully
        if (state.mode === 'qa' && !userId) {
          console.log('Anonymous QA conversation failed, this might be expected in some cases');
          errorMessage = 'Unable to start anonymous chat. Please try refreshing the page or sign in for full access.';
          
          // For anonymous QA, don't show toast for certain policy errors
          if (errorMsg.includes('policy') || errorCode === '42501') {
            shouldShowToast = false;
            console.log('Anonymous QA blocked by policy, user needs to sign in');
          }
        } else if (errorMsg.includes('policy') || errorCode === '42501') {
          errorMessage = 'Permission error starting conversation. Please make sure you are logged in.';
        } else if (errorMsg.includes('network') || errorMsg.includes('connection')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          errorMessage = `Failed to start conversation: ${errorMsg}`;
        }
      }
      
      // Only show toast for non-anonymous failures or critical errors
      if (shouldShowToast) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      return null;
    }
  }, [state.mode, state.language, toast, createCase, setCaseData, setGlobalConversationId]);

  // Send message to AI
  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content?.trim();
    if (!trimmed) return;

    const activeConversationId = conversationIdRef.current ?? state.conversationId ?? globalConversationId;
    const activeCaseId = caseId;
    
    if (!activeConversationId) {
      toast({
        title: 'Error',  
        description: 'No active conversation. Please start again.',
        variant: 'destructive',
      });
      return;
    }

    if (state.mode === 'intake' && !activeCaseId) {
      console.error('No case_id available for intake message');
      toast({
        title: 'Error',
        description: 'No active case found. Please start a new case.',
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

    // No local write for user message; server-side edge function handles persistence to messages and case_messages.

    // Set loading state only - don't add to local messages (read from DB instead)
    setState(prev => ({
      ...prev,
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

      // No local write for AI message; server-side edge function persists the assistant reply to case_messages.


      // Sync any returned IDs (legacy support)
      if (data?.conversationId && data.conversationId !== conversationIdRef.current) {
        conversationIdRef.current = data.conversationId;
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

      // Update state without adding messages to local state (read from DB only)
      setState(prev => ({
        ...prev,
        isLoading: false,
        extractedData: newExtracted ? { ...(prev.extractedData || {}), ...newExtracted } : prev.extractedData,
        needsPersonalDetails: needsPD || prev.needsPersonalDetails,
      }));
    } catch (err) {
      console.error('Error sending message:', err);

      // Check if this is the first message in a new conversation
      const isFirstMessage = state.messages.length === 1; // Only welcome message exists
      
      let errorTitle = 'Error';
      let errorDescription = 'Failed to send message. Please try again.';
      
      if (isFirstMessage) {
        errorTitle = 'Connection Issue';
        errorDescription = 'There was a connection issue starting your conversation. Please try sending your message again.';
      }

      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: isFirstMessage 
          ? 'I encountered a connection issue. Please try sending your message again.' 
          : 'I encountered an error. Please try again or contact support.',
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false,
      }));

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: 'destructive',
      });
    }
  }, [state.mode, state.language, state.messages.length, state.anonymousSessionId, toast, caseId, globalConversationId]);

  // Switch between Q&A and Intake modes -> start fresh
  const switchMode = useCallback((newMode: 'qa' | 'intake') => {
    conversationIdRef.current = null;
    clearCase(); // Clear global case state
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
  }, [clearCase]);

  // Change language -> start fresh
  const setLanguage = useCallback((language: 'en' | 'ar' | 'de') => {
    conversationIdRef.current = null;
    clearCase(); // Clear global case state
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
  }, [clearCase]);

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
  }, [clearCase]);

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
    caseNumber,
    sendMessage,
    initializeConversation,
    switchMode,
    setLanguage,
    clearConversation,
    setPersonalDetailsCompleted,
    saveCaseStep,
    createCase,
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