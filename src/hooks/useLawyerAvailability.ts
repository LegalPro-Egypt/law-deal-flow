import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export interface LawyerAvailability {
  id: string;
  lawyer_id: string;
  case_id?: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, etc.
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  is_available: boolean;
  created_at: string;
  updated_at: string;
  metadata?: any;
}

export const useLawyerAvailability = (caseId?: string) => {
  const [availability, setAvailability] = useState<LawyerAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchAvailability = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('lawyer_availability')
        .select('*')
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (caseId) {
        query = query.or(`case_id.eq.${caseId},case_id.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setAvailability(data || []);
    } catch (error) {
      console.error('Error fetching availability:', error);
      toast({
        title: "Error",
        description: "Failed to load availability",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAvailabilitySlot = async (availabilityData: any) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('lawyer_availability')
        .insert({
          ...availabilityData,
          lawyer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Availability Added",
        description: "Your availability slot has been added.",
      });

      await fetchAvailability();
      return data;
    } catch (error) {
      console.error('Error creating availability:', error);
      toast({
        title: "Error",
        description: "Failed to add availability slot",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateAvailabilitySlot = async (id: string, updates: Partial<LawyerAvailability>) => {
    try {
      const { data, error } = await supabase
        .from('lawyer_availability')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Availability Updated",
        description: "Your availability has been updated.",
      });

      await fetchAvailability();
      return data;
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteAvailabilitySlot = async (id: string) => {
    try {
      const { error } = await supabase
        .from('lawyer_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Availability Removed",
        description: "The availability slot has been removed.",
      });

      await fetchAvailability();
      return true;
    } catch (error) {
      console.error('Error deleting availability:', error);
      toast({
        title: "Error",
        description: "Failed to remove availability slot",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [user, caseId]);

  return {
    availability,
    loading,
    createAvailabilitySlot,
    updateAvailabilitySlot,
    deleteAvailabilitySlot,
    refreshAvailability: fetchAvailability,
  };
};