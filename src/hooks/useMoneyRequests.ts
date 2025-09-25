import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface MoneyRequest {
  id: string;
  case_id: string;
  lawyer_id: string;
  client_id: string;
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'paid' | 'cancelled';
  payment_intent_id?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  case?: {
    case_number: string;
    title: string;
  };
  lawyer?: {
    first_name?: string;
    last_name?: string;
    email: string;
  };
}

export const useMoneyRequests = () => {
  const [moneyRequests, setMoneyRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchMoneyRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('money_requests')
        .select(`
          *,
          case:cases(case_number, title),
          lawyer:profiles(first_name, last_name, email)
        `)
        .or(`lawyer_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMoneyRequests((data as any[]) || []);
    } catch (error) {
      console.error('Error fetching money requests:', error);
      toast({
        title: "Error",
        description: "Failed to load money requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createMoneyRequest = async (
    caseId: string,
    amount: number,
    currency: string,
    description: string
  ) => {
    if (!user) return false;

    try {
      // Get case details to get client_id
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('user_id')
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;

      const { error } = await supabase
        .from('money_requests')
        .insert({
          case_id: caseId,
          lawyer_id: user.id,
          client_id: caseData.user_id,
          amount,
          currency,
          description,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Money request sent to client",
      });

      await fetchMoneyRequests();
      return true;
    } catch (error) {
      console.error('Error creating money request:', error);
      toast({
        title: "Error",
        description: "Failed to create money request",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateMoneyRequestStatus = async (
    requestId: string,
    status: 'paid' | 'cancelled',
    paymentIntentId?: string
  ) => {
    try {
      const updates: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
        if (paymentIntentId) {
          updates.payment_intent_id = paymentIntentId;
        }
      }

      const { error } = await supabase
        .from('money_requests')
        .update(updates)
        .eq('id', requestId);

      if (error) throw error;

      await fetchMoneyRequests();
      return true;
    } catch (error) {
      console.error('Error updating money request status:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchMoneyRequests();
    }
  }, [user]);

  // Real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('money-requests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'money_requests',
          filter: `or(lawyer_id.eq.${user.id},client_id.eq.${user.id})`
        },
        (payload) => {
          console.log('Money request changed:', payload);
          fetchMoneyRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    moneyRequests,
    loading,
    createMoneyRequest,
    updateMoneyRequestStatus,
    fetchMoneyRequests
  };
};