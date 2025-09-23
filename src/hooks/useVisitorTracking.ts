import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VisitorData {
  page_path: string;
  referrer_url?: string;
  user_agent: string;
  session_id: string;
  session_duration?: number;
  user_role?: string;
}

export const useVisitorTracking = (profile?: { role?: string } | null) => {
  const sessionStartTime = useRef<number>(Date.now());
  const sessionId = useRef<string>('');
  const hasTracked = useRef<boolean>(false);

  // Generate or retrieve session ID
  const getSessionId = (): string => {
    if (!sessionId.current) {
      const stored = sessionStorage.getItem('visitor_session_id');
      if (stored) {
        sessionId.current = stored;
      } else {
        sessionId.current = crypto.randomUUID();
        sessionStorage.setItem('visitor_session_id', sessionId.current);
      }
    }
    return sessionId.current;
  };

  // Check if tracking should be disabled
  const shouldTrack = (): boolean => {
    // Respect Do Not Track
    if (navigator.doNotTrack === '1') {
      return false;
    }
    
    // Don't track if user has opted out
    if (localStorage.getItem('visitor_tracking_disabled') === 'true') {
      return false;
    }

    // Don't track admin users
    if (profile?.role === 'admin') {
      return false;
    }

    return true;
  };

  // Track visitor data
  const trackVisitor = async (additionalData?: Partial<VisitorData>) => {
    if (!shouldTrack() || hasTracked.current) {
      return;
    }

    try {
      const sessionDuration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
      
      const visitorData: VisitorData = {
        page_path: window.location.pathname,
        referrer_url: document.referrer || undefined,
        user_agent: navigator.userAgent,
        session_id: getSessionId(),
        session_duration: sessionDuration,
        user_role: profile?.role,
        ...additionalData
      };

      const { data, error } = await supabase.functions.invoke('track-visitor', {
        body: visitorData
      });

      if (error) {
        console.error('Visitor tracking error:', error);
      } else {
        console.log('Visitor tracked:', data);
        hasTracked.current = true;
      }
    } catch (error) {
      console.error('Failed to track visitor:', error);
    }
  };

  // Track page view
  const trackPageView = (path?: string) => {
    if (!shouldTrack()) return;
    
    hasTracked.current = false; // Allow tracking for new page
    trackVisitor({ 
      page_path: path || window.location.pathname 
    });
  };

  // Update session duration
  const updateSessionDuration = async () => {
    if (!shouldTrack() || !sessionId.current) return;

    try {
      const sessionDuration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
      
      await supabase.functions.invoke('track-visitor', {
        body: {
          page_path: window.location.pathname,
          user_agent: navigator.userAgent,
          session_id: sessionId.current,
          session_duration: sessionDuration,
          user_role: profile?.role
        }
      });
    } catch (error) {
      console.error('Failed to update session duration:', error);
    }
  };

  useEffect(() => {
    // Only track after profile is determined (either loaded or confirmed null for anonymous users)
    if (profile !== undefined) {
      // Track initial page load
      trackVisitor();
    }

    // Track when user leaves the page
    const handleBeforeUnload = () => {
      updateSessionDuration();
    };

    // Update session periodically
    const sessionInterval = setInterval(updateSessionDuration, 30000); // Every 30 seconds

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearInterval(sessionInterval);
    };
  }, [profile]); // Re-run when profile changes

  return {
    trackPageView,
    updateSessionDuration,
    getSessionId: () => sessionId.current
  };
};