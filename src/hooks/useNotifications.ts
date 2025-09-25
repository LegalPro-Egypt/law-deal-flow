import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  action_required: boolean;
  created_at: string;
}

export interface Proposal {
  id: string;
  case_id: string;
  lawyer_id: string;
  consultation_fee: number;
  remaining_fee: number;
  total_fee: number;
  platform_fee_percentage?: number;
  payment_processing_fee_percentage?: number;
  client_protection_fee_percentage?: number;
  platform_fee_amount?: number;
  payment_processing_fee_amount?: number;
  client_protection_fee_amount?: number;
  base_total_fee?: number;
  total_additional_fees?: number;
  final_total_fee?: number;
  timeline: string;
  strategy: string;
  generated_content: string;
  status: string;
  created_at: string;
  case?: {
    case_number: string;
    title: string;
  };
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [proposalsWithCases, setProposalsWithCases] = useState<(Proposal & { case: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    }
  };

  const fetchProposals = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('proposals')
        .select(`
          *,
          case:cases(case_number, title)
        `)
        .eq('client_id', user.id)
        .in('status', ['approved', 'sent', 'viewed', 'accepted', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProposals(data || []);
      setProposalsWithCases(data || []);
    } catch (error) {
      console.error('Error fetching proposals:', error);
      toast({
        title: "Error",
        description: "Failed to load proposals",
        variant: "destructive",
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );

      toast({
        title: "Marked as read",
        description: "Notification has been marked as read",
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const handleViewProposal = async (proposalId: string) => {
    try {
      const { error } = await supabase
        .from('proposals')
        .update({ status: 'viewed' })
        .eq('id', proposalId);

      if (error) throw error;

      setProposals(prev => 
        prev.map(proposal => 
          proposal.id === proposalId 
            ? { ...proposal, status: 'viewed' }
            : proposal
        )
      );
    } catch (error) {
      console.error('Error updating proposal status:', error);
      toast({
        title: "Error",
        description: "Failed to update proposal status",
        variant: "destructive",
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchNotifications(), fetchProposals()]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const needsPayment = (proposal: Proposal & { case: any }) => {
    // Check if consultation payment is needed
    if (proposal.status === 'accepted' && proposal.case && !proposal.case.consultation_paid) {
      return true;
    }
    
    // Check if remaining payment is needed after consultation completion
    if (proposal.case?.status === 'consultation_completed' && 
        proposal.case?.grace_period_expires_at &&
        new Date(proposal.case.grace_period_expires_at) > new Date() &&
        proposal.case?.remaining_fee > 0) {
      return true;
    }
    
    return false;
  };

  const calculateRemainingPayment = (proposal: Proposal): number => {
    const remainingFee = proposal.remaining_fee || 0;
    const additionalFees = proposal.total_additional_fees || 0;
    return remainingFee + additionalFees;
  };

  return {
    notifications,
    proposals,
    proposalsWithCases,
    loading,
    unreadCount,
    markAsRead,
    handleViewProposal,
    fetchNotifications,
    fetchProposals,
    needsPayment,
    calculateRemainingPayment
  };
};