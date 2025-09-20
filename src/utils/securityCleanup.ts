import { supabase } from '@/integrations/supabase/client';

/**
 * Security utility functions for data cleanup and privacy protection
 */

/**
 * Cleanup old anonymous sessions to protect user privacy
 * Removes sessions older than 30 days and their associated conversations
 */
export const cleanupOldAnonymousSessions = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Call the database function to cleanup old sessions
    const { error } = await supabase.rpc('cleanup_old_anonymous_sessions');
    
    if (error) {
      console.error('Error cleaning up anonymous sessions:', error);
      return {
        success: false,
        message: `Failed to cleanup anonymous sessions: ${error.message}`
      };
    }

    return {
      success: true,
      message: 'Successfully cleaned up old anonymous sessions'
    };
  } catch (error) {
    console.error('Exception during cleanup:', error);
    return {
      success: false,
      message: `Cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Check if the current user has admin privileges
 * This is a security helper that should be used carefully
 */
export const isCurrentUserAdmin = (profile: any): boolean => {
  return profile?.role === 'admin';
};

/**
 * Validate that admin operations are authorized
 * Returns true only if user is authenticated admin
 */
export const validateAdminAccess = (profile: any, session: any): boolean => {
  if (!session || !profile) {
    console.warn('Admin access denied: No session or profile');
    return false;
  }

  if (profile.role !== 'admin') {
    console.warn('Admin access denied: User is not admin');
    return false;
  }

  return true;
};