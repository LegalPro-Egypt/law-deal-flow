import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface TwilioSession {
  id: string;
  case_id: string;
  client_id: string;
  lawyer_id?: string;
  session_type: 'video' | 'voice' | 'chat';
  status: 'scheduled' | 'active' | 'ended' | 'failed';
  twilio_room_sid?: string;
  room_name?: string;
  recording_enabled: boolean;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  duration_seconds?: number;
}

export interface TwilioAccessToken {
  accessToken: string;
  roomName: string;
  sessionId: string;
  identity: string;
}

export const useTwilioSession = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<TwilioSession[]>([]);
  const [activeSession, setActiveSession] = useState<TwilioSession | null>(null);
  const [accessToken, setAccessToken] = useState<TwilioAccessToken | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Fetch user's sessions
  const fetchSessions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('communication_sessions')
        .select('*')
        .or(`client_id.eq.${user.id},lawyer_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSessions((data || []) as TwilioSession[]);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load communication sessions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Create access token for joining a session
  const createAccessToken = useCallback(async (
    caseId: string, 
    sessionType: 'video' | 'voice' | 'chat' = 'video'
  ): Promise<TwilioAccessToken | null> => {
    if (!user) return null;

    try {
      setConnecting(true);
      
      // Determine participant role based on case ownership
      const { data: caseData } = await supabase
        .from('cases')
        .select('user_id, assigned_lawyer_id')
        .eq('id', caseId)
        .single();

      const participantRole = caseData?.user_id === user.id ? 'client' : 'lawyer';

      const { data, error } = await supabase.functions.invoke('create-twilio-access-token', {
        body: {
          caseId,
          sessionType,
          participantRole
        }
      });

      if (error) throw error;
      
      setAccessToken(data);
      toast({
        title: 'Access Token Created',
        description: `Ready to join ${sessionType} session`,
      });
      
      return data;
    } catch (error) {
      console.error('Error creating access token:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to create session access token',
        variant: 'destructive',
      });
      return null;
    } finally {
      setConnecting(false);
    }
  }, [user]);

  // Start recording for a session
  const startRecording = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-twilio-recording', {
        body: {
          sessionId,
          action: 'start'
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Recording Started',
        description: 'Session recording has begun',
      });
      
      // Update local session state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, recording_enabled: true }
          : session
      ));
      
      return data;
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Recording Error',
        description: 'Failed to start recording',
        variant: 'destructive',
      });
    }
  }, []);

  // Stop recording for a session
  const stopRecording = useCallback(async (sessionId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-twilio-recording', {
        body: {
          sessionId,
          action: 'stop'
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Recording Stopped',
        description: 'Session recording has ended',
      });
      
      // Update local session state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, recording_enabled: false }
          : session
      ));
      
      return data;
    } catch (error) {
      console.error('Error stopping recording:', error);
      toast({
        title: 'Recording Error',
        description: 'Failed to stop recording',
        variant: 'destructive',
      });
    }
  }, []);

  // Get recordings for a session or case
  const getRecordings = useCallback(async (caseId?: string, sessionId?: string) => {
    try {
      const params = new URLSearchParams();
      if (caseId) params.append('caseId', caseId);
      if (sessionId) params.append('sessionId', sessionId);

      const { data, error } = await supabase.functions.invoke('get-session-recordings', {
        body: { caseId, sessionId }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching recordings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recordings',
        variant: 'destructive',
      });
      return [];
    }
  }, []);

  // Real-time session updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('communication-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'communication_sessions',
          filter: `or(client_id.eq.${user.id},lawyer_id.eq.${user.id})`
        },
        (payload) => {
          console.log('Session update:', payload);
          
          if (payload.eventType === 'INSERT') {
            setSessions(prev => [payload.new as TwilioSession, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setSessions(prev => prev.map(session => 
              session.id === payload.new.id ? payload.new as TwilioSession : session
            ));
            
            // Update active session if it's the one being updated
            if (activeSession?.id === payload.new.id) {
              setActiveSession(payload.new as TwilioSession);
            }
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(session => session.id !== payload.old.id));
            
            if (activeSession?.id === payload.old.id) {
              setActiveSession(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeSession]);

  // Load sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    activeSession,
    setActiveSession,
    accessToken,
    setAccessToken,
    loading,
    connecting,
    createAccessToken,
    startRecording,
    stopRecording,
    getRecordings,
    fetchSessions
  };
};