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
          participantRole,
          status: 'scheduled',
          recording_enabled: true  // Always enable recording automatically
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


  // End a session with retry logic
  const endSession = useCallback(async (sessionId: string, startTime?: Date, retryCount = 0) => {
    try {
      const endTime = new Date();
      const duration = startTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000) : null;

      const { error } = await supabase
        .from('communication_sessions')
        .update({
          status: 'ended',
          ended_at: endTime.toISOString(),
          duration_seconds: duration
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Update local state
      setSessions(prev => prev.map(session => 
        session.id === sessionId 
          ? { ...session, status: 'ended', ended_at: endTime.toISOString(), duration_seconds: duration }
          : session
      ));

      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setAccessToken(null);
      }

      toast({
        title: 'Session Ended',
        description: 'Communication session has been ended successfully',
      });

      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      
      // Retry logic with exponential backoff
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        setTimeout(() => {
          endSession(sessionId, startTime, retryCount + 1);
        }, delay);
        return false;
      }

      toast({
        title: 'Error',
        description: 'Failed to end session properly after retries',
        variant: 'destructive',
      });
      return false;
    }
  }, [activeSession]);

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

  // Cleanup stale sessions function
  const cleanupStaleSessions = useCallback(async () => {
    try {
      const { error } = await supabase.rpc('cleanup_stale_communication_sessions');
      if (error) throw error;
      
      // Refresh sessions after cleanup
      await fetchSessions();
    } catch (error) {
      console.error('Error cleaning up stale sessions:', error);
    }
  }, [fetchSessions]);

  // Session validation and heartbeat
  const validateAndSyncSessions = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch fresh session data from server
      const { data: serverSessions, error } = await supabase
        .from('communication_sessions')
        .select('*')
        .or(`client_id.eq.${user.id},lawyer_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Compare local state with server state
      const serverSessionMap = new Map(serverSessions?.map(s => [s.id, s]) || []);
      const localSessionMap = new Map(sessions.map(s => [s.id, s]));

      let hasChanges = false;

      // Check for sessions that need to be updated locally
      for (const [id, serverSession] of serverSessionMap) {
        const localSession = localSessionMap.get(id);
        if (!localSession || localSession.status !== serverSession.status) {
          hasChanges = true;
          break;
        }
      }

      // Check for sessions that exist locally but not on server
      for (const [id] of localSessionMap) {
        if (!serverSessionMap.has(id)) {
          hasChanges = true;
          break;
        }
      }

      if (hasChanges) {
        setSessions((serverSessions || []) as TwilioSession[]);
        
        // Update active session if it changed
        if (activeSession) {
          const updatedActiveSession = serverSessionMap.get(activeSession.id);
          if (updatedActiveSession && updatedActiveSession.status === 'ended') {
            setActiveSession(null);
            setAccessToken(null);
          } else if (updatedActiveSession) {
            setActiveSession(updatedActiveSession as TwilioSession);
          }
        }
      }
    } catch (error) {
      console.error('Error validating sessions:', error);
    }
  }, [user, sessions, activeSession]);

  // Real-time session updates with enhanced cleanup
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
            const updatedSession = payload.new as TwilioSession;
            setSessions(prev => prev.map(session => 
              session.id === updatedSession.id ? updatedSession : session
            ));
            
            // Update active session if it changed to ended
            if (activeSession?.id === updatedSession.id) {
              if (updatedSession.status === 'ended') {
                setActiveSession(null);
                setAccessToken(null);
                toast({
                  title: 'Session Ended',
                  description: 'The communication session has ended',
                });
              } else {
                setActiveSession(updatedSession);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setSessions(prev => prev.filter(session => session.id !== payload.old.id));
            
            if (activeSession?.id === payload.old.id) {
              setActiveSession(null);
              setAccessToken(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeSession]);

  // Browser close/refresh cleanup
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (activeSession && activeSession.status === 'active') {
        // Use sendBeacon for reliable cleanup on page unload
        const endSessionData = JSON.stringify({
          sessionId: activeSession.id,
          endTime: new Date().toISOString(),
          status: 'ended'
        });
        
        navigator.sendBeacon('/api/end-session', endSessionData);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && activeSession) {
        // Page is being hidden, validate session state
        validateAndSyncSessions();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeSession, validateAndSyncSessions]);

  // Periodic session validation (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      validateAndSyncSessions();
    }, 30000);

    return () => clearInterval(interval);
  }, [validateAndSyncSessions]);

  // Initial cleanup on mount
  useEffect(() => {
    if (user) {
      cleanupStaleSessions();
    }
  }, [user, cleanupStaleSessions]);

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
    endSession,
    getRecordings,
    fetchSessions,
    cleanupStaleSessions,
    validateAndSyncSessions
  };
};