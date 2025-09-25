import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface Appointment {
  id: string;
  case_id: string;
  lawyer_id: string;
  client_id: string;
  title: string;
  description?: string;
  appointment_type: string;
  scheduled_date: string;
  duration_minutes: number;
  status: string;
  location?: string;
  meeting_link?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  metadata?: any;
}

export const useAppointments = (caseId?: string) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAppointments = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .order('scheduled_date', { ascending: true });

      if (caseId) {
        query = query.eq('case_id', caseId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast({
        title: "Error",
        description: "Failed to load appointments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAppointment = async (appointmentData: any) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          ...appointmentData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Appointment Created",
        description: "The appointment has been scheduled successfully.",
      });

      await fetchAppointments();
      return data;
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to create appointment",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Appointment Updated",
        description: "The appointment has been updated successfully.",
      });

      await fetchAppointments();
      return data;
    } catch (error) {
      console.error('Error updating appointment:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment",
        variant: "destructive",
      });
      return null;
    }
  };

  const cancelAppointment = async (id: string, reason?: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: user.id,
          cancellation_reason: reason,
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Appointment Cancelled",
        description: "The appointment has been cancelled.",
      });

      await fetchAppointments();
      return true;
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [user, caseId]);

  return {
    appointments,
    loading,
    createAppointment,
    updateAppointment,
    cancelAppointment,
    refreshAppointments: fetchAppointments,
  };
};