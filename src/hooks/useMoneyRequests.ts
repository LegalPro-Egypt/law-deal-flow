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
        .select('*')
        .or(`lawyer_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Manually fetch case and lawyer information
      const requestsWithDetails = await Promise.all(
        (data || []).map(async (request) => {
          // Fetch case info
          const { data: caseData } = await supabase
            .from('cases')
            .select('case_number, title')
            .eq('id', request.case_id)
            .single();

          // Fetch lawyer info
          const { data: lawyerData } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', request.lawyer_id)
            .single();

          return {
            ...request,
            case: caseData,
            lawyer: lawyerData
          };
        })
      );

      setMoneyRequests(requestsWithDetails as MoneyRequest[]);
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

  // Check if a case is eligible for additional money requests
  const isCaseEligibleForMoneyRequest = (caseData: any) => {
    // Case must have consultation paid and full payment completed
    const isFullyPaid = caseData.consultation_paid && caseData.payment_status === 'paid';
    
    // Case must be in active work status
    const isActive = ['active', 'work_in_progress', 'in_progress'].includes(caseData.status);
    
    return isFullyPaid && isActive;
  };

  const createMoneyRequest = async (
    caseId: string,
    amount: number,
    currency: string,
    description: string
  ) => {
    if (!user) return false;

    try {
      // Get case details to validate eligibility and get client_id
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('user_id, consultation_paid, payment_status, status')
        .eq('id', caseId)
        .single();

      if (caseError) throw caseError;

      // Check if case is eligible for money requests
      if (!isCaseEligibleForMoneyRequest(caseData)) {
        toast({
          title: "Not Eligible",
          description: "This case is not eligible for additional money requests. The client must complete full payment first.",
          variant: "destructive",
        });
        return false;
      }

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
    fetchMoneyRequests,
    isCaseEligibleForMoneyRequest
  };
};