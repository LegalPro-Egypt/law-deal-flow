import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface AdditionalFeeRequest {
  id: string;
  case_id: string;
  lawyer_id: string;
  client_id: string;
  original_proposal_id: string;
  request_title: string;
  request_description: string;
  additional_fee_amount: number;
  timeline_extension_days: number;
  justification: string;
  status: 'pending' | 'accepted' | 'rejected';
  client_response?: string;
  client_responded_at?: string;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  payment_due_date?: string;
  metadata?: any;
  cases?: {
    case_number: string;
    title: string;
    client_name?: string;
  };
}

export interface CreateFeeRequestData {
  case_id: string;
  request_title: string;
  request_description: string;
  additional_fee_amount: number;
  timeline_extension_days?: number;
  justification: string;
}

export const useAdditionalFeeRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<AdditionalFeeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const fetchRequests = async () => {
    if (!user) return;

    try {
      // First fetch the fee requests
      const { data: requestsData, error } = await supabase
        .from('additional_fee_requests')
        .select('*')
        .eq('lawyer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching additional fee requests:', error);
        toast({
          title: "Error",
          description: "Failed to fetch additional fee requests",
          variant: "destructive",
        });
        return;
      }

      // Then fetch case details for each request
      const requestsWithCases = await Promise.all(
        (requestsData || []).map(async (request) => {
          const { data: caseData, error: caseError } = await supabase
            .from('cases')
            .select('case_number, title, client_name')
            .eq('id', request.case_id)
            .single();

          return {
            ...request,
            status: request.status as 'pending' | 'accepted' | 'rejected',
            cases: caseError ? { case_number: '', title: '', client_name: '' } : caseData
          };
        })
      );

      setRequests(requestsWithCases);
    } catch (error) {
      console.error('Error fetching additional fee requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async (requestData: CreateFeeRequestData) => {
    if (!user) return false;

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-additional-fee-request', {
        body: requestData,
      });

      if (error) {
        console.error('Error creating additional fee request:', error);
        toast({
          title: "Error",
          description: "Failed to create additional fee request",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Success",
        description: "Additional fee request sent to client",
      });

      await fetchRequests(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error creating additional fee request:', error);
      toast({
        title: "Error",
        description: "Failed to create additional fee request",
        variant: "destructive",
      });
      return false;
    } finally {
      setCreating(false);
    }
  };

  const getRequestStats = () => {
    const pending = requests.filter(r => r.status === 'pending').length;
    const accepted = requests.filter(r => r.status === 'accepted').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const totalRequested = requests.reduce((sum, r) => sum + r.additional_fee_amount, 0);
    const totalAccepted = requests
      .filter(r => r.status === 'accepted')
      .reduce((sum, r) => sum + r.additional_fee_amount, 0);

    return {
      pending,
      accepted,
      rejected,
      total: requests.length,
      totalRequested,
      totalAccepted,
    };
  };

  useEffect(() => {
    if (user) {
      fetchRequests();

      // Set up real-time subscription
      const channel = supabase
        .channel('additional-fee-requests-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'additional_fee_requests',
            filter: `lawyer_id=eq.${user.id}`,
          },
          () => {
            fetchRequests();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  return {
    requests,
    loading,
    creating,
    createRequest,
    refreshRequests: fetchRequests,
    stats: getRequestStats(),
  };
};