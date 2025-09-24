import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface CaseWorkSession {
  id: string;
  case_id: string;
  lawyer_id: string;
  client_id: string;
  work_started_at: string;
  estimated_completion_date: string | null;
  estimated_timeline_days: number | null;
  actual_completion_date: string | null;
  lawyer_completed_at: string | null;
  client_confirmed_at: string | null;
  status: string;
  timeline_accuracy_score: number | null;
  created_at: string;
  updated_at: string;
}

export const useCaseWorkData = () => {
  const [caseWorkSessions, setCaseWorkSessions] = useState<CaseWorkSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchCaseWorkSessions();
      setupRealTimeSubscription();
    }
  }, [user]);

  const fetchCaseWorkSessions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('case_work_sessions')
        .select('*')
        .or(`lawyer_id.eq.${user.id},client_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCaseWorkSessions(data || []);
    } catch (error) {
      console.error('Error fetching case work sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscription = () => {
    if (!user) return;

    const channel = supabase
      .channel('case_work_sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_work_sessions',
          filter: `lawyer_id=eq.${user.id}`
        },
        () => {
          fetchCaseWorkSessions();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_work_sessions',
          filter: `client_id=eq.${user.id}`
        },
        () => {
          fetchCaseWorkSessions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markCaseComplete = async (caseId: string, completionType: 'lawyer_complete' | 'client_confirm') => {
    try {
      const { data, error } = await supabase.functions.invoke('complete-case-work', {
        body: { caseId, completionType }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: data.message
      });

      // Refresh data
      await fetchCaseWorkSessions();
      return data;
    } catch (error: any) {
      console.error('Error marking case complete:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark case as complete',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const getCaseWorkSession = (caseId: string): CaseWorkSession | null => {
    return caseWorkSessions.find(session => session.case_id === caseId) || null;
  };

  const getTimelineAccuracy = (session: CaseWorkSession): number | null => {
    if (!session.estimated_timeline_days || !session.actual_completion_date || !session.work_started_at) {
      return null;
    }

    const startDate = new Date(session.work_started_at);
    const completionDate = new Date(session.actual_completion_date);
    const actualDays = Math.ceil((completionDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const estimatedDays = session.estimated_timeline_days;
    
    const daysDifference = Math.abs(actualDays - estimatedDays);
    return Math.max(0, 100 - (daysDifference / estimatedDays * 100));
  };

  return {
    caseWorkSessions,
    loading,
    markCaseComplete,
    getCaseWorkSession,
    getTimelineAccuracy,
    refreshData: fetchCaseWorkSessions
  };
};