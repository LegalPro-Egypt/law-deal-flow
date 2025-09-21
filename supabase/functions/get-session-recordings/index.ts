import "https://deno.land/x/xhr@0.1.0/mod.ts";
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

    const url = new URL(req.url);
    const caseId = url.searchParams.get('caseId');
    const sessionId = url.searchParams.get('sessionId');
    const recordingId = url.searchParams.get('recordingId');

    console.log('Getting recordings for:', { caseId, sessionId, recordingId, userId: user.id });

    if (recordingId) {
      // Get specific recording
      const { data: recording, error: recordingError } = await supabaseClient
        .from('twilio_session_recordings')
        .select(`
          *,
          communication_sessions!inner (
            id,
            case_id,
            client_id,
            lawyer_id,
            cases!inner (
              id,
              user_id,
              assigned_lawyer_id
            )
          )
        `)
        .eq('id', recordingId)
        .single();

      if (recordingError || !recording) {
        console.error('Recording not found:', recordingError);
        return new Response('Recording not found', { status: 404, headers: corsHeaders });
      }

      // Check authorization
      const isAuthorized = 
        recording.communication_sessions.cases.user_id === user.id ||
        recording.communication_sessions.cases.assigned_lawyer_id === user.id;

      if (!isAuthorized) {
        return new Response('Unauthorized', { status: 403, headers: corsHeaders });
      }

      // Generate signed URL for the recording if it's stored in Supabase storage
      let signedUrl = recording.recording_url;
      if (recording.file_path) {
        const { data: urlData } = await supabaseClient.storage
          .from('session-recordings')
          .createSignedUrl(recording.file_path, 3600); // 1 hour expiry
        
        if (urlData?.signedUrl) {
          signedUrl = urlData.signedUrl;
        }
      }

      return new Response(JSON.stringify({
        ...recording,
        signed_url: signedUrl
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (sessionId) {
      // Get recordings for specific session
      const { data: recordings, error: recordingsError } = await supabaseClient
        .from('twilio_session_recordings')
        .select(`
          *,
          communication_sessions!inner (
            id,
            case_id,
            client_id,
            lawyer_id,
            cases!inner (
              id,
              user_id,
              assigned_lawyer_id
            )
          )
        `)
        .eq('communication_session_id', sessionId);

      if (recordingsError) {
        console.error('Error fetching session recordings:', recordingsError);
        return new Response('Error fetching recordings', { status: 500, headers: corsHeaders });
      }

      // Filter recordings user has access to
      const authorizedRecordings = recordings?.filter(recording => 
        recording.communication_sessions.cases.user_id === user.id ||
        recording.communication_sessions.cases.assigned_lawyer_id === user.id
      ) || [];

      return new Response(JSON.stringify(authorizedRecordings), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else if (caseId) {
      // Get all recordings for a case
      const { data: recordings, error: recordingsError } = await supabaseClient
        .from('twilio_session_recordings')
        .select(`
          *,
          communication_sessions!inner (
            id,
            case_id,
            client_id,
            lawyer_id,
            session_type,
            started_at,
            ended_at,
            cases!inner (
              id,
              user_id,
              assigned_lawyer_id,
              case_number,
              title
            )
          )
        `)
        .eq('communication_sessions.case_id', caseId)
        .order('created_at', { ascending: false });

      if (recordingsError) {
        console.error('Error fetching case recordings:', recordingsError);
        return new Response('Error fetching recordings', { status: 500, headers: corsHeaders });
      }

      // Filter recordings user has access to
      const authorizedRecordings = recordings?.filter(recording => 
        recording.communication_sessions.cases.user_id === user.id ||
        recording.communication_sessions.cases.assigned_lawyer_id === user.id
      ) || [];

      return new Response(JSON.stringify(authorizedRecordings), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // Get all recordings for the user
      const { data: recordings, error: recordingsError } = await supabaseClient
        .from('twilio_session_recordings')
        .select(`
          *,
          communication_sessions!inner (
            id,
            case_id,
            client_id,
            lawyer_id,
            session_type,
            started_at,
            ended_at,
            cases!inner (
              id,
              user_id,
              assigned_lawyer_id,
              case_number,
              title
            )
          )
        `)
        .or(`communication_sessions.client_id.eq.${user.id},communication_sessions.lawyer_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (recordingsError) {
        console.error('Error fetching user recordings:', recordingsError);
        return new Response('Error fetching recordings', { status: 500, headers: corsHeaders });
      }

      return new Response(JSON.stringify(recordings || []), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in get-session-recordings:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});