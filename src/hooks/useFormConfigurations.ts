import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FormConfiguration {
  id: string;
  form_type: 'lawyer_profile' | 'personal_details' | 'lawyer_verification';
  field_name: string;
  is_enabled: boolean;
  is_required: boolean;
  field_order: number;
  validation_rules: Record<string, any>;
  field_options: Record<string, any>;
  help_text?: string;
  label_override?: string;
  created_at: string;
  updated_at: string;
}

export interface FormFieldPreset {
  id: string;
  preset_type: string;
  option_value: string;
  option_label: string;
  is_active: boolean;
  display_order: number;
}

export const useFormConfigurations = (formType: FormConfiguration['form_type']) => {
  const [configurations, setConfigurations] = useState<FormConfiguration[]>([]);
  const [presets, setPresets] = useState<Record<string, FormFieldPreset[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('form_configurations')
        .select('*')
        .eq('form_type', formType)
        .order('field_order', { ascending: true });

      if (error) throw error;
      setConfigurations((data as FormConfiguration[]) || []);
    } catch (error) {
      console.error('Error fetching form configurations:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form configurations',
        variant: 'destructive',
      });
    }
  };

  const fetchPresets = async () => {
    try {
      const { data, error } = await supabase
        .from('form_field_presets')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;

      // Group presets by type
      const groupedPresets: Record<string, FormFieldPreset[]> = {};
      data?.forEach(preset => {
        if (!groupedPresets[preset.preset_type]) {
          groupedPresets[preset.preset_type] = [];
        }
        groupedPresets[preset.preset_type].push(preset);
      });

      setPresets(groupedPresets);
    } catch (error) {
      console.error('Error fetching form presets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load form presets',
        variant: 'destructive',
      });
    }
  };

  const updateConfiguration = async (configId: string, updates: Partial<FormConfiguration>) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('form_configurations')
        .update(updates)
        .eq('id', configId);

      if (error) throw error;

      setConfigurations(prev => 
        prev.map(config => 
          config.id === configId ? { ...config, ...updates } : config
        )
      );

      toast({
        title: 'Success',
        description: 'Form configuration updated successfully',
      });
    } catch (error) {
      console.error('Error updating configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to update form configuration',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const createPreset = async (presetType: string, value: string, label: string) => {
    try {
      const { data, error } = await supabase
        .from('form_field_presets')
        .insert({
          preset_type: presetType,
          option_value: value,
          option_label: label,
          display_order: (presets[presetType]?.length || 0) + 1,
        })
        .select()
        .single();

      if (error) throw error;

      setPresets(prev => ({
        ...prev,
        [presetType]: [...(prev[presetType] || []), data],
      }));

      toast({
        title: 'Success',
        description: 'Option added successfully',
      });
    } catch (error) {
      console.error('Error creating preset:', error);
      toast({
        title: 'Error',
        description: 'Failed to add option',
        variant: 'destructive',
      });
    }
  };

  const deletePreset = async (presetId: string, presetType: string) => {
    try {
      const { error } = await supabase
        .from('form_field_presets')
        .update({ is_active: false })
        .eq('id', presetId);

      if (error) throw error;

      setPresets(prev => ({
        ...prev,
        [presetType]: prev[presetType]?.filter(p => p.id !== presetId) || [],
      }));

      toast({
        title: 'Success',
        description: 'Option removed successfully',
      });
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove option',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchConfigurations(), fetchPresets()]);
      setIsLoading(false);
    };

    loadData();
  }, [formType]);

  return {
    configurations,
    presets,
    isLoading,
    isSaving,
    updateConfiguration,
    createPreset,
    deletePreset,
    refetch: () => Promise.all([fetchConfigurations(), fetchPresets()]),
  };
};