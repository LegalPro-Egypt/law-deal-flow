import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VisitorData {
  page_path: string;
  referrer_url?: string;
  user_agent: string;
  session_id: string;
  session_duration?: number;
  user_role?: string;
  screen_resolution?: string;
  timezone?: string;
  language_preferences?: string[];
  // Enhanced human verification data
  mouse_activity?: boolean;
  scroll_behavior?: boolean;
  touch_events?: boolean;
  canvas_fingerprint?: string;
  webgl_fingerprint?: string;
  javascript_enabled?: boolean;
  local_storage_enabled?: boolean;
  cookie_enabled?: boolean;
  // Page view tracking
  page_views_in_session?: number;
  time_on_page?: number;
  navigation_flow?: string[];
}

export const useVisitorTracking = (profile?: { role?: string } | null) => {
  const sessionStartTime = useRef<number>(Date.now());
  const sessionId = useRef<string>('');
  const hasTracked = useRef<boolean>(false);
  const pageViews = useRef<number>(0);
  const navigationFlow = useRef<string[]>([]);
  const lastPageTime = useRef<number>(Date.now());
  
  // Human verification indicators
  const mouseActivity = useRef<boolean>(false);
  const scrollActivity = useRef<boolean>(false);
  const touchActivity = useRef<boolean>(false);

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

  // Enhanced human verification functions
  const generateCanvasFingerprint = (): string => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no-canvas';
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Human verification test 🤖', 2, 2);
      return canvas.toDataURL().slice(-50);
    } catch {
      return 'canvas-error';
    }
  };

  const generateWebGLFingerprint = (): string => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no-webgl';
      
      // Cast to WebGLRenderingContext to access WebGL-specific properties
      const webgl = gl as WebGLRenderingContext;
      const renderer = webgl.getParameter(webgl.RENDERER);
      const vendor = webgl.getParameter(webgl.VENDOR);
      return btoa((renderer + vendor).slice(0, 30));
    } catch {
      return 'webgl-error';
    }
  };

  const detectCapabilities = () => {
    return {
      javascript_enabled: true, // If this runs, JS is enabled
      local_storage_enabled: (() => {
        try {
          localStorage.setItem('test', 'test');
          localStorage.removeItem('test');
          return true;
        } catch {
          return false;
        }
      })(),
      cookie_enabled: navigator.cookieEnabled,
      canvas_fingerprint: generateCanvasFingerprint(),
      webgl_fingerprint: generateWebGLFingerprint()
    };
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

  // Track visitor data with enhanced verification
  const trackVisitor = async (additionalData?: Partial<VisitorData>) => {
    if (!shouldTrack()) {
      return;
    }

    try {
      const currentTime = Date.now();
      const sessionDuration = Math.floor((currentTime - sessionStartTime.current) / 1000);
      const timeOnPage = Math.floor((currentTime - lastPageTime.current) / 1000);
      
      // Update page views and navigation flow
      pageViews.current++;
      const currentPath = window.location.pathname;
      navigationFlow.current.push(currentPath);
      
      // Keep navigation flow reasonable in size
      if (navigationFlow.current.length > 20) {
        navigationFlow.current = navigationFlow.current.slice(-20);
      }
      
      const capabilities = detectCapabilities();
      
      const visitorData: VisitorData = {
        page_path: currentPath,
        referrer_url: document.referrer || undefined,
        user_agent: navigator.userAgent,
        session_id: getSessionId(),
        session_duration: sessionDuration,
        user_role: profile?.role,
        screen_resolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language_preferences: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
        
        // Enhanced human verification data
        mouse_activity: mouseActivity.current,
        scroll_behavior: scrollActivity.current,
        touch_events: touchActivity.current,
        page_views_in_session: pageViews.current,
        time_on_page: timeOnPage,
        navigation_flow: [...navigationFlow.current],
        
        ...capabilities,
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
      
      lastPageTime.current = currentTime;
    } catch (error) {
      console.error('Failed to track visitor:', error);
    }
  };

  // Track page view
  const trackPageView = (path?: string) => {
    if (!shouldTrack()) return;
    
    hasTracked.current = false; // Allow tracking for new page
    lastPageTime.current = Date.now(); // Reset page timer
    trackVisitor({ 
      page_path: path || window.location.pathname 
    });
  };

  // Update session duration with enhanced verification
  const updateSessionDuration = async () => {
    if (!shouldTrack() || !sessionId.current) return;

    try {
      const currentTime = Date.now();
      const sessionDuration = Math.floor((currentTime - sessionStartTime.current) / 1000);
      const capabilities = detectCapabilities();
      
      await supabase.functions.invoke('track-visitor', {
        body: {
          page_path: window.location.pathname,
          user_agent: navigator.userAgent,
          session_id: sessionId.current,
          session_duration: sessionDuration,
          user_role: profile?.role,
          screen_resolution: `${screen.width}x${screen.height}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language_preferences: navigator.languages ? Array.from(navigator.languages) : [navigator.language],
          
          // Enhanced human verification data
          mouse_activity: mouseActivity.current,
          scroll_behavior: scrollActivity.current,
          touch_events: touchActivity.current,
          page_views_in_session: pageViews.current,
          time_on_page: Math.floor((currentTime - lastPageTime.current) / 1000),
          navigation_flow: [...navigationFlow.current],
          
          ...capabilities
        }
      });
    } catch (error) {
      console.error('Failed to update session duration:', error);
    }
  };

  useEffect(() => {
    // Human activity detection
    const handleMouseMove = () => {
      mouseActivity.current = true;
    };

    const handleScroll = () => {
      scrollActivity.current = true;
    };

    const handleTouch = () => {
      touchActivity.current = true;
    };

    // Only track after profile is determined (either loaded or confirmed null for anonymous users)
    if (profile !== undefined) {
      // Track initial page load
      trackVisitor();
      
      // Set up human activity listeners
      document.addEventListener('mousemove', handleMouseMove, { passive: true });
      document.addEventListener('scroll', handleScroll, { passive: true });
      document.addEventListener('touchstart', handleTouch, { passive: true });
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
      
      // Clean up activity listeners
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('scroll', handleScroll);
      document.removeEventListener('touchstart', handleTouch);
    };
  }, [profile]); // Re-run when profile changes

  return {
    trackPageView,
    updateSessionDuration,
    getSessionId: () => sessionId.current
  };
};