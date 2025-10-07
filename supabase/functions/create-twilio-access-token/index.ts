import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Twilio from "npm:twilio@5.3.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AccessTokenRequest {
  caseId: string;
  sessionType: 'video' | 'voice' | 'chat';
  participantRole: 'client' | 'lawyer';
  sessionId?: string; // Optional: join existing session
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

    const { caseId, sessionType, participantRole, sessionId }: AccessTokenRequest = await req.json();
    console.log('Creating access token for:', { caseId, sessionType, participantRole, sessionId, userId: user.id });

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

    // Reuse existing session if provided or available, otherwise create one
    let sessionData: any = null;
    let roomName: string | null = null;
    let conversationSid: string | null = null;

    // sessionId already parsed above

    if (sessionType === 'chat') {
      conversationSid = `case-${caseId}-chat`;
    }

    if (sessionId) {
      // Join the existing session
      const { data: existing, error: fetchErr } = await supabaseClient
        .from('communication_sessions')
        .select('*')
        .eq('id', sessionId)
        .maybeSingle();

      if (fetchErr || !existing) {
        console.error('Session not found or inaccessible:', fetchErr);
        return new Response('Session not found', { status: 404, headers: corsHeaders });
      }

      // Verify membership
      if (![existing.client_id, existing.lawyer_id].includes(user.id)) {
        return new Response('Not a participant of this session', { status: 403, headers: corsHeaders });
      }

      sessionData = existing;
      roomName = existing.room_name || `case-${caseId}-${sessionType}-${Date.now()}`;
    } else {
      // Create a new active session immediately (no scheduled status)
      roomName = `case-${caseId}-${sessionType}-${Date.now()}`;
      const now = new Date().toISOString();
      
      const { data: created, error: createErr } = await supabaseClient
        .from('communication_sessions')
        .insert({
          case_id: caseId,
          client_id: caseData.user_id,
          lawyer_id: caseData.assigned_lawyer_id,
          session_type: sessionType,
          room_name: roomName,
          twilio_conversation_sid: conversationSid,
          status: 'active',
          started_at: now,
          recording_enabled: true,
          recording_consent_client: true,
          recording_consent_lawyer: true,
          initiated_by: user.id,
        })
        .select()
        .single();

      if (createErr) {
        console.error('Session creation error:', createErr);
        return new Response('Failed to create session', { status: 500, headers: corsHeaders });
      }
      sessionData = created;
    }

    // Generate Twilio Access Token
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioApiKey = Deno.env.get('TWILIO_API_KEY');
    const twilioApiSecret = Deno.env.get('TWILIO_API_SECRET');

    console.log('Twilio credentials check:', {
      hasAccountSid: !!twilioAccountSid,
      hasApiKey: !!twilioApiKey,
      hasApiSecret: !!twilioApiSecret,
      accountSidPrefix: twilioAccountSid?.substring(0, 4),
      apiKeyPrefix: twilioApiKey?.substring(0, 4)
    });

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
      console.error('Missing Twilio credentials:', {
        hasAccountSid: !!twilioAccountSid,
        hasApiKey: !!twilioApiKey,
        hasApiSecret: !!twilioApiSecret
      });
      return new Response(JSON.stringify({ 
        error: 'Twilio configuration error',
        details: 'Missing required Twilio credentials. Please check TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, and TWILIO_API_KEY_SECRET environment variables.'
      }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create Twilio Access Token using official SDK
    const identity = `${participantRole}-${user.id}`;
    
    try {
      const AccessToken = Twilio.jwt.AccessToken;
      const VideoGrant = AccessToken.VideoGrant;

      const token = new AccessToken(
        twilioAccountSid,
        twilioApiKey,
        twilioApiSecret,
        { identity: identity }
      );

      // Add appropriate grants based on session type
      if (sessionType === 'video' || sessionType === 'voice') {
        const videoGrant = new VideoGrant({
          room: roomName
        });
        token.addGrant(videoGrant);
        console.log('Added video grant for room:', roomName);
      } else if (sessionType === 'chat') {
        const ChatGrant = AccessToken.ChatGrant;
        const chatGrant = new ChatGrant({
          serviceSid: conversationSid
        });
        token.addGrant(chatGrant);
        console.log('Added chat grant for conversation:', conversationSid);
      }

      const accessToken = token.toJwt();
      console.log('Successfully generated access token for identity:', identity);

      // Update session with Twilio room details
      await supabaseClient
        .from('communication_sessions')
        .update({
          twilio_room_sid: roomName
        })
        .eq('id', sessionData.id);

      return new Response(JSON.stringify({
        accessToken,
        roomName,
        sessionId: sessionData.id,
        identity
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (tokenError) {
      console.error('Error generating Twilio token:', tokenError);
      return new Response(JSON.stringify({ 
        error: 'Failed to generate access token',
        details: tokenError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error creating access token:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});