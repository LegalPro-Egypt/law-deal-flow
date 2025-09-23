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

      if (!existing.room_name) {
        const { error: updateErr } = await supabaseClient
          .from('communication_sessions')
          .update({
            room_name: roomName,
            twilio_conversation_sid: conversationSid,
          })
          .eq('id', existing.id);
        if (updateErr) console.error('Failed to set room_name on existing session:', updateErr);
      }
    } else {
      // Try to reuse the latest scheduled session for this case
      const { data: existing, error: findErr } = await supabaseClient
        .from('communication_sessions')
        .select('*')
        .eq('case_id', caseId)
        .eq('status', 'scheduled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        sessionData = existing;
        roomName = existing.room_name || `case-${caseId}-${sessionType}-${Date.now()}`;
        if (!existing.room_name) {
          const { error: updateErr } = await supabaseClient
            .from('communication_sessions')
            .update({ room_name: roomName, twilio_conversation_sid: conversationSid })
            .eq('id', existing.id);
          if (updateErr) console.error('Failed to set room_name on reused session:', updateErr);
        }
      } else {
        // Create a fresh session
        roomName = `case-${caseId}-${sessionType}-${Date.now()}`;
        const { data: created, error: createErr } = await supabaseClient
          .from('communication_sessions')
          .insert({
            case_id: caseId,
            client_id: caseData.user_id,
            lawyer_id: caseData.assigned_lawyer_id,
            session_type: sessionType,
            room_name: roomName,
            twilio_conversation_sid: conversationSid,
            status: 'scheduled',
            scheduled_at: new Date().toISOString(),
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