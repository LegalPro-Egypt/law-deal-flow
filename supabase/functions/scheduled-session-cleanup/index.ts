import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting scheduled session cleanup...');
    
    // Call the database cleanup function
    const { error: cleanupError } = await supabaseClient.rpc('cleanup_stale_communication_sessions');
    
    if (cleanupError) {
      console.error('Cleanup error:', cleanupError);
      throw cleanupError;
    }

    // Get statistics of cleaned up sessions
    const { data: stats } = await supabaseClient
      .from('communication_sessions')
      .select('status, created_at')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false });

    const recentStats = {
      total: stats?.length || 0,
      active: stats?.filter(s => s.status === 'active').length || 0,
      ended: stats?.filter(s => s.status === 'ended').length || 0,
      failed: stats?.filter(s => s.status === 'failed').length || 0,
      scheduled: stats?.filter(s => s.status === 'scheduled').length || 0
    };

    console.log('Session cleanup completed. Recent stats:', recentStats);
    
    // Optional: Cleanup old recordings metadata (keep recordings older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { error: recordingCleanupError } = await supabaseClient
      .from('twilio_session_recordings')
      .delete()
      .lt('created_at', thirtyDaysAgo)
      .eq('status', 'completed');

    if (recordingCleanupError) {
      console.warn('Recording cleanup warning:', recordingCleanupError);
    } else {
      console.log('Old recording metadata cleaned up successfully');
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Scheduled cleanup completed successfully',
      timestamp: new Date().toISOString(),
      stats: recentStats
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Scheduled cleanup error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
