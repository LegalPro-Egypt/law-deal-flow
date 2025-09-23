import { supabase } from '@/integrations/supabase/client';

/**
 * Emergency session cleanup utilities for client-side session management
 */

export const emergencySessionCleanup = async (sessionId: string): Promise<boolean> => {
  try {
    console.log('Performing emergency cleanup for session:', sessionId);
    
    const { error } = await supabase.functions.invoke('session-cleanup', {
      body: { sessionId }
    });

    if (error) {
      console.error('Emergency cleanup error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Emergency cleanup failed:', error);
    return false;
  }
};

export const validateSessionState = async (sessionId: string): Promise<'active' | 'ended' | 'failed' | null> => {
  try {
    const { data, error } = await supabase
      .from('communication_sessions')
      .select('status')
      .eq('id', sessionId)
      .single();

    if (error || !data) {
      return null;
    }

    return data.status as 'active' | 'ended' | 'failed';
  } catch (error) {
    console.error('Error validating session state:', error);
    return null;
  }
};

/**
 * Setup browser-level session cleanup for when users close tabs/browsers
 * during active sessions
 */
export const setupBrowserSessionCleanup = (activeSessionId: string | null) => {
  if (!activeSessionId) return;

  const cleanup = () => {
    if (activeSessionId) {
      // Use sendBeacon for reliable cleanup on page unload
      const endSessionData = JSON.stringify({
        sessionId: activeSessionId,
        endTime: new Date().toISOString()
      });
      
      const supabaseUrl = 'https://igrpbeordzwcsxihlwny.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlncnBiZW9yZHp3Y3N4aWhsd255Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4NzIxODksImV4cCI6MjA3MzQ0ODE4OX0.3Abfp47QaWumSXPpP0In1vhKDjVN7YB-dEyimja95no';
      
      // Try sendBeacon first (most reliable)
      if (navigator.sendBeacon) {
        const success = navigator.sendBeacon(
          `${supabaseUrl}/functions/v1/session-cleanup`,
          endSessionData
        );
        console.log('SendBeacon cleanup result:', success);
      }
      
      // Fallback to synchronous fetch (less reliable but better than nothing)
      try {
        fetch(`${supabaseUrl}/functions/v1/session-cleanup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`
          },
          body: endSessionData,
          keepalive: true
        }).catch(error => {
          console.error('Fallback cleanup error:', error);
        });
      } catch (error) {
        console.error('Synchronous cleanup error:', error);
      }
    }
  };

  // Setup event listeners
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('unload', cleanup);
  window.addEventListener('pagehide', cleanup);

  // Return cleanup function to remove listeners
  return () => {
    window.removeEventListener('beforeunload', cleanup);
    window.removeEventListener('unload', cleanup);
    window.removeEventListener('pagehide', cleanup);
  };
};

/**
 * Periodic session validation to ensure consistency
 */
export const createSessionValidator = (sessionId: string, onSessionEnded: () => void) => {
  const interval = setInterval(async () => {
    const status = await validateSessionState(sessionId);
    
    if (status === 'ended' || status === 'failed') {
      console.log('Session detected as ended/failed, cleaning up UI...');
      onSessionEnded();
      clearInterval(interval);
    } else if (status === null) {
      console.warn('Session not found, may have been cleaned up');
      onSessionEnded();
      clearInterval(interval);
    }
  }, 15000); // Check every 15 seconds

  return () => clearInterval(interval);
};