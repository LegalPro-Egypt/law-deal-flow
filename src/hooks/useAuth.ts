import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  role: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('useAuth: Setting up auth state listener');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('useAuth: Auth state change', event, !!session);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only fetch profile on sign in or token refresh events
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          // Defer profile fetching to prevent auth callback deadlocks
          setTimeout(async () => {
            try {
              console.log('useAuth: Fetching profile for user', session.user.id);
              const { data: profileData, error } = await supabase
                .from('profiles')
                .select('role, first_name, last_name, email')
                .eq('user_id', session.user.id)
                .single();
              
              if (error) {
                console.error('useAuth: Profile fetch error:', error);
                setProfile(null);
              } else {
                console.log('useAuth: Profile loaded:', profileData);
                setProfile(profileData);
              }
            } catch (error) {
              console.error('useAuth: Profile fetch exception:', error);
              setProfile(null);
            }
          }, 0);
        } else if (!session) {
          setProfile(null);
        }
      }
    );

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('useAuth: Getting initial session');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('useAuth: Session fetch error:', error);
          setLoading(false);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            console.log('useAuth: Fetching initial profile for user', session.user.id);
            const { data: profileData, error: profileError } = await supabase
              .from('profiles')
              .select('role, first_name, last_name, email')
              .eq('user_id', session.user.id)
              .single();
              
            if (profileError) {
              console.error('useAuth: Initial profile fetch error:', profileError);
              setProfile(null);
            } else {
              console.log('useAuth: Initial profile loaded:', profileData);
              setProfile(profileData);
            }
          } catch (error) {
            console.error('useAuth: Initial profile fetch exception:', error);
            setProfile(null);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error('useAuth: Initialize auth exception:', error);
        setLoading(false);
      }
    };

    initializeAuth();

    // Timeout fallback to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.warn('useAuth: Timeout reached, forcing loading to false');
      setLoading(false);
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    session,
    profile,
    loading,
    signOut,
    isAuthenticated: !!session,
    role: profile?.role
  };
};