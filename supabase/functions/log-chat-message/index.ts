import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessageRequest {
  sessionId: string;
  caseId: string;
  role: 'client' | 'lawyer' | 'system';
  content: string;
  messageType?: 'text' | 'file' | 'system';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the user from the JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { sessionId, caseId, role, content, messageType = 'text' }: ChatMessageRequest = await req.json();
    console.log('Logging chat message:', { sessionId, caseId, role, messageType });

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('user_id, assigned_lawyer_id')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      console.error('Case not found:', caseError);
      return new Response('Case not found', { status: 404, headers: corsHeaders });
    }

    const isAuthorized = 
      caseData.user_id === user.id ||
      caseData.assigned_lawyer_id === user.id;

    if (!isAuthorized) {
      return new Response('Unauthorized', { status: 403, headers: corsHeaders });
    }

    // Log the message to case_messages table for admin review
    const { data: messageData, error: messageError } = await supabaseClient
      .from('case_messages')
      .insert({
        case_id: caseId,
        role,
        content,
        message_type: messageType,
        metadata: {
          session_id: sessionId,
          timestamp: new Date().toISOString(),
          user_id: user.id,
          auto_logged: true
        }
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error logging message:', messageError);
      return new Response('Failed to log message', { status: 500, headers: corsHeaders });
    }

    console.log('Message logged successfully:', messageData.id);

    return new Response(JSON.stringify({
      success: true,
      messageId: messageData.id,
      message: 'Chat message logged for admin review'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error logging chat message:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});