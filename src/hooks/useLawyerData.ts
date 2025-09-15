import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./use-toast";

interface LawyerCase {
  id: string;
  case_number: string;
  title: string;
  category: string;
  status: string;
  urgency: string;
  client_name: string;
  client_email: string;
  created_at: string;
  updated_at: string;
  total_fee?: number;
  consultation_fee?: number;
  remaining_fee?: number;
}

interface Proposal {
  id?: string;
  case_id: string;
  consultation_fee: number;
  remaining_fee: number;
  timeline: string;
  scope: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
}

interface Payout {
  id: string;
  amount: number;
  case_number: string;
  status: 'released' | 'pending' | 'held';
  type: 'consultation' | 'remaining';
  created_at: string;
}

export const useLawyerData = () => {
  const [assignedCases, setAssignedCases] = useState<LawyerCase[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState({
    activeCases: 0,
    pendingPayouts: 0,
    monthlyEarnings: 0,
    avgResponseTime: '2.1h'
  });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchAssignedCases = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('assigned_lawyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setAssignedCases(data || []);
    } catch (error) {
      console.error('Error fetching assigned cases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch assigned cases",
        variant: "destructive"
      });
    }
  };

  const sendProposal = async (caseId: string, proposal: Omit<Proposal, 'id' | 'case_id' | 'status'>) => {
    if (!user) return;

    try {
      // Update the case with proposal details
      const { error } = await supabase
        .from('cases')
        .update({
          consultation_fee: proposal.consultation_fee,
          remaining_fee: proposal.remaining_fee,
          total_fee: proposal.consultation_fee + proposal.remaining_fee,
          status: 'proposal_sent'
        })
        .eq('id', caseId)
        .eq('assigned_lawyer_id', user.id);

      if (error) throw error;

      // Send notification message to client
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('case_id', caseId)
        .single();

      if (conversations) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversations.id,
            role: 'lawyer',
            content: `I've sent you a proposal for this case:
            
Consultation Fee: $${proposal.consultation_fee}
Remaining Fee: $${proposal.remaining_fee}
Total Fee: $${proposal.consultation_fee + proposal.remaining_fee}
Timeline: ${proposal.timeline}

Scope of Work:
${proposal.scope}

Please review and let me know if you have any questions.`
          });
      }

      await fetchAssignedCases();
      
      toast({
        title: "Proposal sent",
        description: "Your proposal has been sent to the client"
      });
    } catch (error) {
      console.error('Error sending proposal:', error);
      toast({
        title: "Error",
        description: "Failed to send proposal",
        variant: "destructive"
      });
    }
  };

  const sendMessage = async (caseId: string, content: string) => {
    if (!user) return;

    try {
      // Get conversation for this case
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .eq('case_id', caseId)
        .single();

      if (!conversations) {
        throw new Error('No conversation found for this case');
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversations.id,
          role: 'lawyer',
          content,
        });

      if (error) throw error;
      
      toast({
        title: "Message sent",
        description: "Your message has been sent to the client"
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

  const calculateStats = (cases: LawyerCase[]) => {
    const activeCases = cases.filter(c => 
      c.status === 'active' || c.status === 'in_progress' || c.status === 'proposal_sent'
    ).length;

    // Mock calculations for now - would be real calculations in production
    const pendingPayouts = cases.reduce((sum, c) => 
      sum + (c.consultation_fee || 0) + (c.remaining_fee || 0), 0
    ) * 0.9; // 90% after platform fee

    const monthlyEarnings = pendingPayouts * 0.6; // Assume 60% already earned

    setStats({
      activeCases,
      pendingPayouts,
      monthlyEarnings,
      avgResponseTime: '2.1h'
    });
  };

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        setLoading(true);
        await fetchAssignedCases();
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  useEffect(() => {
    if (assignedCases.length > 0) {
      calculateStats(assignedCases);
    }
  }, [assignedCases]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    const casesChannel = supabase
      .channel('lawyer-cases')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cases',
          filter: `assigned_lawyer_id=eq.${user.id}`
        },
        () => {
          fetchAssignedCases();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(casesChannel);
    };
  }, [user]);

  return {
    assignedCases,
    payouts,
    stats,
    loading,
    sendProposal,
    sendMessage,
    refreshData: fetchAssignedCases
  };
};