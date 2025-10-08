-- Create communication_sessions table for Daily.co video/voice calls
CREATE TABLE IF NOT EXISTS public.communication_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  room_name TEXT NOT NULL,
  room_url TEXT NOT NULL,
  session_type TEXT NOT NULL CHECK (session_type IN ('video', 'voice')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'ended', 'declined')),
  initiated_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  initiated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.communication_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for clients to view their sessions
CREATE POLICY "Clients can view sessions from their cases"
ON public.communication_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = communication_sessions.case_id
    AND cases.user_id = auth.uid()
  )
);

-- Create policies for lawyers to view sessions from assigned cases
CREATE POLICY "Lawyers can view sessions from assigned cases"
ON public.communication_sessions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = communication_sessions.case_id
    AND cases.assigned_lawyer_id = auth.uid()
  )
);

-- Create policies for users to create sessions for their cases
CREATE POLICY "Users can create sessions for their cases"
ON public.communication_sessions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = communication_sessions.case_id
    AND (cases.user_id = auth.uid() OR cases.assigned_lawyer_id = auth.uid())
  )
);

-- Create policies for users to update their sessions
CREATE POLICY "Users can update sessions they're part of"
ON public.communication_sessions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = communication_sessions.case_id
    AND (cases.user_id = auth.uid() OR cases.assigned_lawyer_id = auth.uid())
  )
);

-- Admins can manage all sessions
CREATE POLICY "Admins can manage all communication sessions"
ON public.communication_sessions
FOR ALL
TO authenticated
USING (has_admin_role());

-- Create index for faster queries
CREATE INDEX idx_communication_sessions_case_id ON public.communication_sessions(case_id);
CREATE INDEX idx_communication_sessions_status ON public.communication_sessions(status);
CREATE INDEX idx_communication_sessions_initiated_by ON public.communication_sessions(initiated_by);

-- Enable real-time replication for incoming call notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.communication_sessions;

-- Create trigger to update updated_at
CREATE TRIGGER update_communication_sessions_updated_at
BEFORE UPDATE ON public.communication_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();