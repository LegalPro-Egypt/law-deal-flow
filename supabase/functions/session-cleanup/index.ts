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

    // Handle POST requests for emergency session cleanup
    if (req.method === 'POST') {
      const { sessionId } = await req.json();
      
      if (sessionId) {
        console.log('Emergency session cleanup for:', sessionId);
        
        const { error } = await supabaseClient
          .from('communication_sessions')
          .update({
            status: 'ended',
            ended_at: new Date().toISOString()
          })
          .eq('id', sessionId)
          .eq('status', 'active');

        if (error) {
          console.error('Error in emergency cleanup:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Handle GET requests for scheduled cleanup
    console.log('Running scheduled session cleanup...');
    
    const { error } = await supabaseClient.rpc('cleanup_stale_communication_sessions');
    
    if (error) {
      console.error('Cleanup error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Session cleanup completed successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Session cleanup completed',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Session cleanup error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});