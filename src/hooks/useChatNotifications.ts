import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UnreadCounts {
  [caseId: string]: number;
}

export const useChatNotifications = () => {
  const { user } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState<UnreadCounts>({});
  const [loading, setLoading] = useState(true);

  // Get user's role (client or lawyer)
  const getUserRole = async () => {
    if (!user) return null;
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    
    return profile?.role || 'client';
  };

  // Fetch unread message counts for all user's cases
  const fetchUnreadCounts = async () => {
    if (!user) {
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    try {
      const userRole = await getUserRole();
      
      // Get user's cases based on their role
      let casesQuery = supabase.from('cases').select('id');
      
      if (userRole === 'client') {
        casesQuery = casesQuery.eq('user_id', user.id);
      } else if (userRole === 'lawyer') {
        casesQuery = casesQuery.eq('assigned_lawyer_id', user.id);
      }
      
      const { data: cases } = await casesQuery;
      
      if (!cases || cases.length === 0) {
        setUnreadCounts({});
        setLoading(false);
        return;
      }

      const caseIds = cases.map(c => c.id);
      
      // Count unread messages for each case
      // For clients: count messages from lawyers (role = 'lawyer')
      // For lawyers: count messages from clients (role = 'user')
      const excludeRole = userRole === 'client' ? 'user' : 'lawyer';
      
      const { data: messageCounts } = await supabase
        .from('case_messages')
        .select('case_id')
        .in('case_id', caseIds)
        .eq('is_read', false)
        .neq('role', excludeRole);

      // Group by case_id and count
      const counts: UnreadCounts = {};
      messageCounts?.forEach(msg => {
        counts[msg.case_id] = (counts[msg.case_id] || 0) + 1;
      });

      setUnreadCounts(counts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark messages as read for a specific case
  const markMessagesAsRead = async (caseId: string) => {
    if (!user) return;

    try {
      const userRole = await getUserRole();
      const excludeRole = userRole === 'client' ? 'user' : 'lawyer';
      
      await supabase.rpc('mark_case_messages_as_read', {
        p_case_id: caseId,
        p_user_id: user.id,
        p_exclude_role: excludeRole
      });

      // Update local state
      setUnreadCounts(prev => ({
        ...prev,
        [caseId]: 0
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Set up real-time subscription for message updates
  useEffect(() => {
    if (!user) return;

    fetchUnreadCounts();

    const channel = supabase
      .channel('chat-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'case_messages'
        },
        () => {
          // Refetch counts when messages change
          fetchUnreadCounts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Get total unread count across all cases
  const totalUnreadCount = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  return {
    unreadCounts,
    totalUnreadCount,
    loading,
    markMessagesAsRead,
    refetch: fetchUnreadCounts
  };
};