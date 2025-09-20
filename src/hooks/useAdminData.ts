import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminStats {
  totalCases: number;
  activeCases: number;
  pendingIntakes: number;
  totalLawyers: number;
  pendingReviews: number;
  pendingVerifications: number;
}

interface IntakeConversation {
  id: string;
  session_id: string;
  created_at: string;
  language: string;
  status: string;
  messages?: Array<{
    role: string;
    content: string;
    created_at: string;
  }>;
  case_data?: any;
}

interface CaseItem {
  id: string;
  case_number: string;
  title: string;
  description: string;
  category: string;
  urgency: string;
  status: string;
  client_name: string;
  client_email: string;
  created_at: string;
  language: string;
  ai_summary?: string;
  extracted_entities?: any;
}

export const useAdminData = () => {
  const [stats, setStats] = useState<AdminStats>({
    totalCases: 0,
    activeCases: 0,
    pendingIntakes: 0,
    totalLawyers: 0,
    pendingReviews: 0,
    pendingVerifications: 0
  });
  const [pendingIntakes, setPendingIntakes] = useState<IntakeConversation[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchAdminStats = async () => {
    try {
      // Get total cases
      const { count: totalCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true });

      // Get active cases (non-draft status)
      const { count: activeCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'draft');

      // Get pending intake conversations (mode=intake, status=active, with user_id - actionable ones only)
      const { count: pendingIntakes } = await supabase
        .from('conversations')
        .select('*', { count: 'exact', head: true })
        .eq('mode', 'intake')
        .eq('status', 'active')
        .not('user_id', 'is', null)
        .is('case_id', null);

      // Get pending review cases (submitted status)
      const { count: pendingReviews } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');

      // Get total lawyers from profiles
      const { count: totalLawyers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'lawyer')
        .eq('is_active', true);

      // Get pending verifications (lawyers with pending_complete status)
      const { count: pendingVerifications } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'lawyer')
        .eq('verification_status', 'pending_complete');

      setStats({
        totalCases: totalCases || 0,
        activeCases: activeCases || 0,
        pendingIntakes: pendingIntakes || 0,
        totalLawyers: totalLawyers || 0,
        pendingReviews: pendingReviews || 0,
        pendingVerifications: pendingVerifications || 0
      });
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch statistics",
        variant: "destructive",
      });
    }
  };

  const fetchPendingIntakes = async () => {
    try {
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select(`
          id,
          session_id,
          created_at,
          language,
          status,
          metadata,
          user_id,
          case_id,
          messages (
            role,
            content,
            created_at
          )
        `)
        .eq('mode', 'intake')
        .eq('status', 'active')
        .not('user_id', 'is', null)
        .is('case_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingIntakes(conversations || []);
    } catch (error: any) {
      console.error('Error fetching pending intakes:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pending intakes",
        variant: "destructive",
      });
    }
  };

  const fetchCases = async () => {
    try {
      const { data: casesData, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter out duplicate draft cases - prioritize submitted/active cases over drafts
      const filteredCases = (casesData || []).reduce((acc, currentCase) => {
        const existingCaseIndex = acc.findIndex(c => 
          c.user_id === currentCase.user_id && 
          c.category === currentCase.category &&
          c.id !== currentCase.id &&
          Math.abs(new Date(c.created_at).getTime() - new Date(currentCase.created_at).getTime()) < 2 * 60 * 60 * 1000 // Within 2 hours
        );

        if (existingCaseIndex !== -1) {
          const existingCase = acc[existingCaseIndex];
          
          // Prioritize non-draft cases over draft cases
          if (currentCase.status !== 'draft' && existingCase.status === 'draft') {
            acc[existingCaseIndex] = currentCase;
          } else if (currentCase.status === 'draft' && existingCase.status !== 'draft') {
            // Keep existing non-draft case, don't add current draft
            return acc;
          } else if (currentCase.status === existingCase.status) {
            // If both same status, keep the newer one
            if (new Date(currentCase.created_at) > new Date(existingCase.created_at)) {
              acc[existingCaseIndex] = currentCase;
            }
          }
        } else {
          acc.push(currentCase);
        }
        
        return acc;
      }, [] as any[]);

      setCases(filteredCases);
    } catch (error: any) {
      console.error('Error fetching cases:', error);
      toast({
        title: "Error",
        description: "Failed to fetch cases",
        variant: "destructive",
      });
    }
  };

  const createCaseFromIntake = async (conversationId: string) => {
    try {
      // Get conversation with messages and metadata
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select(`
          *,
          messages (*)
        `)
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      // Check if there's already a case linked to this conversation or user
      let existingCase = null;
      
      // First check if conversation already has a case_id
      if (conversation.case_id) {
        const { data: linkedCase } = await supabase
          .from('cases')
          .select('*')
          .eq('id', conversation.case_id)
          .single();
        
        if (linkedCase) {
          existingCase = linkedCase;
        }
      }
      
      // If no linked case, look for draft cases from the same user
      if (!existingCase && conversation.user_id) {
        const { data: draftCases } = await supabase
          .from('cases')
          .select('*')
          .eq('user_id', conversation.user_id)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (draftCases && draftCases.length > 0) {
          existingCase = draftCases[0];
        }
      }

      // Extract case data from conversation metadata or messages
      const metadata = (conversation.metadata as any) || {};
      const extractedData = metadata.extractedData || {};
      const messages = conversation.messages || [];
      
      // Generate case summary from conversation
      const userMessages = messages.filter(msg => msg.role === 'user');
      const assistantMessages = messages.filter(msg => msg.role === 'assistant');
      
      const conversationText = userMessages
        .map(msg => msg.content)
        .join(' ');

      // Generate comprehensive legal analysis from conversation
      const legalAnalysisResult = await supabase.functions.invoke('generate-legal-analysis', {
        body: { 
          messages: messages,
          category: extractedData.category || 'General',
          language: conversation.language || 'en'
        }
      });

      // Generate client responses summary from user messages
      const clientResponsesSummary = {
        keyPoints: userMessages.slice(0, 3).map(msg => msg.content.slice(0, 100) + '...'),
        totalMessages: userMessages.length,
        mainConcerns: extractedData.concerns || [],
        goals: extractedData.goals || [],
        mentionedParties: extractedData.parties || [],
        timeline: extractedData.timeline || null
      };

      // Use generated legal analysis or fallback to basic analysis
      const legalAnalysis = legalAnalysisResult.data?.legalAnalysis || {
        caseSummary: extractedData.summary || conversationText.slice(0, 500),
        applicableLaws: [],
        recommendedSpecialization: {
          primaryArea: extractedData.category || 'General Legal',
          secondaryAreas: [],
          reasoning: "Based on case category and initial assessment"
        },
        legalStrategy: {
          immediateSteps: ["Consult with qualified lawyer", "Gather relevant documents"],
          documentation: extractedData.requiredDocuments || [],
          timeline: "To be determined upon legal consultation",
          risks: [],
          opportunities: []
        },
        caseComplexity: {
          level: extractedData.complexity || 'medium',
          factors: ["Standard legal matter requiring professional assessment"],
          estimatedCost: "To be determined"
        },
        jurisdiction: "egypt",
        urgency: extractedData.urgency || 'medium'
      };

      const caseData = {
        user_id: conversation.user_id,
        title: extractedData.title || extractedData.category || 'Legal Case from AI Intake',
        description: extractedData.description || conversationText.slice(0, 500) || 'Case created from AI chatbot intake',
        category: extractedData.category || 'General',
        subcategory: extractedData.subcategory,
        urgency: extractedData.urgency || 'medium',
        client_name: extractedData.client_name || existingCase?.client_name || 'Client Name',
        client_email: extractedData.client_email || existingCase?.client_email || 'client@example.com',
        client_phone: extractedData.client_phone || existingCase?.client_phone,
        language: conversation.language,
        status: 'submitted',
        ai_summary: extractedData.summary || conversationText.slice(0, 1000),
        extracted_entities: extractedData.entities || {},
        client_responses_summary: clientResponsesSummary,
        legal_analysis: legalAnalysis,
        jurisdiction: 'egypt',
        // Preserve draft_data from existing case
        draft_data: existingCase?.draft_data || {}
      };

      let finalCase;

      if (existingCase) {
        // Update existing case instead of creating new one
        const { data: updatedCase, error: updateError } = await supabase
          .from('cases')
          .update(caseData)
          .eq('id', existingCase.id)
          .select()
          .single();

        if (updateError) throw updateError;
        finalCase = updatedCase;
        
        // Clean up any other draft cases for this user/category after successful update
        await supabase
          .from('cases')
          .delete()
          .eq('user_id', conversation.user_id)
          .eq('status', 'draft')
          .eq('category', caseData.category)
          .neq('id', finalCase.id);
        
        toast({
          title: "Success",
          description: "Existing case updated and submitted for review",
        });
      } else {
        // Create new case only if no existing draft found
        const { data: newCase, error: caseError } = await supabase
          .from('cases')
          .insert(caseData)
          .select()
          .single();

        if (caseError) throw caseError;
        finalCase = newCase;
        
        toast({
          title: "Success",
          description: "Case created from intake conversation successfully",
        });
      }

      // Update conversation status to mark as completed and link to final case
      const { error: linkError } = await supabase
        .from('conversations')
        .update({ 
          status: 'completed',
          case_id: finalCase.id 
        })
        .eq('id', conversationId);

      if (linkError) {
        console.error('Failed to link conversation to case:', linkError);
        // Don't throw error here, case was created successfully
        toast({
          title: "Warning",
          description: "Case created but conversation linking failed. Case data may be incomplete.",
          variant: "default",
        });
      }

      // Refresh data
      await Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()]);

      return finalCase;
    } catch (error: any) {
      console.error('Error creating case from intake:', error);
      toast({
        title: "Error",
        description: `Failed to create case from intake: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const getAnonymousIntakes = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          session_id,
          created_at,
          language,
          status,
          metadata,
          user_id,
          case_id
        `)
        .eq('mode', 'intake')
        .eq('status', 'active')
        .is('user_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching anonymous intakes:', error);
      throw error;
    }
  };

  const deleteSelectedIntakes = async (conversationIds: string[]) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .in('id', conversationIds);

      if (error) throw error;

      // Refresh data to reflect changes
      await Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()]);

      toast({
        title: "Success",
        description: `Deleted ${conversationIds.length} intake conversation${conversationIds.length > 1 ? 's' : ''}`,
      });
    } catch (error: any) {
      console.error('Error deleting intakes:', error);
      toast({
        title: "Error",
        description: `Failed to delete intakes: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const cleanupAnonymousIntakes = async () => {
    try {
      // Get all anonymous intakes first
      const anonymousIntakes = await getAnonymousIntakes();
      const conversationIds = anonymousIntakes.map(intake => intake.id);

      if (conversationIds.length === 0) {
        toast({
          title: "Info",
          description: "No anonymous intakes found to clean up",
        });
        return;
      }

      // Delete all anonymous intakes
      await deleteSelectedIntakes(conversationIds);

      toast({
        title: "Success",
        description: `Cleaned up ${conversationIds.length} anonymous test intakes`,
      });
    } catch (error: any) {
      console.error('Error cleaning up anonymous intakes:', error);
      toast({
        title: "Error",
        description: `Failed to cleanup intakes: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const denyCaseAndDelete = async (caseId: string, reason?: string) => {
    try {
      // First update the case status to denied with reason
      const { error: updateError } = await supabase
        .from('cases')
        .update({ 
          status: 'denied',
          draft_data: {
            denialReason: reason,
            deniedAt: new Date().toISOString(),
            deniedBy: 'admin'
          }
        })
        .eq('id', caseId);

      if (updateError) throw updateError;

      // Then delete the case
      const { error: deleteError } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);

      if (deleteError) throw deleteError;

      // Refresh data to reflect changes
      await Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()]);

      toast({
        title: "Success",
        description: "Case has been denied and removed from the platform",
      });
    } catch (error: any) {
      console.error('Error denying and deleting case:', error);
      toast({
        title: "Error",
        description: `Failed to deny case: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteCase = async (caseId: string) => {
    try {
      // Delete the case directly
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);

      if (error) throw error;

      // Refresh data to reflect changes
      await Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()]);

      toast({
        title: "Success",
        description: "Case has been permanently deleted",
      });
    } catch (error: any) {
      console.error('Error deleting case:', error);
      toast({
        title: "Error",
        description: `Failed to delete case: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const cleanupDuplicateCases = async () => {
    try {
      const { error } = await supabase.rpc('cleanup_admin_duplicate_cases');
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Duplicate cases cleaned up successfully",
      });
      
      // Refresh data after cleanup
      await Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()]);
    } catch (error: any) {
      console.error('Error cleaning up duplicate cases:', error);
      toast({
        title: "Error",
        description: `Failed to cleanup duplicate cases: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  const repairCaseConversationLinks = async () => {
    try {
      // Find cases without linked conversations
      const { data: orphanedCases, error: fetchError } = await supabase
        .from('cases')
        .select(`
          *,
          conversations!inner(id, case_id)
        `)
        .is('conversations.case_id', null)
        .eq('status', 'submitted');

      if (fetchError) throw fetchError;

      if (!orphanedCases || orphanedCases.length === 0) {
        toast({
          title: "No repairs needed",
          description: "All cases have properly linked conversations",
        });
        return;
      }

      let repairedCount = 0;

      // Attempt to link conversations to cases
      for (const caseItem of orphanedCases) {
        if (!caseItem.user_id) continue;

        // Find potential conversation around case creation time
        const caseTime = new Date(caseItem.created_at);
        const startTime = new Date(caseTime.getTime() - 2 * 60 * 60 * 1000);
        const endTime = new Date(caseTime.getTime() + 2 * 60 * 60 * 1000);

        const { data: conversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', caseItem.user_id)
          .eq('mode', 'intake')
          .is('case_id', null)
          .gte('created_at', startTime.toISOString())
          .lte('created_at', endTime.toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (conversation) {
          await supabase
            .from('conversations')
            .update({ case_id: caseItem.id })
            .eq('id', conversation.id);
          
          repairedCount++;
        }
      }

      toast({
        title: "Repair Complete",
        description: `Repaired ${repairedCount} case-conversation links`,
      });

      // Refresh data after repair
      await Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()]);
    } catch (error: any) {
      console.error('Error repairing case-conversation links:', error);
      toast({
        title: "Error",
        description: `Failed to repair case links: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAdminStats(),
        fetchPendingIntakes(),
        fetchCases()
      ]);
      
      // Run cleanup on initial load to remove any existing duplicates
      try {
        await supabase.rpc('cleanup_admin_duplicate_cases');
      } catch (error) {
        console.log('Cleanup failed during initial load:', error);
      }
      
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    stats,
    pendingIntakes,
    cases,
    loading,
    createCaseFromIntake,
    deleteSelectedIntakes,
    denyCaseAndDelete,
    deleteCase,
    cleanupDuplicateCases,
    repairCaseConversationLinks,
    refreshData: () => Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()])
  };
};