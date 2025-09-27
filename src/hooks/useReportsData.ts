import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  client_name: string;
  lawyer_name: string;
  case_title: string;
}

export interface RevenueData {
  case_id: string;
  case_title: string;
  case_number: string;
  total_revenue: number;
  created_at: string;
  status: string;
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

export interface ReportsFilters {
  dateRange: 'last7' | 'last30' | 'last90' | 'ytd' | 'custom';
  startDate?: string;
  endDate?: string;
  currency: 'USD' | 'EUR' | 'EGP';
  lawyerId?: string;
  caseType?: string;
  status?: string;
}

export const useReportsData = (filters: ReportsFilters) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [paymentsData, setPaymentsData] = useState<PaymentData[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [caseStatusData, setCaseStatusData] = useState<CaseStatusData[]>([]);
  const [caseTypeData, setCaseTypeData] = useState<CaseTypeData[]>([]);
  const [proposalData, setProposalData] = useState<ProposalData[]>([]);
  const [consultationData, setConsultationData] = useState<ConsultationData[]>([]);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;

    switch (filters.dateRange) {
      case 'last7':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'last30':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'last90':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'custom':
        startDate = filters.startDate ? new Date(filters.startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const endDate = filters.dateRange === 'custom' && filters.endDate 
      ? new Date(filters.endDate) 
      : now;

    return { startDate: startDate.toISOString(), endDate: endDate.toISOString() };
  };

  const fetchPaymentsData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      let query = supabase
        .from('money_requests')
        .select(`
          id,
          amount,
          currency,
          status,
          created_at,
          case_id,
          lawyer_id,
          client_id
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (filters.lawyerId) {
        query = query.eq('lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Get client and lawyer names
      const enrichedData = await Promise.all(
        (data || []).map(async (payment) => {
          const [clientResult, lawyerResult] = await Promise.all([
            supabase.from('profiles').select('first_name, last_name').eq('user_id', payment.client_id).single(),
            supabase.from('profiles').select('first_name, last_name').eq('user_id', payment.lawyer_id).single()
          ]);

          return {
            id: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            created_at: payment.created_at,
            client_name: clientResult.data 
              ? `${clientResult.data.first_name || ''} ${clientResult.data.last_name || ''}`.trim() || 'Unknown'
              : 'Unknown',
            lawyer_name: lawyerResult.data 
              ? `${lawyerResult.data.first_name || ''} ${lawyerResult.data.last_name || ''}`.trim() || 'Unknown'
              : 'Unknown',
            case_title: 'Unknown Case' // Will be fetched separately
          };
        })
      );

      setPaymentsData(enrichedData);
    } catch (error) {
      console.error('Error fetching payments data:', error);
    }
  };

  const fetchRevenueData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      let query = supabase
        .from('money_requests')
        .select(`
          case_id,
          amount,
          status,
          created_at
        `)
        .eq('status', 'paid')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (filters.lawyerId) {
        query = query.eq('lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Aggregate by case
      const caseRevenue = (data || []).reduce((acc, payment) => {
        const caseId = payment.case_id;
        if (!acc[caseId]) {
          acc[caseId] = {
            case_id: caseId,
            case_title: 'Unknown',
            case_number: 'Unknown', 
            status: 'unknown',
            total_revenue: 0,
            created_at: payment.created_at
          };
        }
        acc[caseId].total_revenue += payment.amount;
        return acc;
      }, {} as Record<string, RevenueData>);

      setRevenueData(Object.values(caseRevenue));
    } catch (error) {
      console.error('Error fetching revenue data:', error);
    }
  };

  const fetchCaseStatusData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      let query = supabase
        .from('cases')
        .select('status')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (filters.lawyerId) {
        query = query.eq('assigned_lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const statusCounts = (data || []).reduce((acc, case_item) => {
        acc[case_item.status] = (acc[case_item.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
      const statusData = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }));

      setCaseStatusData(statusData);
    } catch (error) {
      console.error('Error fetching case status data:', error);
    }
  };

  const fetchCaseTypeData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      let query = supabase
        .from('cases')
        .select('category')
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (filters.lawyerId) {
        query = query.eq('assigned_lawyer_id', filters.lawyerId);
      }

      if (filters.caseType) {
        query = query.eq('category', filters.caseType);
      }

      const { data, error } = await query;
      if (error) throw error;

      const typeCounts = (data || []).reduce((acc, case_item) => {
        const category = case_item.category || 'Other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0);
      const typeData = Object.entries(typeCounts).map(([category, count]) => ({
        category,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }));

      setCaseTypeData(typeData);
    } catch (error) {
      console.error('Error fetching case type data:', error);
    }
  };

  const fetchProposalData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      let query = supabase
        .from('proposals')
        .select(`
          lawyer_id,
          status,
          created_at
        `)
        .gte('created_at', startDate)
        .lte('created_at', endDate);

      if (filters.lawyerId) {
        query = query.eq('lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by lawyer
      const lawyerProposals = (data || []).reduce((acc, proposal) => {
        const lawyerId = proposal.lawyer_id;
        if (!acc[lawyerId]) {
          acc[lawyerId] = { sent: 0, accepted: 0 };
        }
        acc[lawyerId].sent += 1;
        if (proposal.status === 'accepted') {
          acc[lawyerId].accepted += 1;
        }
        return acc;
      }, {} as Record<string, { sent: number; accepted: number }>);

      // Get lawyer names and calculate rates
      const proposalData = await Promise.all(
        Object.entries(lawyerProposals).map(async ([lawyerId, counts]) => {
          const { data: lawyer } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('user_id', lawyerId)
            .single();

          return {
            lawyer_id: lawyerId,
            lawyer_name: lawyer 
              ? `${lawyer.first_name || ''} ${lawyer.last_name || ''}`.trim() || 'Unknown'
              : 'Unknown',
            sent_count: counts.sent,
            accepted_count: counts.accepted,
            acceptance_rate: counts.sent > 0 ? (counts.accepted / counts.sent) * 100 : 0
          };
        })
      );

      setProposalData(proposalData);
    } catch (error) {
      console.error('Error fetching proposal data:', error);
    }
  };

  const fetchConsultationData = async () => {
    try {
      const { startDate, endDate } = getDateRange();
      
      let query = supabase
        .from('appointments')
        .select('scheduled_date, status')
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate);

      if (filters.lawyerId) {
        query = query.eq('lawyer_id', filters.lawyerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Group by date and count statuses
      const dailyConsultations = (data || []).reduce((acc, appointment) => {
        const date = new Date(appointment.scheduled_date).toISOString().split('T')[0];
        if (!acc[date]) {
          acc[date] = { booked: 0, completed: 0, missed: 0 };
        }
        acc[date].booked += 1;
        if (appointment.status === 'completed') {
          acc[date].completed += 1;
        } else if (appointment.status === 'cancelled' || appointment.status === 'missed') {
          acc[date].missed += 1;
        }
        return acc;
      }, {} as Record<string, { booked: number; completed: number; missed: number }>);

      const consultationData = Object.entries(dailyConsultations).map(([date, counts]) => ({
        date,
        booked: counts.booked,
        completed: counts.completed,
        missed: counts.missed,
        completion_rate: counts.booked > 0 ? (counts.completed / counts.booked) * 100 : 0
      }));

      setConsultationData(consultationData.sort((a, b) => a.date.localeCompare(b.date)));
    } catch (error) {
      console.error('Error fetching consultation data:', error);
    }
  };

  useEffect(() => {
    if (!user) return;

    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchPaymentsData(),
        fetchRevenueData(),
        fetchCaseStatusData(),
        fetchCaseTypeData(),
        fetchProposalData(),
        fetchConsultationData()
      ]);
      setLoading(false);
    };

    fetchAllData();
  }, [user, filters]);

  return {
    loading,
    paymentsData,
    revenueData,
    caseStatusData,
    caseTypeData,
    proposalData,
    consultationData,
    refetch: () => {
      const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([
          fetchPaymentsData(),
          fetchRevenueData(),
          fetchCaseStatusData(),
          fetchCaseTypeData(),
          fetchProposalData(),
          fetchConsultationData()
        ]);
        setLoading(false);
      };
      fetchAllData();
    }
  };
};