import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface ReportFilters {
  dateRange: DateRange;
  currency: 'USD' | 'EUR' | 'EGP';
  lawyerId?: string;
  caseType?: string;
  status?: string;
}

export interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_name: string;
  lawyer_name: string;
  case_title: string;
  created_at: string;
}

export interface RevenueData {
  case_id: string;
  case_title: string;
  total_revenue: number;
  currency: string;
  lawyer_name: string;
  created_at: string;
}

export interface CaseStatusData {
  status: string;
  count: number;
  percentage: number;
}

export interface CaseTypeData {
  category: string;
  count: number;
  percentage: number;
}

export interface ProposalData {
  lawyer_id: string;
  lawyer_name: string;
  sent_count: number;
  accepted_count: number;
  acceptance_rate: number;
}

export interface ConsultationData {
  date: string;
  booked: number;
  completed: number;
  missed: number;
  completion_rate: number;
}

export const useReportsData = (filters: ReportFilters) => {
  const [paymentsData, setPaymentsData] = useState<PaymentData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [caseStatusData, setCaseStatusData] = useState<CaseStatusData[]>([]);
  const [caseTypeData, setCaseTypeData] = useState<CaseTypeData[]>([]);
  const [proposalData, setProposalData] = useState<ProposalData[]>([]);
  const [consultationData, setConsultationData] = useState<ConsultationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatCurrency = (amount: number, currency: string = filters.currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const fetchPaymentsData = async () => {
    try {
      let query = supabase
        .from('money_requests')
        .select('*')
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());

      if (filters.lawyerId) {
        query = query.eq('lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedData: PaymentData[] = (data || []).map(item => ({
        id: item.id,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        client_name: 'Client',
        lawyer_name: 'Lawyer',
        case_title: 'Case',
        created_at: item.created_at,
      }));

      setPaymentsData(formattedData);
    } catch (err) {
      console.error('Error fetching payments data:', err);
      setError('Failed to fetch payments data');
    }
  };

  const fetchRevenueData = async () => {
    try {
      let query = supabase
        .from('money_requests')
        .select('case_id, amount, currency, status, created_at')
        .eq('status', 'paid')
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());

      if (filters.lawyerId) {
        query = query.eq('lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const revenueByCase = new Map<string, RevenueData>();
      
      (data || []).forEach(item => {
        const caseId = item.case_id;
        if (revenueByCase.has(caseId)) {
          const existing = revenueByCase.get(caseId)!;
          existing.total_revenue += item.amount;
        } else {
          revenueByCase.set(caseId, {
            case_id: caseId,
            case_title: 'Case Title',
            total_revenue: item.amount,
            currency: item.currency,
            lawyer_name: 'Lawyer',
            created_at: item.created_at,
          });
        }
      });

      setRevenueData(Array.from(revenueByCase.values()).sort((a, b) => b.total_revenue - a.total_revenue));
    } catch (err) {
      console.error('Error fetching revenue data:', err);
      setError('Failed to fetch revenue data');
    }
  };

  const fetchCaseStatusData = async () => {
    try {
      let query = supabase
        .from('cases')
        .select('status')
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());

      if (filters.lawyerId) {
        query = query.eq('assigned_lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const statusCounts = new Map<string, number>();
      const total = data?.length || 0;

      (data || []).forEach(item => {
        const status = item.status || 'unknown';
        statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
      });

      const statusData: CaseStatusData[] = Array.from(statusCounts.entries()).map(([status, count]) => ({
        status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

      setCaseStatusData(statusData);
    } catch (err) {
      console.error('Error fetching case status data:', err);
      setError('Failed to fetch case status data');
    }
  };

  const fetchCaseTypeData = async () => {
    try {
      let query = supabase
        .from('cases')
        .select('category')
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());

      if (filters.lawyerId) {
        query = query.eq('assigned_lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const typeCounts = new Map<string, number>();
      const total = data?.length || 0;

      (data || []).forEach(item => {
        const category = item.category || 'other';
        typeCounts.set(category, (typeCounts.get(category) || 0) + 1);
      });

      const typeData: CaseTypeData[] = Array.from(typeCounts.entries()).map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

      setCaseTypeData(typeData.sort((a, b) => b.count - a.count));
    } catch (err) {
      console.error('Error fetching case type data:', err);
      setError('Failed to fetch case type data');
    }
  };

  const fetchProposalData = async () => {
    try {
      let query = supabase
        .from('additional_fee_requests')
        .select('lawyer_id, status, created_at')
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());

      if (filters.lawyerId) {
        query = query.eq('lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const proposalsByLawyer = new Map<string, { sent: number; accepted: number }>();
      
      (data || []).forEach(item => {
        const lawyerId = item.lawyer_id;
        if (!proposalsByLawyer.has(lawyerId)) {
          proposalsByLawyer.set(lawyerId, { sent: 0, accepted: 0 });
        }
        
        const lawyer = proposalsByLawyer.get(lawyerId)!;
        lawyer.sent++;
        if (item.status === 'accepted') {
          lawyer.accepted++;
        }
      });

      const proposalsData: ProposalData[] = Array.from(proposalsByLawyer.entries()).map(([lawyerId, data]) => ({
        lawyer_id: lawyerId,
        lawyer_name: 'Lawyer Name',
        sent_count: data.sent,
        accepted_count: data.accepted,
        acceptance_rate: data.sent > 0 ? Math.round((data.accepted / data.sent) * 100) : 0,
      }));

      setProposalData(proposalsData);
    } catch (err) {
      console.error('Error fetching proposal data:', err);
      setError('Failed to fetch proposal data');
    }
  };

  const fetchConsultationData = async () => {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .gte('created_at', filters.dateRange.from.toISOString())
        .lte('created_at', filters.dateRange.to.toISOString());

      if (filters.lawyerId) {
        query = query.eq('lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const consultationsByDate = new Map<string, { booked: number; completed: number; missed: number }>();
      
      (data || []).forEach(item => {
        const date = new Date(item.created_at).toDateString();
        if (!consultationsByDate.has(date)) {
          consultationsByDate.set(date, { booked: 0, completed: 0, missed: 0 });
        }
        
        const day = consultationsByDate.get(date)!;
        day.booked++;
        
        if (item.status === 'completed') {
          day.completed++;
        } else if (item.status === 'cancelled') {
          day.missed++;
        }
      });

      const consultationsData: ConsultationData[] = Array.from(consultationsByDate.entries()).map(([date, data]) => ({
        date,
        booked: data.booked,
        completed: data.completed,
        missed: data.missed,
        completion_rate: data.booked > 0 ? Math.round((data.completed / data.booked) * 100) : 0,
      }));

      setConsultationData(consultationsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (err) {
      console.error('Error fetching consultation data:', err);
      setError('Failed to fetch consultation data');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchPaymentsData(),
        fetchRevenueData(),
        fetchCaseStatusData(),
        fetchCaseTypeData(),
        fetchProposalData(),
        fetchConsultationData(),
      ]);
    } catch (err) {
      setError('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [filters]);

  return {
    paymentsData,
    revenueData,
    caseStatusData,
    caseTypeData,
    proposalData,
    consultationData,
    loading,
    error,
    formatCurrency,
    refetch: fetchAllData,
  };
};