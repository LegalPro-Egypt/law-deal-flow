import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type FormPolicyType = 'lawyer_forms' | 'client_forms' | 'client_policies' | 'lawyer_policies';
export type FormPolicyStatus = 'draft' | 'published';

export interface FormPolicy {
  id: string;
  type: FormPolicyType;
  title: string;
  content: string;
  schema?: any;
  status: FormPolicyStatus;
  version: number;
  updated_by?: string;
  updated_at: string;
  change_note?: string;
  created_at: string;
}

export interface FormPolicyDraft {
  title: string;
  content: string;
  schema?: any;
  change_note?: string;
}

export const useFormsPolicies = (type: FormPolicyType) => {
  const [items, setItems] = useState<FormPolicy[]>([]);
  const [currentItem, setCurrentItem] = useState<FormPolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { toast } = useToast();

  // Fetch all items of the specified type
  const fetchItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('form_policies')
        .select('*')
        .eq('type', type)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setItems((data || []) as FormPolicy[]);
    } catch (error) {
      console.error('Error fetching form policies:', error);
      toast({
        title: "Error",
        description: "Failed to fetch form policies",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [type, toast]);

  // Fetch specific item by ID
  const fetchItem = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('form_policies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setCurrentItem(data as FormPolicy);
      return data as FormPolicy;
    } catch (error) {
      console.error('Error fetching form policy:', error);
      toast({
        title: "Error",
        description: "Failed to fetch form policy",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Save draft
  const saveDraft = useCallback(async (id: string, draft: Partial<FormPolicyDraft>) => {
    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('form_policies')
        .update({
          ...draft,
          status: 'draft',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setCurrentItem(data as FormPolicy);
      setHasUnsavedChanges(false);
      
      // Update the item in the list
      setItems(prev => prev.map(item => item.id === id ? data as FormPolicy : item));
      
      return data;
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  // Publish item (creates new version)
  const publishItem = useCallback(async (id: string, changeNote: string) => {
    try {
      setIsSaving(true);
      
      // Get current item to increment version
      const current = items.find(item => item.id === id);
      if (!current) throw new Error('Item not found');

      const { data, error } = await supabase
        .from('form_policies')
        .update({
          status: 'published',
          version: current.version + 1,
          change_note: changeNote,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      
      setCurrentItem(data as FormPolicy);
      setHasUnsavedChanges(false);
      
      // Update the item in the list
      setItems(prev => prev.map(item => item.id === id ? data as FormPolicy : item));
      
      toast({
        title: "Success",
        description: "Item published successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error publishing item:', error);
      toast({
        title: "Error",
        description: "Failed to publish item",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [items, toast]);

  // Create new item
  const createItem = useCallback(async (itemData: FormPolicyDraft & { type: FormPolicyType }) => {
    try {
      setIsSaving(true);
      const { data, error } = await supabase
        .from('form_policies')
        .insert([{
          ...itemData,
          status: 'draft',
          version: 1,
        }])
        .select()
        .single();

      if (error) throw error;
      
      setItems(prev => [data as FormPolicy, ...prev]);
      
      toast({
        title: "Success",
        description: "New item created successfully",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating item:', error);
      toast({
        title: "Error",
        description: "Failed to create item",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [toast]);

  // Get version history for an item
  const getVersionHistory = useCallback(async (title: string) => {
    try {
      const { data, error } = await supabase
        .from('form_policies')
        .select('*')
        .eq('type', type)
        .eq('title', title)
        .order('version', { ascending: false });

      if (error) throw error;
      return (data || []) as FormPolicy[];
    } catch (error) {
      console.error('Error fetching version history:', error);
      toast({
        title: "Error",
        description: "Failed to fetch version history",
        variant: "destructive",
      });
      return [];
    }
  }, [type, toast]);

  // Restore version
  const restoreVersion = useCallback(async (sourceId: string, targetId: string) => {
    try {
      setIsSaving(true);
      
      // Get the source version data
      const sourceItem = await fetchItem(sourceId);
      if (!sourceItem) throw new Error('Source version not found');
      
      // Get current target to increment version
      const targetItem = items.find(item => item.id === targetId);
      if (!targetItem) throw new Error('Target item not found');

      const { data, error } = await supabase
        .from('form_policies')
        .update({
          content: sourceItem.content,
          schema: sourceItem.schema,
          status: 'draft', // Restored versions start as drafts
          version: targetItem.version + 1,
          change_note: `Restored from version ${sourceItem.version}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetId)
        .select()
        .single();

      if (error) throw error;
      
      setCurrentItem(data as FormPolicy);
      setItems(prev => prev.map(item => item.id === targetId ? data as FormPolicy : item));
      
      toast({
        title: "Success",
        description: `Restored from version ${sourceItem.version}`,
      });
      
      return data;
    } catch (error) {
      console.error('Error restoring version:', error);
      toast({
        title: "Error",
        description: "Failed to restore version",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [items, fetchItem, toast]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    currentItem,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    fetchItems,
    fetchItem,
    saveDraft,
    publishItem,
    createItem,
    getVersionHistory,
    restoreVersion,
    setCurrentItem,
  };
};