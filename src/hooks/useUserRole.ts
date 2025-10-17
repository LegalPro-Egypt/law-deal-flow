import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'lawyer' | 'client';

export const useUserRole = (userId?: string) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        // Fetch from user_roles table (secure)
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;
        
        // User has explicit role in user_roles table
        if (data) {
          setRole(data.role as UserRole);
        } else {
          // No explicit role = default to client
          setRole('client');
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setRole('client'); // Safe default
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [userId]);

  return { role, loading };
};
