import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Contract {
  id: string;
  proposal_id: string;
  case_id: string;
  lawyer_id: string;
  client_id: string;
  content_en: string | null;
  content_ar: string | null;
  status: string;
  pdf_downloaded: boolean;
  downloaded_at: string | null;
  dhl_tracking_number: string | null;
  courier_company?: string | null;
  expected_delivery_date: string | null;
  shipment_notes: string | null;
  sent_for_signature_at: string | null;
  physically_received_at: string | null;
  received_by: string | null;
  admin_reviewed_by: string | null;
  admin_reviewed_at: string | null;
  admin_notes: string | null;
  change_source: string | null;
  client_change_request: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  client_accepted_at: string | null;
  version: number;
  previous_version_id: string | null;
  change_notes: string | null;
  consultation_notes: string | null;
  metadata: any;
}

export const useContracts = (caseId?: string, userId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: contracts, isLoading } = useQuery({
    queryKey: ['contracts', caseId, userId],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false });

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      if (userId) {
        query = query.or(`client_id.eq.${userId},lawyer_id.eq.${userId}`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!caseId || !!userId,
  });

  const updateContractStatus = useMutation({
    mutationFn: async ({
      contractId,
      status,
      updates = {}
    }: {
      contractId: string;
      status: string;
      updates?: Partial<Contract>;
    }) => {
      const { data, error } = await supabase
        .from('contracts')
        .update({
          status,
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', contractId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Success',
        description: 'Contract status updated successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const createContract = useMutation({
    mutationFn: async (contractData: {
      proposal_id: string;
      case_id: string;
      lawyer_id: string;
      client_id: string;
      content_en?: string | null;
      content_ar?: string | null;
      consultation_notes?: string | null;
      status?: string;
    }) => {
      const { data, error } = await supabase
        .from('contracts')
        .insert([contractData])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Success',
        description: 'Contract created successfully'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const markContractViewed = useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase
        .from('contracts')
        .update({
          status: 'viewed',
          viewed_at: new Date().toISOString()
        })
        .eq('id', contractId)
        .eq('status', 'sent')
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    }
  });

  const markContractDownloaded = useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase
        .from('contracts')
        .update({
          pdf_downloaded: true,
          downloaded_at: new Date().toISOString(),
          status: 'downloaded'
        })
        .eq('id', contractId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    }
  });

  const acceptContract = useMutation({
    mutationFn: async (contractId: string) => {
      const { data, error } = await supabase
        .from('contracts')
        .update({
          status: 'downloaded',
          client_accepted_at: new Date().toISOString(),
          pdf_downloaded: true,
          downloaded_at: new Date().toISOString()
        })
        .eq('id', contractId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast({
        title: 'Contract Accepted',
        description: 'You have successfully accepted the contract and it has been downloaded.'
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  return {
    contracts,
    isLoading,
    updateContractStatus,
    createContract,
    markContractViewed,
    markContractDownloaded,
    acceptContract
  };
};