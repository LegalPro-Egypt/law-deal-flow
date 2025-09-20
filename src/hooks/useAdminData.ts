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

      // Get active cases (submitted or in_progress status)
      const { count: activeCases } = await supabase
        .from('cases')
        .select('*', { count: 'exact', head: true })
        .in('status', ['submitted', 'in_progress']);

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

      // All cases are unique due to idempotency constraints - no filtering needed
      setCases(casesData || []);
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
      
      // If no linked case, look for intake cases from the same user
      if (!existingCase && conversation.user_id) {
        const { data: intakeCases } = await supabase
          .from('cases')
          .select('*')
          .eq('user_id', conversation.user_id)
          .eq('status', 'intake')
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (intakeCases && intakeCases.length > 0) {
          existingCase = intakeCases[0];
        }
      }

      // Extract case data from conversation metadata or messages
      const metadata = (conversation.metadata as any) || {};
      const extractedData = metadata.extractedData || {};
      const messages = conversation.messages || [];
      
      // Generate case summary from conversation
      const userMessages = messages.filter(msg => msg.role === 'user');
      const conversationText = userMessages
        .map(msg => msg.content)
        .join(' ');

      // Generate client responses summary from user messages
      const clientResponsesSummary = {
        keyPoints: userMessages.slice(0, 3).map(msg => msg.content.slice(0, 100) + '...'),
        totalMessages: userMessages.length,
        mainConcerns: extractedData.concerns || [],
        goals: extractedData.goals || [],
        mentionedParties: extractedData.parties || [],
        timeline: extractedData.timeline || null
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
        jurisdiction: 'egypt',
        // No need for draft_data in simplified case lifecycle
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
        
        // Clean up any other intake cases for this user/category after successful update
        await supabase
          .from('cases')
          .delete()
          .eq('user_id', conversation.user_id)
          .eq('status', 'intake')
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

      // Migrate conversation messages to case_messages table
      if (messages && messages.length > 0) {
        console.log('Migrating conversation messages to case_messages');
        const caseMessages = messages.map(msg => ({
          case_id: finalCase.id,
          role: msg.role,
          content: msg.content,
          message_type: msg.message_type || 'text',
          metadata: msg.metadata || {},
          created_at: msg.created_at
        }));

        const { error: messagesError } = await supabase
          .from('case_messages')
          .insert(caseMessages);

        if (messagesError) {
          console.error('Failed to migrate messages to case_messages:', messagesError);
        } else {
          console.log('Successfully migrated', messages.length, 'messages to case_messages');
        }
      }

      // Generate legal analysis in background
      if (messages && messages.length > 0) {
        console.log('Triggering background legal analysis generation');
        try {
          // Use supabase functions invoke to trigger legal analysis
          await supabase.functions.invoke('generate-legal-analysis', {
            body: { 
              messages: messages,
              category: finalCase.category,
              language: finalCase.language,
              caseId: finalCase.id
            }
          });
          console.log('Legal analysis generation triggered');
        } catch (analysisError) {
          console.error('Failed to trigger legal analysis:', analysisError);
          // Don't throw error - case was created successfully
        }
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

  // Cleanup function removed - idempotency prevents duplicates

  const repairCaseConversationLinks = async () => {
    try {
      // Find conversations without case_id that have similar creation time to cases
      const { data: orphanedConversations } = await supabase
        .from('conversations')
        .select('id, user_id, created_at')
        .eq('mode', 'intake')
        .is('case_id', null)
        .not('user_id', 'is', null);

      if (!orphanedConversations || orphanedConversations.length === 0) {
        toast({
          title: "Info",
          description: "No orphaned conversations found to repair",
        });
        return;
      }

      let repaired = 0;
      
      for (const conversation of orphanedConversations) {
        // Find matching case by user_id and similar creation time
        const { data: matchingCases } = await supabase
          .from('cases')
          .select('id')
          .eq('user_id', conversation.user_id)
          .gte('created_at', new Date(new Date(conversation.created_at).getTime() - 2 * 60 * 60 * 1000).toISOString())
          .lte('created_at', new Date(new Date(conversation.created_at).getTime() + 2 * 60 * 60 * 1000).toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (matchingCases && matchingCases.length > 0) {
          const caseId = matchingCases[0].id;
          
          // Link the conversation to the case
          await supabase
            .from('conversations')
            .update({ case_id: caseId })
            .eq('id', conversation.id);
          
          // Migrate messages from this conversation to case_messages
          const { data: messages } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

          if (messages && messages.length > 0) {
            const caseMessages = messages.map(msg => ({
              case_id: caseId,
              role: msg.role,
              content: msg.content,  
              message_type: msg.message_type || 'text',
              metadata: msg.metadata || {},
              created_at: msg.created_at
            }));

            await supabase
              .from('case_messages')
              .insert(caseMessages);
          }
          
          repaired++;
        }
      }

      toast({
        title: "Success", 
        description: `Repaired ${repaired} orphaned conversations and migrated their messages`,
      });

    } catch (error: any) {
      console.error('Error repairing case-conversation links:', error);
      toast({
        title: "Error",
        description: `Failed to repair links: ${error.message}`,
        variant: "destructive",
      });
      throw error;
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    Promise.all([
      fetchAdminStats(),
      fetchPendingIntakes(),
      fetchCases()
    ]).finally(() => setLoading(false));
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
    // cleanupDuplicateCases removed
    repairCaseConversationLinks,
    refreshData: () => Promise.all([fetchAdminStats(), fetchPendingIntakes(), fetchCases()])
  };
};
