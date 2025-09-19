import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

interface ClientCase {
  id: string;
  case_number: string;
  title: string;
  category: string;
  status: string;
  urgency: string;
  assigned_lawyer_id?: string;
  created_at: string;
  updated_at: string;
  total_fee?: number;
  consultation_fee?: number;
  remaining_fee?: number;
  client_name: string;
  client_email: string;
  client_phone?: string;
  ai_summary?: string;
  draft_data?: any;
  language?: string;
  assigned_lawyer?: {
    first_name: string;
    last_name: string;
    specializations: string[];
    email: string;
  } | null;
}

interface ClientMessage {
  id: string;
  content: string;
  role: string;
  created_at: string;
  conversation_id: string;
  sender?: 'user' | 'lawyer' | 'client';
  name?: string;
  time?: string;
}

interface ClientDocument {
  id: string;
  file_name: string;
  file_size: number;
  file_type: string;
  file_url: string;
  document_category?: string;
  uploaded_by?: string;
  created_at: string;
  case_id: string;
}

export const useClientData = () => {
  const [cases, setCases] = useState<ClientCase[]>([]);
  const [activeCase, setActiveCase] = useState<ClientCase | null>(null);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingCases, setFetchingCases] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchCases = async () => {
    if (!user) {
      console.log('useClientData: No user available for fetching cases');
      return;
    }
    
    console.log('useClientData: Fetching cases for user:', user.id);
    setFetchingCases(true);
    
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const casesData = (data || []).map(caseItem => ({
        ...caseItem,
        assigned_lawyer: null as any // Will fetch separately if needed
      }));
      
      console.log('useClientData: Fetched cases:', casesData.length, casesData);
      setCases(casesData);
      
      if (casesData.length > 0) {
        // Prioritize cases with more complete data
        const prioritizedCase = casesData.find(caseItem => {
          // Check if case has personal details
          const hasPersonalDetails = !!(
            (caseItem.client_name && caseItem.client_email) ||
            (caseItem.draft_data && (caseItem.draft_data as any)?.personalData?.fullName)
          );
          // Check if case has meaningful content
          const hasContent = !!(caseItem.ai_summary || (caseItem.draft_data && Object.keys(caseItem.draft_data).length > 0));
          
          return hasPersonalDetails && hasContent;
        }) || casesData[0]; // Fallback to newest case if none have complete data
        
        console.log('useClientData: Setting prioritized active case:', prioritizedCase.id);
        setActiveCase(prioritizedCase);
      } else {
        console.log('useClientData: No cases found');
        setActiveCase(null);
      }
    } catch (error) {
      console.error('useClientData: Error fetching cases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cases. Click refresh to try again.",
        variant: "destructive"
      });
    } finally {
      setFetchingCases(false);
    }
  };

  const fetchMessages = async (caseId?: string) => {
    if (!user || !caseId) return;
    
    try {
      // First get the conversation for this case
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('case_id', caseId)
        .eq('user_id', user.id)
        .single();

      if (convError || !conversations) return;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversations.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const messagesData = (data || []).map(msg => ({
        ...msg,
        sender: msg.role === 'user' ? 'client' : msg.role as 'user' | 'lawyer' | 'client',
        name: msg.role === 'user' ? 'You' : 'Your Lawyer',
        time: new Date(msg.created_at).toLocaleString()
      }));
      
      setMessages(messagesData);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchDocuments = async (caseId?: string) => {
    if (!caseId) return;
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, file_name, file_size, file_type, file_url, document_category, uploaded_by, created_at, case_id')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const sendMessage = async (content: string, conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          role: 'user',
          content,
        });

      if (error) throw error;
      
      // Refresh messages
      if (activeCase) {
        await fetchMessages(activeCase.id);
      }
      
      toast({
        title: "Message sent",
        description: "Your message has been sent to your lawyer"
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      });
    }
  };

  const continueDraftCase = async (caseId: string) => {
    try {
      const { data: draftCase } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', user?.id)
        .eq('status', 'draft')
        .single();

      if (draftCase) {
        // Navigate to intake page with case data
        // This will be handled by the parent component
        return draftCase;
      }
    } catch (error) {
      console.error('Error loading draft case:', error);
    }
  };

  // Function to consolidate personal details from draft_data to main case columns
  const consolidatePersonalDetails = async (caseId: string) => {
    if (!user) return false;
    
    try {
      const { data: caseData } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .eq('user_id', user.id)
        .single();

      if (!caseData || !caseData.draft_data) return false;

      const draftPersonalData = (caseData.draft_data as any)?.personalData;
      if (!draftPersonalData) return false;

      // Check if main columns are missing but draft_data has the info
      const needsConsolidation = (
        !caseData.client_name && draftPersonalData.fullName
      ) || (
        !caseData.client_email && draftPersonalData.email
      ) || (
        !caseData.client_phone && draftPersonalData.phone
      );

      if (needsConsolidation) {
        const updateData: any = {};
        
        if (!caseData.client_name && draftPersonalData.fullName) {
          updateData.client_name = draftPersonalData.fullName;
        }
        if (!caseData.client_email && draftPersonalData.email) {
          updateData.client_email = draftPersonalData.email;
        }
        if (!caseData.client_phone && draftPersonalData.phone) {
          updateData.client_phone = draftPersonalData.phone;
        }
        if (!caseData.language && draftPersonalData.preferredLanguage) {
          updateData.language = draftPersonalData.preferredLanguage;
        }

        const { error } = await supabase
          .from('cases')
          .update(updateData)
          .eq('id', caseId)
          .eq('user_id', user.id);

        if (error) throw error;

        console.log('Personal details consolidated successfully');
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error consolidating personal details:', error);
      return false;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        console.log('useClientData: User authenticated, loading data...');
        setLoading(true);
        await fetchCases();
        setLoading(false);
      } else {
        console.log('useClientData: No user, resetting state');
        setCases([]);
        setActiveCase(null);
        setMessages([]);
        setDocuments([]);
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  useEffect(() => {
    if (activeCase) {
      fetchMessages(activeCase.id);
      fetchDocuments(activeCase.id);
      
      // Try to consolidate personal details if they're missing from main columns
      // but exist in draft_data
      consolidatePersonalDetails(activeCase.id);
    }
  }, [activeCase]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user || !activeCase) return;

    const messagesChannel = supabase
      .channel('client-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        () => {
          fetchMessages(activeCase.id);
        }
      )
      .subscribe();

    const documentsChannel = supabase
      .channel('client-documents')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: `case_id=eq.${activeCase.id}`
        },
        () => {
          fetchDocuments(activeCase.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(documentsChannel);
    };
  }, [user, activeCase]);

  const refreshData = async () => {
    console.log('useClientData: Manual refresh triggered');
    if (user) {
      setLoading(true);
      await fetchCases();
      setLoading(false);
    }
  };

  return {
    cases,
    activeCase,
    messages,
    documents,
    loading,
    fetchingCases,
    setActiveCase,
    sendMessage,
    refreshData,
    continueDraftCase,
    consolidatePersonalDetails
  };
};