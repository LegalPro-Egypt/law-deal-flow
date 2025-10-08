import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const dailyApiKey = Deno.env.get('DAILY_API_KEY');

    if (!dailyApiKey) {
      throw new Error('DAILY_API_KEY is not configured');
    }

    // Get authorization token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Create Supabase client with user's auth
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get user from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request body
    const { caseId, sessionType } = await req.json();
    
    if (!caseId || !sessionType) {
      throw new Error('Missing caseId or sessionType');
    }

    if (!['video', 'voice'].includes(sessionType)) {
      throw new Error('Invalid sessionType. Must be "video" or "voice"');
    }

    console.log(`Creating ${sessionType} call for case ${caseId} by user ${user.id}`);

    // Validate user has access to the case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, user_id, assigned_lawyer_id')
      .eq('id', caseId)
      .single();

    if (caseError || !caseData) {
      throw new Error('Case not found');
    }

    if (caseData.user_id !== user.id && caseData.assigned_lawyer_id !== user.id) {
      throw new Error('Unauthorized access to case');
    }

    // Create Daily.co room
    const roomName = `case-${caseId}-${Date.now()}`;
    const dailyResponse = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          max_participants: 2,
          exp: Math.floor(Date.now() / 1000) + 7200, // 2 hours
          enable_chat: true,
          enable_recording: 'cloud',
          enable_screenshare: sessionType === 'video',
          start_audio_off: false,
          start_video_off: sessionType === 'voice',
        },
      }),
    });

    if (!dailyResponse.ok) {
      const errorText = await dailyResponse.text();
      console.error('Daily.co API error:', errorText);
      throw new Error(`Failed to create Daily.co room: ${dailyResponse.statusText}`);
    }

    const dailyRoom = await dailyResponse.json();
    console.log('Daily.co room created:', dailyRoom.name);

    // Insert session record
    const { data: session, error: sessionError } = await supabase
      .from('communication_sessions')
      .insert({
        case_id: caseId,
        room_name: dailyRoom.name,
        room_url: dailyRoom.url,
        session_type: sessionType,
        status: 'pending',
        initiated_by: user.id,
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      throw new Error('Failed to create session record');
    }

    console.log('Session created:', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        roomUrl: dailyRoom.url,
        roomName: dailyRoom.name,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in daily-room function:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});