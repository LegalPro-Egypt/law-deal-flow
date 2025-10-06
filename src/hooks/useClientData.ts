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
  consultation_paid: boolean;
  payment_status: string;
  payment_amount?: number;
  payment_date?: string;
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
  display_name?: string;
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
        .select('*, consultation_paid, payment_status, payment_amount, payment_date')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // All cases are now unique due to idempotency constraints
      const casesData = (data || []).map(caseItem => ({
        ...caseItem,
        assigned_lawyer: null as any // Will fetch separately if needed
      }));
      
      console.log('useClientData: Fetched cases:', casesData.length, casesData);
      setCases(casesData);
      
      // Set active case - prefer submitted/in_progress cases, then most recent
      if (casesData.length > 0) {
        const prioritizedCase = casesData.find(c => ['submitted', 'lawyer_assigned', 'in_progress'].includes(c.status));
        const activeCase = prioritizedCase || casesData[0];
        console.log('useClientData: Setting active case:', activeCase.id);
        setActiveCase(activeCase);
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
        .select('id, file_name, display_name, file_size, file_type, file_url, document_category, uploaded_by, created_at, case_id')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const renameDocument = async (documentId: string, newDisplayName: string) => {
    if (!newDisplayName.trim()) {
      toast({
        title: "Invalid Name",
        description: "Document name cannot be empty",
        variant: "destructive"
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .update({ display_name: newDisplayName.trim() })
        .eq('id', documentId);

      if (error) throw error;

      // Optimistic update
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId 
            ? { ...doc, display_name: newDisplayName.trim() }
            : doc
        )
      );

      toast({
        title: "Document Renamed",
        description: "The document name has been updated successfully"
      });

      return true;
    } catch (error) {
      console.error('Error renaming document:', error);
      toast({
        title: "Rename Failed",
        description: "Failed to rename document. Please try again.",
        variant: "destructive"
      });
      return false;
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

  // Realtime subscription for cases list (updates status, assignment, etc.)
  useEffect(() => {
    if (!user) return;
    const casesChannel = supabase
      .channel('client-cases')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(casesChannel);
    };
  }, [user]);

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
    renameDocument,
    refreshData
  };
};