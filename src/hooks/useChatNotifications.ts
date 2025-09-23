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

  // Fetch initial unread counts
  const fetchUnreadCounts = async () => {
    if (!user) {
      setUnreadCounts({});
      setLoading(false);
      return;
    }

    try {
      // Get user's cases and count unread messages for each
      const { data: userCases, error: casesError } = await supabase
        .from('cases')
        .select('id')
        .eq('user_id', user.id);

      if (casesError) throw casesError;

      const counts: UnreadCounts = {};
      
      for (const caseItem of userCases || []) {
        const { count, error } = await supabase
          .from('case_messages')
          .select('*', { count: 'exact', head: true })
          .eq('case_id', caseItem.id)
          .eq('is_read', false)
          .neq('role', 'user'); // Don't count user's own messages as unread

        if (!error && count !== null) {
          counts[caseItem.id] = count;
        }
      }

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
      const { error } = await supabase.rpc(
        'mark_case_messages_as_read',
        {
          p_case_id: caseId,
          p_user_id: user.id,
          p_exclude_role: 'user'
        }
      );

      if (error) throw error;

      // Update local state
      setUnreadCounts(prev => ({
        ...prev,
        [caseId]: 0
      }));
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  // Send a new chat message
  const sendMessage = async (caseId: string, content: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('case_messages')
        .insert({
          case_id: caseId,
          role: 'user',
          content: content,
          message_type: 'text',
          metadata: {}
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Get total unread count across all cases
  const getTotalUnreadCount = () => {
    return Object.values(unreadCounts).reduce((total, count) => total + count, 0);
  };

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('chat-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'case_messages'
        },
        (payload) => {
          const newMessage = payload.new;
          
          // Only count messages not from the current user
          if (newMessage.role !== 'user') {
            setUnreadCounts(prev => ({
              ...prev,
              [newMessage.case_id]: (prev[newMessage.case_id] || 0) + 1
            }));
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'case_messages'
        },
        (payload) => {
          const updatedMessage = payload.new;
          
          // If message was marked as read, update counts
          if (updatedMessage.is_read && updatedMessage.read_by === user.id) {
            fetchUnreadCounts(); // Refetch to get accurate count
          }
        }
      )
      .subscribe();

    // Initial fetch
    fetchUnreadCounts();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    unreadCounts,
    loading,
    markMessagesAsRead,
    sendMessage,
    getTotalUnreadCount,
    refetch: fetchUnreadCounts
  };
};