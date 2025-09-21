import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecordingRequest {
  sessionId: string;
  action: 'start' | 'stop' | 'pause' | 'resume';
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

    const { sessionId, action }: RecordingRequest = await req.json();
    console.log('Managing recording:', { sessionId, action, userId: user.id });

    // Get session details
    const { data: session, error: sessionError } = await supabaseClient
      .from('communication_sessions')
      .select(`
        *,
        cases!inner (
          id,
          user_id,
          assigned_lawyer_id
        )
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      return new Response('Session not found', { status: 404, headers: corsHeaders });
    }

    // Check authorization
    const isAuthorized = 
      session.cases.user_id === user.id ||
      session.cases.assigned_lawyer_id === user.id;

    if (!isAuthorized) {
      return new Response('Unauthorized', { status: 403, headers: corsHeaders });
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioAccountSid || !twilioAuthToken) {
      console.error('Missing Twilio credentials');
      return new Response('Twilio configuration error', { status: 500, headers: corsHeaders });
    }

    // Create Twilio API authentication header
    const authHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

    let response;
    switch (action) {
      case 'start':
        // Start recording for the room
        if (!session.twilio_room_sid) {
          return new Response('Room not active', { status: 400, headers: corsHeaders });
        }

        response = await fetch(
          `https://video.twilio.com/v1/Rooms/${session.twilio_room_sid}/Recordings`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${authHeader}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              'StatusCallback': `${Deno.env.get('SUPABASE_URL')}/functions/v1/twilio-webhooks`,
              'StatusCallbackMethod': 'POST'
            })
          }
        );

        if (!response.ok) {
          const error = await response.text();
          console.error('Failed to start recording:', error);
          return new Response('Failed to start recording', { status: 500, headers: corsHeaders });
        }

        const recordingData = await response.json();
        console.log('Recording started:', recordingData);

        // Update session to indicate recording is enabled
        await supabaseClient
          .from('communication_sessions')
          .update({ recording_enabled: true })
          .eq('id', sessionId);

        return new Response(JSON.stringify({
          success: true,
          recordingSid: recordingData.sid,
          message: 'Recording started'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'stop':
        // Stop all recordings for the room
        if (!session.twilio_room_sid) {
          return new Response('Room not active', { status: 400, headers: corsHeaders });
        }

        // Get active recordings for this room
        const recordingsResponse = await fetch(
          `https://video.twilio.com/v1/Rooms/${session.twilio_room_sid}/Recordings?Status=processing`,
          {
            headers: {
              'Authorization': `Basic ${authHeader}`,
            }
          }
        );

        if (!recordingsResponse.ok) {
          console.error('Failed to get recordings');
          return new Response('Failed to get recordings', { status: 500, headers: corsHeaders });
        }

        const recordings = await recordingsResponse.json();
        
        // Stop each active recording
        for (const recording of recordings.recordings || []) {
          await fetch(
            `https://video.twilio.com/v1/Rooms/${session.twilio_room_sid}/Recordings/${recording.sid}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${authHeader}`,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({
                'Status': 'stopped'
              })
            }
          );
        }

        // Update session
        await supabaseClient
          .from('communication_sessions')
          .update({ recording_enabled: false })
          .eq('id', sessionId);

        return new Response(JSON.stringify({
          success: true,
          message: 'Recording stopped'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response('Invalid action', { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error('Error managing recording:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});