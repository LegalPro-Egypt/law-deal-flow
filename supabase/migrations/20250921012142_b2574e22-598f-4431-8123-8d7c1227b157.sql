-- Add Twilio integration tables for video, voice, and chat communication

-- Create communication_sessions table for tracking all video/voice sessions
CREATE TABLE public.communication_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  lawyer_id UUID,
  session_type TEXT NOT NULL DEFAULT 'video' CHECK (session_type IN ('video', 'voice', 'chat')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended', 'failed')),
  twilio_room_sid TEXT,
  twilio_conversation_sid TEXT,
  room_name TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  recording_enabled BOOLEAN NOT NULL DEFAULT true,
  recording_consent_client BOOLEAN DEFAULT false,
  recording_consent_lawyer BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_recordings table for storing recording metadata
CREATE TABLE public.twilio_session_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_session_id UUID NOT NULL REFERENCES public.communication_sessions(id) ON DELETE CASCADE,
  twilio_recording_sid TEXT NOT NULL,
  recording_url TEXT,
  file_path TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  format TEXT DEFAULT 'mp4',
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session_participants table for tracking who joined sessions
CREATE TABLE public.twilio_session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  communication_session_id UUID NOT NULL REFERENCES public.communication_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  participant_identity TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('client', 'lawyer', 'admin')),
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  connection_quality TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add twilio_conversation_sid to existing conversations table for enhanced chat
ALTER TABLE public.conversations ADD COLUMN twilio_conversation_sid TEXT;

-- Enable RLS on all new tables
ALTER TABLE public.communication_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.twilio_session_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for communication_sessions
CREATE POLICY "Users can view their communication sessions" 
ON public.communication_sessions 
FOR SELECT 
USING (
  (auth.uid() = client_id) OR 
  (auth.uid() = lawyer_id) OR 
  has_admin_role()
);

CREATE POLICY "Users can create communication sessions" 
ON public.communication_sessions 
FOR INSERT 
WITH CHECK (
  (auth.uid() = client_id) OR 
  (auth.uid() = lawyer_id) OR 
  has_admin_role()
);

CREATE POLICY "Participants can update their sessions" 
ON public.communication_sessions 
FOR UPDATE 
USING (
  (auth.uid() = client_id) OR 
  (auth.uid() = lawyer_id) OR 
  has_admin_role()
);

CREATE POLICY "Admins can delete communication sessions" 
ON public.communication_sessions 
FOR DELETE 
USING (has_admin_role());

-- RLS policies for twilio_session_recordings
CREATE POLICY "Session participants can view recordings" 
ON public.twilio_session_recordings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.communication_sessions cs 
    WHERE cs.id = twilio_session_recordings.communication_session_id 
    AND (
      cs.client_id = auth.uid() OR 
      cs.lawyer_id = auth.uid() OR 
      has_admin_role()
    )
  )
);

CREATE POLICY "Admins can manage recordings" 
ON public.twilio_session_recordings 
FOR ALL 
USING (has_admin_role())
WITH CHECK (has_admin_role());

-- RLS policies for twilio_session_participants
CREATE POLICY "Users can view session participants" 
ON public.twilio_session_participants 
FOR SELECT 
USING (
  (user_id = auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.communication_sessions cs 
    WHERE cs.id = twilio_session_participants.communication_session_id 
    AND (
      cs.client_id = auth.uid() OR 
      cs.lawyer_id = auth.uid() OR 
      has_admin_role()
    )
  )
);

CREATE POLICY "System can manage session participants" 
ON public.twilio_session_participants 
FOR ALL 
USING (has_admin_role())
WITH CHECK (has_admin_role());

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_communication_sessions_updated_at
  BEFORE UPDATE ON public.communication_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_twilio_session_recordings_updated_at
  BEFORE UPDATE ON public.twilio_session_recordings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_communication_sessions_case_id ON public.communication_sessions(case_id);
CREATE INDEX idx_communication_sessions_client_id ON public.communication_sessions(client_id);
CREATE INDEX idx_communication_sessions_lawyer_id ON public.communication_sessions(lawyer_id);
CREATE INDEX idx_communication_sessions_status ON public.communication_sessions(status);
CREATE INDEX idx_twilio_session_recordings_session_id ON public.twilio_session_recordings(communication_session_id);
CREATE INDEX idx_twilio_session_participants_session_id ON public.twilio_session_participants(communication_session_id);
CREATE INDEX idx_twilio_session_participants_user_id ON public.twilio_session_participants(user_id);

-- Create a storage bucket for session recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('session-recordings', 'session-recordings', false);

-- Storage policies for session recordings
CREATE POLICY "Session participants can view their recordings" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'session-recordings' AND 
  EXISTS (
    SELECT 1 FROM public.communication_sessions cs 
    WHERE cs.twilio_room_sid = (storage.foldername(name))[1] 
    AND (
      cs.client_id = auth.uid() OR 
      cs.lawyer_id = auth.uid() OR 
      has_admin_role()
    )
  )
);

CREATE POLICY "System can upload session recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'session-recordings' AND 
  has_admin_role()
);

CREATE POLICY "Admins can manage session recordings" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'session-recordings' AND has_admin_role())
WITH CHECK (bucket_id = 'session-recordings' AND has_admin_role());