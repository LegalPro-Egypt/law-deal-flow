import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  totalCases: number;
  activeCases: number;
  pendingIntakes: number;
  totalLawyers: number;
  pendingReviews: number;
}

interface IntakeConversation {
  id: string;
  session_id: string;
  created_at: string;
  language: string;
  status: string;
  messages?: Array<{
    role: string;
    content: string;
    created_at: string;
  }>;
  case_data?: any;
}

interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  client_name: string;
  client_email: string;
  created_at: string;
  language: string;
  ai_summary?: string;
  extracted_entities?: any;
}

export const useAdminData = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalCases: 0,
    activeCases: 0,
    pendingIntakes: 0,
    totalLawyers: 0,
    pendingReviews: 0
  });
  const [pendingIntakes, setPendingIntakes] = useState<IntakeConversation[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAdminStats = async () => {
    try {
      // Get total cases
      const { count: totalCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true });

      // Get active cases (non-draft status)
      const { count: activeCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'draft');

      // Get pending intake conversations (mode=intake, status=active, with user_id - actionable ones only)
      const { count: pendingIntakes } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('mode', 'intake')
        .eq('status', 'active')
        .not('user_id', 'is', null)
        .is('case_id', null);

      // Get pending review cases (submitted status)
      const { count: pendingReviews } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');

      // Get total lawyers from profiles
      const { count: totalLawyers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'lawyer')
        .eq('is_active', true);

      setStats({
        totalCases: totalCases || 0,
        activeCases: activeCases || 0,
        pendingIntakes: pendingIntakes || 0,
        totalLawyers: totalLawyers || 0,
        pendingReviews: pendingReviews || 0
      });
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch statistics",
        variant: "destructive",
      });
    }
  };

  const fetchPendingIntakes = async () => {
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          session_id,
          created_at,
          language,
          status,
          metadata,
          user_id,
          case_id,
          messages (
            role,
            content,
            created_at
          )
        `)
        .eq('mode', 'intake')
        .eq('status', 'active')
        .not('user_id', 'is', null)
        .is('case_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingIntakes(conversations || []);
    } catch (error: any) {
      console.error('Error fetching pending intakes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending intakes",
        variant: "destructive",
      });
    }
  };

  const fetchCases = async () => {
    try {
      const { data: casesData, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCases(casesData || []);
    } catch (error: any) {
      console.error('Error fetching cases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cases",
        variant: "destructive",
      });
    }
  };

  const createCaseFromIntake = async (conversationId: string) => {
    try {
      // Get conversation with messages and metadata
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          messages (*)
        `)
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      // Extract case data from conversation metadata or messages
      const metadata = (conversation.metadata as any) || {};
      const extractedData = metadata.extractedData || {};
      const messages = conversation.messages || [];
      
      // Generate case summary from conversation
      const conversationText = messages
        .filter(msg => msg.role === 'user')
        .map(msg => msg.content)
        .join(' ');

      // Create case with extracted data
      const { data: newCase, error: caseError } = await supabase
        .from('cases')
        .insert({
          user_id: conversation.user_id, // Use actual user_id from conversation
          title: extractedData.title || extractedData.category || 'Legal Case from AI Intake',
          description: extractedData.description || conversationText.slice(0, 500) || 'Case created from AI chatbot intake',
          category: extractedData.category || 'General',
          subcategory: extractedData.subcategory,
          urgency: extractedData.urgency || 'medium',
          client_name: extractedData.client_name || 'Client Name',
          client_email: extractedData.client_email || 'client@example.com',
          client_phone: extractedData.client_phone,
          language: conversation.language,
          status: 'submitted',
          ai_summary: extractedData.summary || conversationText.slice(0, 1000),
          extracted_entities: extractedData.entities || {},
          jurisdiction: 'egypt'
        })
        .select()
        .single();

      if (caseError) throw caseError;

      // Update conversation status to mark as completed and link to case
      await supabase
        .from('conversations')
        .update({ 
          status: 'completed',
          case_id: newCase.id 
        })
        .eq('id', conversationId);

      // Refresh data
      await Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()]);

      toast({
        title: "Success",
        description: "Case created from intake conversation successfully",
      });

      return newCase;
    } catch (error: any) {
      console.error('Error creating case from intake:', error);
      toast({
        title: "Error",
        description: `Failed to create case from intake: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const cleanupAnonymousIntakes = async () => {
    try {
      // Mark all anonymous intakes (no user_id) as completed to clear them from pending list
      const { error } = await supabase
        .from('conversations')
        .update({ status: 'completed' })
        .eq('mode', 'intake')
        .eq('status', 'active')
        .is('user_id', null);

      if (error) throw error;

      // Refresh data to reflect changes
      await Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()]);

      toast({
        title: "Success",
        description: "Anonymous test intakes have been cleaned up",
      });
    } catch (error: any) {
      console.error('Error cleaning up anonymous intakes:', error);
      toast({
        title: "Error",
        description: `Failed to cleanup intakes: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAdminStats(),
        fetchPendingIntakes(),
        fetchCases()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    stats,
    pendingIntakes,
    cases,
    loading,
    createCaseFromIntake,
    cleanupAnonymousIntakes,
    refreshData: () => Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()])
  };
};