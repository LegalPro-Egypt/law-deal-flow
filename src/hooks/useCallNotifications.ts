import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface IncomingCall {
  id: string;
  case_id: string;
  room_url: string;
  room_name: string;
  session_type: 'video' | 'voice';
  initiated_by: string;
  case_title?: string;
  caller_name?: string;
}

export const useCallNotifications = () => {
  const { user } = useAuth();
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);

  useEffect(() => {
    if (!user) return;

    // Subscribe to new communication sessions (for receiving calls)
    const channel = supabase
      .channel('communication-sessions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication_sessions',
          filter: `status=eq.pending`,
        },
        async (payload: any) => {
          console.log('📱 [useCallNotifications] New call notification:', payload);
          
          // Check if this call is for the current user
          const session = payload.new;
          
          // Skip if user initiated this call
          if (session.initiated_by === user.id) {
            console.log('📱 [useCallNotifications] Skipping - user is initiator');
            return;
          }

          // Fetch case details
          const { data: caseData } = await supabase
            .from('cases')
            .select('id, title, user_id, assigned_lawyer_id')
            .eq('id', session.case_id)
            .single();

          if (!caseData) return;

          // Check if user is part of this case
          const isClient = caseData.user_id === user.id;
          const isLawyer = caseData.assigned_lawyer_id === user.id;

          if (!isClient && !isLawyer) {
            console.log('📱 [useCallNotifications] User not part of this case');
            return;
          }

          // Fetch caller info
          const { data: callerProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', session.initiated_by)
            .single();

          const callerName = callerProfile
            ? `${callerProfile.first_name || ''} ${callerProfile.last_name || ''}`.trim() || callerProfile.email
            : 'Unknown';

          console.log('📱 [useCallNotifications] Setting incoming call:', {
            caller: callerName,
            type: session.session_type,
          });

          setIncomingCall({
            id: session.id,
            case_id: session.case_id,
            room_url: session.room_url,
            room_name: session.room_name,
            session_type: session.session_type,
            initiated_by: session.initiated_by,
            case_title: caseData.title,
            caller_name: callerName,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'communication_sessions',
          filter: `initiated_by=eq.${user.id}`,
        },
        (payload: any) => {
          console.log('📱 [useCallNotifications] Session status updated:', {
            status: payload.new.status,
            sessionId: payload.new.id,
          });
          
          // If call was declined, notify initiator
          if (payload.new.status === 'declined') {
            console.log('📱 [useCallNotifications] Call was declined');
          }
        }
      )
      .subscribe();

    console.log('📱 [useCallNotifications] Subscribed to communication sessions');

    return () => {
      console.log('📱 [useCallNotifications] Unsubscribing from communication sessions');
      supabase.removeChannel(channel);
    };
  }, [user]);

  const answerCall = async (sessionId: string) => {
    try {
      // Update session status to active
      const { error } = await supabase
        .from('communication_sessions')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error answering call:', error);
      return false;
    }
  };

  const declineCall = async (sessionId: string) => {
    try {
      // Update session status to declined
      const { error } = await supabase
        .from('communication_sessions')
        .update({
          status: 'declined',
          ended_at: new Date().toISOString(),
        })
        .eq('id', sessionId);

      if (error) throw error;

      setIncomingCall(null);
      return true;
    } catch (error) {
      console.error('Error declining call:', error);
      return false;
    }
  };

  return {
    incomingCall,
    answerCall,
    declineCall,
    clearIncomingCall: () => setIncomingCall(null),
  };
};