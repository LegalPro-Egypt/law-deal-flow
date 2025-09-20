-- Create video sessions table
CREATE TABLE public.video_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  livekit_room_id TEXT NOT NULL UNIQUE,
  room_name TEXT NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'consultation', -- consultation, hearing, meeting
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, active, ended, cancelled
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  lawyer_id UUID,
  client_id UUID NOT NULL,
  recording_enabled BOOLEAN NOT NULL DEFAULT true,
  recording_consent_lawyer BOOLEAN DEFAULT false,
  recording_consent_client BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session recordings table
CREATE TABLE public.session_recordings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_session_id UUID NOT NULL REFERENCES public.video_sessions(id) ON DELETE CASCADE,
  livekit_recording_id TEXT NOT NULL,
  recording_url TEXT,
  file_path TEXT,
  file_size BIGINT,
  duration_seconds INTEGER,
  format TEXT DEFAULT 'mp4',
  status TEXT NOT NULL DEFAULT 'processing', -- processing, ready, failed, deleted
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create session participants table
CREATE TABLE public.session_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_session_id UUID NOT NULL REFERENCES public.video_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  participant_identity TEXT NOT NULL,
  role TEXT NOT NULL, -- lawyer, client, admin
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  connection_quality TEXT, -- excellent, good, poor
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add livekit_room_id to conversations table
ALTER TABLE public.conversations 
ADD COLUMN livekit_room_id TEXT,
ADD COLUMN video_session_id UUID REFERENCES public.video_sessions(id);

-- Enable RLS
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for video_sessions
CREATE POLICY "Users can view their own video sessions" 
ON public.video_sessions 
FOR SELECT 
USING (
  auth.uid() = client_id OR 
  auth.uid() = lawyer_id OR 
  has_admin_role()
);

CREATE POLICY "Lawyers and clients can create video sessions" 
ON public.video_sessions 
FOR INSERT 
WITH CHECK (
  auth.uid() = client_id OR 
  auth.uid() = lawyer_id OR 
  has_admin_role()
);

CREATE POLICY "Participants can update their own sessions" 
ON public.video_sessions 
FOR UPDATE 
USING (
  auth.uid() = client_id OR 
  auth.uid() = lawyer_id OR 
  has_admin_role()
);

-- RLS Policies for session_recordings
CREATE POLICY "Admins can view all recordings" 
ON public.session_recordings 
FOR SELECT 
USING (has_admin_role());

CREATE POLICY "Session participants can view recordings" 
ON public.session_recordings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.video_sessions vs 
    WHERE vs.id = session_recordings.video_session_id 
    AND (vs.client_id = auth.uid() OR vs.lawyer_id = auth.uid())
  )
);

-- RLS Policies for session_participants
CREATE POLICY "Users can view session participants" 
ON public.session_participants 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.video_sessions vs 
    WHERE vs.id = session_participants.video_session_id 
    AND (vs.client_id = auth.uid() OR vs.lawyer_id = auth.uid())
  ) OR 
  has_admin_role()
);

-- Create indexes for performance
CREATE INDEX idx_video_sessions_case_id ON public.video_sessions(case_id);
CREATE INDEX idx_video_sessions_livekit_room_id ON public.video_sessions(livekit_room_id);
CREATE INDEX idx_video_sessions_status ON public.video_sessions(status);
CREATE INDEX idx_session_recordings_video_session_id ON public.session_recordings(video_session_id);
CREATE INDEX idx_session_participants_video_session_id ON public.session_participants(video_session_id);
CREATE INDEX idx_session_participants_user_id ON public.session_participants(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_video_sessions_updated_at
BEFORE UPDATE ON public.video_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_session_recordings_updated_at
BEFORE UPDATE ON public.session_recordings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();