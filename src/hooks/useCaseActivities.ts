import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface CaseActivity {
  id: string;
  case_id: string;
  lawyer_id: string;
  activity_type: string;
  title: string;
  description: string | null;
  status: string;
  hours_worked: number | null;
  attachments: any;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export const useCaseActivities = (caseId?: string) => {
  const [activities, setActivities] = useState<CaseActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user && caseId) {
      fetchActivities();
      setupRealTimeSubscription();
    }
  }, [user, caseId]);

  const fetchActivities = async () => {
    if (!user || !caseId) return;

    try {
      const { data, error } = await supabase
        .from('case_activities')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error fetching case activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeSubscription = () => {
    if (!user || !caseId) return;

    const channel = supabase
      .channel('case_activities')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_activities',
          filter: `case_id=eq.${caseId}`
        },
        () => {
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const addActivity = async (activityData: {
    title: string;
    description?: string;
    activity_type?: string;
    hours_worked?: number;
    status?: string;
  }) => {
    if (!user || !caseId) return;

    try {
      const { data, error } = await supabase
        .from('case_activities')
        .insert({
          case_id: caseId,
          lawyer_id: user.id,
          title: activityData.title,
          description: activityData.description,
          activity_type: activityData.activity_type || 'progress_update',
          hours_worked: activityData.hours_worked,
          status: activityData.status || 'completed'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Activity added successfully'
      });

      return data;
    } catch (error: any) {
      console.error('Error adding activity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to add activity',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const updateActivity = async (activityId: string, updates: Partial<CaseActivity>) => {
    try {
      const { data, error } = await supabase
        .from('case_activities')
        .update(updates)
        .eq('id', activityId)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Activity updated successfully'
      });

      return data;
    } catch (error: any) {
      console.error('Error updating activity:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update activity',
        variant: 'destructive'
      });
      throw error;
    }
  };

  return {
    activities,
    loading,
    addActivity,
    updateActivity,
    refreshActivities: fetchActivities
  };
};