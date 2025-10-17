import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

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
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              if (error) {
                console.error('useAuth: Profile fetch error:', error);
                setProfile(null);
              } else if (profileData) {
                // Fetch role from secure user_roles table
                const { data: roleData } = await supabase
                  .from('user_roles')
                  .select('role')
                  .eq('user_id', session.user.id)
                  .maybeSingle();
                
                // Override profile role with secure role from user_roles
                const secureProfile = {
                  ...profileData,
                  role: roleData?.role || 'client'
                };
                
                console.log('useAuth: Profile loaded with secure role:', secureProfile);
                setProfile(secureProfile);
              } else {
                // No profile exists, create a profile
                console.log('useAuth: No profile found, creating profile');
                const { data: newProfile, error: createError } = await supabase
                  .from('profiles')
                  .insert({
                    user_id: session.user.id,
                    email: session.user.email || '',
                    role: 'client',
                    first_name: session.user.user_metadata?.first_name || '',
                    last_name: session.user.user_metadata?.last_name || ''
                  })
                  .select()
                  .single();
                
                if (createError) {
                  console.error('useAuth: Profile creation error:', createError);
                  setProfile(null);
                } else {
                  // Create default client role in user_roles table
                  await supabase
                    .from('user_roles')
                    .insert({
                      user_id: session.user.id,
                      role: 'client'
                    })
                    .select()
                    .maybeSingle();
                  
                  console.log('useAuth: Profile created:', newProfile);
                  setProfile(newProfile);
                }
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
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();
              
            if (profileError) {
              console.error('useAuth: Initial profile fetch error:', profileError);
              setProfile(null);
            } else if (profileData) {
              // Fetch role from secure user_roles table
              const { data: roleData } = await supabase
                .from('user_roles')
                .select('role')
                .eq('user_id', session.user.id)
                .maybeSingle();
              
              // Override profile role with secure role from user_roles
              const secureProfile = {
                ...profileData,
                role: roleData?.role || 'client'
              };
              
              console.log('useAuth: Initial profile loaded with secure role:', secureProfile);
              setProfile(secureProfile);
            } else {
              // No profile exists, create a profile
              console.log('useAuth: No initial profile found, creating profile');
              const { data: newProfile, error: createError } = await supabase
                .from('profiles')
                .insert({
                  user_id: session.user.id,
                  email: session.user.email || '',
                  role: 'client',
                  first_name: session.user.user_metadata?.first_name || '',
                  last_name: session.user.user_metadata?.last_name || ''
                })
                .select()
                .single();
              
              if (createError) {
                console.error('useAuth: Initial profile creation error:', createError);
                setProfile(null);
              } else {
                // Create default client role in user_roles table
                await supabase
                  .from('user_roles')
                  .insert({
                    user_id: session.user.id,
                    role: 'client'
                  })
                  .select()
                  .maybeSingle();
                
                console.log('useAuth: Initial profile created:', newProfile);
                setProfile(newProfile);
              }
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
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