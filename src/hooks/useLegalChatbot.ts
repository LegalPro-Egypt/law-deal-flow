import { useState, useCallback } from 'react';
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
}

export interface ChatbotState {
  messages: ChatMessage[];
  isLoading: boolean;
  conversationId: string | null;
  mode: 'qa' | 'intake';
  language: 'en' | 'ar' | 'de';
  extractedData: CaseData | null;
  needsPersonalDetails: boolean;
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
  });

  const [caseId, setCaseId] = useState<string | null>(null);

  // Initialize conversation
  const initializeConversation = useCallback(async (userId?: string, caseId?: string) => {
    try {
      console.log('Initializing conversation...', { userId, caseId, mode: state.mode });
      
      // Create conversation record - for intake mode, allow anonymous users
      const isAnonymous = !userId;
      const effectiveMode = isAnonymous ? 'intake' : state.mode; // Anonymous conversations must use 'intake' to satisfy RLS

      const { data: conversation, error } = await supabase
        .from('conversations')
        .insert({
          user_id: effectiveMode === 'intake' ? (userId || null) : userId,
          case_id: caseId,
          session_id: crypto.randomUUID(),
          mode: effectiveMode,
          language: state.language,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        throw error;
      }

      setState(prev => ({
        ...prev,
        conversationId: conversation.id,
        messages: [{
          id: crypto.randomUUID(),
          role: 'assistant',
          content: getWelcomeMessage(state.mode, state.language),
          timestamp: new Date(),
        }]
      }));

      console.log('Conversation initialized:', conversation.id);
      return conversation.id;
    } catch (error) {
      console.error('Failed to initialize conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
      return null;
    }
  }, [state.mode, state.language, toast]);

  // Send message to AI
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
    }));

    try {
      console.log('Sending message to AI:', { content, conversationId: state.conversationId });

      const { data, error } = await supabase.functions.invoke('legal-chatbot', {
        body: {
          message: content,
          conversation_id: state.conversationId,
          mode: state.mode,
          language: state.language,
          chatHistory: state.messages.slice(-10).map(m => ({
            role: m.role,
            content: m.content
          })),
        },
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('AI response received:', data);

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: data.extractedData,
      };

      setState(prev => {
        // Count user messages to determine if we should automatically progress
        const userMessageCount = [...prev.messages, userMessage].filter(m => m.role === 'user').length;
        const shouldForcePersonalDetails = state.mode === 'intake' && userMessageCount >= 4 && !prev.needsPersonalDetails;
        
        // Check if we have basic extracted data (category or legal_issues) to progress earlier
        const hasBasicData = data.extractedData && (data.extractedData.category || data.extractedData.legal_issues?.length > 0);
        const shouldProgressEarly = state.mode === 'intake' && userMessageCount >= 2 && hasBasicData && !prev.needsPersonalDetails;

        return {
          ...prev,
          messages: [...prev.messages, aiMessage],
          isLoading: false,
          extractedData: data.extractedData || prev.extractedData,
          needsPersonalDetails: data.needsPersonalDetails || shouldForcePersonalDetails || shouldProgressEarly || prev.needsPersonalDetails,
        };
      });

      // Get case ID from response or fetch it from conversation
      if (data.conversationId && !caseId) {
        try {
          const { data: conversation } = await supabase
            .from('conversations')
            .select('case_id')
            .eq('id', data.conversationId)
            .single();
          
          if (conversation?.case_id) {
            setCaseId(conversation.case_id);
          }
        } catch (error) {
          console.error('Error fetching case ID:', error);
        }
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or contact support if the problem persists.',
        timestamp: new Date(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, errorMessage],
        isLoading: false,
      }));

      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    }
  }, [state.conversationId, state.mode, state.language, state.messages, toast]);

  // Switch between Q&A and Intake modes
  const switchMode = useCallback((newMode: 'qa' | 'intake') => {
    setState(prev => ({
      ...prev,
      mode: newMode,
      messages: [{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getWelcomeMessage(newMode, prev.language),
        timestamp: new Date(),
      }],
      extractedData: null,
    }));
  }, []);

  // Change language
  const setLanguage = useCallback((language: 'en' | 'ar' | 'de') => {
    setState(prev => ({
      ...prev,
      language,
      messages: [{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getWelcomeMessage(prev.mode, language),
        timestamp: new Date(),
      }],
    }));
  }, []);

  // Clear conversation
  const clearConversation = useCallback(() => {
    setState(prev => ({
      ...prev,
      messages: [{
        id: crypto.randomUUID(),
        role: 'assistant',
        content: getWelcomeMessage(prev.mode, prev.language),
        timestamp: new Date(),
      }],
      extractedData: null,
      needsPersonalDetails: false,
    }));
  }, []);

  // Mark personal details as completed
  const setPersonalDetailsCompleted = useCallback(() => {
    setState(prev => ({
      ...prev,
      needsPersonalDetails: false,
    }));
  }, []);

  const saveCaseStep = async (step: number, stepData?: any) => {
    if (caseId) {
      try {
        const updateData: any = {
          step,
          draft_data: {
            extractedData: state.extractedData,
            currentStep: step,
            lastUpdated: new Date().toISOString(),
            ...stepData
          }
        };

        await supabase
          .from('cases')
          .update(updateData)
          .eq('id', caseId);
      } catch (error) {
        console.error('Error saving case step:', error);
      }
    }
  };

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
      ar: "مرحباً! أنا ليكسا، مساعدك القانوني الذكي المتخصص في القانون المصري. يمكنني مساعدتك في الإجابة على أسئلتك القانونية بناءً على القضاء المصري. يرجى ملاحظة أنني أقدم معلومات قانونية وليس استشارة قانونية. للأمور القانونية المحددة، يرجى استشارة محامٍ مصري مؤهل. كيف يمكنني مساعدتك اليوم؟",
      de: "Hallo! Ich bin Lexa, Ihr KI-Rechtsassistent, der sich auf ägyptisches Recht spezialisiert hat. Ich kann Ihnen bei der Beantwortung Ihrer Rechtsfragen basierend auf ägyptischer Rechtsprechung helfen. Bitte beachten Sie, dass ich Rechtsinformationen und keine Rechtsberatung anbiete. Für spezifische Rechtsangelegenheiten wenden Sie sich bitte an einen qualifizierten ägyptischen Anwalt. Wie kann ich Ihnen heute helfen?"
    },
    intake: {
      en: "Hello! I'm Lexa, your AI legal assistant. I'm here to help you with your legal case intake. I'll ask you some questions to understand your situation and connect you with the right Egyptian lawyer. This conversation will help us categorize your case and gather the necessary information. Please note that I'm collecting information, not providing legal advice. Let's start - could you please describe your legal issue?",
      ar: "مرحباً! أنا ليكسا، مساعدك القانوني الذكي. أنا هنا لمساعدتك في استقبال قضيتك القانونية. سأطرح عليك بعض الأسئلة لفهم وضعك وربطك بالمحامي المصري المناسب. ستساعدنا هذه المحادثة في تصنيف قضيتك وجمع المعلومات اللازمة. يرجى ملاحظة أنني أجمع المعلومات وليس أقدم استشارة قانونية. لنبدأ - هل يمكنك وصف مشكلتك القانونية؟",
      de: "Hallo! Ich bin Lexa, Ihr KI-Rechtsassistent. Ich bin hier, um Ihnen bei der Aufnahme Ihres Rechtsfalls zu helfen. Ich werde Ihnen einige Fragen stellen, um Ihre Situation zu verstehen und Sie mit dem richtigen ägyptischen Anwalt zu verbinden. Dieses Gespräch hilft uns, Ihren Fall zu kategorisieren und die notwendigen Informationen zu sammeln. Bitte beachten Sie, dass ich Informationen sammle und keine Rechtsberatung anbiete. Lassen Sie uns beginnen - könnten Sie bitte Ihr Rechtsproblem beschreiben?"
    }
  };

  return messages[mode][language];
}