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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const formData = await req.formData();
    const eventType = formData.get('StatusCallbackEvent') as string;
    const roomSid = formData.get('RoomSid') as string;
    const roomName = formData.get('RoomName') as string;
    const participantSid = formData.get('ParticipantSid') as string;
    const participantIdentity = formData.get('ParticipantIdentity') as string;
    
    console.log('Twilio webhook event:', { eventType, roomSid, roomName, participantSid, participantIdentity });

    switch (eventType) {
      case 'room-created':
        await handleRoomCreated(supabaseClient, roomSid, roomName);
        break;
      
      case 'room-ended':
        await handleRoomEnded(supabaseClient, roomSid);
        break;
      
      case 'participant-connected':
        await handleParticipantConnected(supabaseClient, roomName, participantSid, participantIdentity);
        break;
      
      case 'participant-disconnected':
        await handleParticipantDisconnected(supabaseClient, participantSid);
        break;
      
      case 'recording-started':
        await handleRecordingStarted(supabaseClient, formData);
        break;
      
      case 'recording-completed':
        await handleRecordingCompleted(supabaseClient, formData);
        break;
      
      default:
        console.log('Unhandled event type:', eventType);
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Error', { status: 500, headers: corsHeaders });
  }
});

async function handleRoomCreated(supabaseClient: any, roomSid: string, roomName: string) {
  console.log('Handling room created:', { roomSid, roomName });
  
  const { error } = await supabaseClient
    .from('communication_sessions')
    .update({
      twilio_room_sid: roomSid,
      started_at: new Date().toISOString(),
      status: 'active'
    })
    .eq('room_name', roomName);

  if (error) {
    console.error('Error updating session on room created:', error);
  }
}

async function handleRoomEnded(supabaseClient: any, roomSid: string) {
  console.log('Handling room ended:', { roomSid });
  
  const endTime = new Date().toISOString();
  
  // Get session to calculate duration
  const { data: session } = await supabaseClient
    .from('communication_sessions')
    .select('started_at')
    .eq('twilio_room_sid', roomSid)
    .single();

  let duration = null;
  if (session?.started_at) {
    const startTime = new Date(session.started_at);
    const endTimeObj = new Date(endTime);
    duration = Math.floor((endTimeObj.getTime() - startTime.getTime()) / 1000);
  }

  const { error } = await supabaseClient
    .from('communication_sessions')
    .update({
      ended_at: endTime,
      duration_seconds: duration,
      status: 'ended'
    })
    .eq('twilio_room_sid', roomSid);

  if (error) {
    console.error('Error updating session on room ended:', error);
  }
}

async function handleParticipantConnected(
  supabaseClient: any, 
  roomName: string, 
  participantSid: string, 
  participantIdentity: string
) {
  console.log('Handling participant connected:', { roomName, participantSid, participantIdentity });
  
  // Get session ID from room name
  const { data: session } = await supabaseClient
    .from('communication_sessions')
    .select('id, client_id, lawyer_id')
    .eq('room_name', roomName)
    .single();

  if (!session) {
    console.error('Session not found for room:', roomName);
    return;
  }

  // Extract user ID and role from participant identity
  const [role, userId] = participantIdentity.split('-');
  
  const { error } = await supabaseClient
    .from('twilio_session_participants')
    .insert({
      communication_session_id: session.id,
      user_id: userId,
      participant_identity: participantIdentity,
      role: role,
      joined_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error inserting participant:', error);
    return;
  }

  // Check if this makes the session active (both client and lawyer joined)
  const { data: participants } = await supabaseClient
    .from('twilio_session_participants')
    .select('role')
    .eq('communication_session_id', session.id)
    .is('left_at', null);

  const hasClient = participants?.some(p => p.role === 'client');
  const hasLawyer = participants?.some(p => p.role === 'lawyer');

  // If both client and lawyer are present, activate the session
  if (hasClient && hasLawyer) {
    await supabaseClient
      .from('communication_sessions')
      .update({
        status: 'active',
        started_at: new Date().toISOString()
      })
      .eq('id', session.id);
    console.log('Session activated - both participants joined:', session.id);
  }
}
}

async function handleParticipantDisconnected(supabaseClient: any, participantSid: string) {
  console.log('Handling participant disconnected:', { participantSid });
  
  const leftTime = new Date().toISOString();
  
  // Update participant record
  const { data: participant } = await supabaseClient
    .from('twilio_session_participants')
    .select('joined_at, communication_session_id')
    .eq('participant_identity', participantSid)
    .single();

  let duration = null;
  if (participant?.joined_at) {
    const joinTime = new Date(participant.joined_at);
    const leftTimeObj = new Date(leftTime);
    duration = Math.floor((leftTimeObj.getTime() - joinTime.getTime()) / 1000);
  }

  const { error } = await supabaseClient
    .from('twilio_session_participants')
    .update({
      left_at: leftTime,
      duration_seconds: duration
    })
    .eq('participant_identity', participantSid);

  if (error) {
    console.error('Error updating participant on disconnect:', error);
    return;
  }

  // Check if any participants are still active
  if (participant?.communication_session_id) {
    const { data: activeParticipants } = await supabaseClient
      .from('twilio_session_participants')
      .select('id')
      .eq('communication_session_id', participant.communication_session_id)
      .is('left_at', null);

    // If no active participants, mark session as ended
    if (!activeParticipants || activeParticipants.length === 0) {
      await supabaseClient
        .from('communication_sessions')
        .update({
          status: 'ended',
          ended_at: leftTime
        })
        .eq('id', participant.communication_session_id);
      console.log('Session ended - all participants left:', participant.communication_session_id);
    }
  }
}
}

async function handleRecordingStarted(supabaseClient: any, formData: FormData) {
  const recordingSid = formData.get('RecordingSid') as string;
  const roomSid = formData.get('RoomSid') as string;
  
  console.log('Handling recording started:', { recordingSid, roomSid });
  
  // Get session ID
  const { data: session } = await supabaseClient
    .from('communication_sessions')
    .select('id')
    .eq('twilio_room_sid', roomSid)
    .single();

  if (!session) {
    console.error('Session not found for recording start:', roomSid);
    return;
  }

  const { error } = await supabaseClient
    .from('twilio_session_recordings')
    .insert({
      communication_session_id: session.id,
      twilio_recording_sid: recordingSid,
      status: 'processing',
      started_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error inserting recording:', error);
  }
}

async function handleRecordingCompleted(supabaseClient: any, formData: FormData) {
  const recordingSid = formData.get('RecordingSid') as string;
  const recordingUrl = formData.get('MediaUrl') as string;
  const duration = formData.get('RecordingDuration') as string;
  const size = formData.get('RecordingSize') as string;
  
  console.log('Handling recording completed:', { recordingSid, recordingUrl, duration, size });
  
  const { error } = await supabaseClient
    .from('twilio_session_recordings')
    .update({
      recording_url: recordingUrl,
      duration_seconds: duration ? parseInt(duration) : null,
      file_size: size ? parseInt(size) : null,
      status: 'completed',
      completed_at: new Date().toISOString()
    })
    .eq('twilio_recording_sid', recordingSid);

  if (error) {
    console.error('Error updating recording on completion:', error);
  }
}