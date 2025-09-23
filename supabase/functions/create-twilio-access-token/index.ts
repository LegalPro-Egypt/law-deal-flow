import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccessTokenRequest {
  caseId: string;
  sessionType: 'video' | 'voice' | 'chat';
  participantRole: 'client' | 'lawyer';
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

    const { caseId, sessionType, participantRole }: AccessTokenRequest = await req.json();
    console.log('Creating access token for:', { caseId, sessionType, participantRole, userId: user.id });

    // Verify user has access to this case
    const { data: caseData, error: caseError } = await supabaseClient
      .from('cases')
      .select('*')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      console.error('Case access error:', caseError);
      return new Response('Case not found', { status: 404, headers: corsHeaders });
    }

    // Check if user is authorized for this case
    const isAuthorized = caseData.user_id === user.id || caseData.assigned_lawyer_id === user.id;
    if (!isAuthorized) {
      return new Response('Unauthorized for this case', { status: 403, headers: corsHeaders });
    }

    // Create or get existing communication session
    const roomName = `case-${caseId}-${sessionType}-${Date.now()}`;
    
    // For chat sessions, create or reuse conversation
    let conversationSid = null;
    if (sessionType === 'chat') {
      // Create Twilio Conversation for chat
      conversationSid = `case-${caseId}-chat`;
    }
    
    const { data: sessionData, error: sessionError } = await supabaseClient
      .from('communication_sessions')
      .insert({
        case_id: caseId,
        client_id: caseData.user_id,
        lawyer_id: caseData.assigned_lawyer_id,
        session_type: sessionType,
        room_name: roomName,
        twilio_conversation_sid: conversationSid,
        status: 'scheduled', // Always start as scheduled, becomes active when participants join
        scheduled_at: new Date().toISOString(),
        recording_enabled: true, // Always enable recording automatically
        recording_consent_client: true, // Auto-consent for admin review
        recording_consent_lawyer: true  // Auto-consent for admin review
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response('Failed to create session', { status: 500, headers: corsHeaders });
    }

    // Generate Twilio Access Token
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
    const twilioApiSecret = Deno.env.get('TWILIO_API_SECRET');

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
      console.error('Missing Twilio credentials');
      return new Response('Twilio configuration error', { status: 500, headers: corsHeaders });
    }

    // Create JWT token for Twilio access
    const identity = `${participantRole}-${user.id}`;
    const header = {
      "cty": "twilio-fpa;v=1",
      "typ": "JWT",
      "alg": "HS256"
    };

    const now = Math.floor(Date.now() / 1000);
    const grants: any = {
      "identity": identity
    };

    // Add appropriate grants based on session type
    if (sessionType === 'video' || sessionType === 'voice') {
      grants.video = {
        "room": roomName
      };
    } else if (sessionType === 'chat') {
      grants.chat = {
        "service_sid": conversationSid
      };
    }

    const payload = {
      "iss": twilioApiKey,
      "sub": twilioAccountSid,
      "nbf": now,
      "exp": now + 3600, // 1 hour
      "jti": `${twilioApiKey}-${now}`,
      "grants": grants
    };

    // Simple JWT creation (in production, use a proper JWT library)
    const base64UrlEncode = (obj: any) => {
      return btoa(JSON.stringify(obj))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    };

    const headerEncoded = base64UrlEncode(header);
    const payloadEncoded = base64UrlEncode(payload);
    const signature = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(twilioApiSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      new TextEncoder().encode(`${headerEncoded}.${payloadEncoded}`)
    );

    const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const accessToken = `${headerEncoded}.${payloadEncoded}.${signatureEncoded}`;

    // Update session with Twilio room details
    await supabaseClient
      .from('communication_sessions')
      .update({
        twilio_room_sid: roomName // Status will be updated by webhook when participants join
      })
      .eq('id', sessionData.id);

    // Start recording automatically when session is created
    try {
      await supabaseClient.functions.invoke('manage-twilio-recording', {
        body: {
          sessionId: sessionData.id,
          action: 'start'
        }
      });
      console.log('Auto-started recording for session:', sessionData.id);
    } catch (recordingError) {
      console.error('Failed to auto-start recording:', recordingError);
      // Continue even if recording fails to start
    }

    return new Response(JSON.stringify({
      accessToken,
      roomName,
      sessionId: sessionData.id,
      identity
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating access token:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});