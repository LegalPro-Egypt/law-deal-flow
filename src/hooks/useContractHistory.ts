import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ContractHistoryVersion {
  id: string;
  contract_id: string;
  version: number;
  content_en: string | null;
  content_ar: string | null;
  status: string;
  admin_notes: string | null;
  change_notes: string | null;
  change_source: string | null;
  client_change_request: string | null;
  created_at: string;
  created_by: string | null;
  metadata: any;
}

export const useContractHistory = (contractId?: string) => {
  const { data: history, isLoading } = useQuery({
    queryKey: ['contract-history', contractId],
    queryFn: async () => {
      if (!contractId) return [];
      
      const { data, error } = await supabase
        .from('contract_history')
        .select('*')
        .eq('contract_id', contractId)
        .order('version', { ascending: false });

      if (error) throw error;
      return data as ContractHistoryVersion[];
    },
    enabled: !!contractId,
  });

  return {
    history: history || [],
    isLoading,
  };
};
