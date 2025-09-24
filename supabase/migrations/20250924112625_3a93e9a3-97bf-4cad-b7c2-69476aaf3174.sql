-- Create case work sessions table for tracking case work and timeline accuracy
CREATE TABLE public.case_work_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  work_started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  estimated_timeline_days INTEGER,
  actual_completion_date TIMESTAMP WITH TIME ZONE,
  lawyer_completed_at TIMESTAMP WITH TIME ZONE,
  client_confirmed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active',
  timeline_accuracy_score DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_work_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for case work sessions
CREATE POLICY "Admins can view all case work sessions" 
ON public.case_work_sessions 
FOR SELECT 
USING (has_admin_role());

CREATE POLICY "Lawyers can view their case work sessions" 
ON public.case_work_sessions 
FOR SELECT 
USING (auth.uid() = lawyer_id);

CREATE POLICY "Clients can view their case work sessions" 
ON public.case_work_sessions 
FOR SELECT 
USING (auth.uid() = client_id);

CREATE POLICY "System can create case work sessions" 
ON public.case_work_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Lawyers can update their case work sessions" 
ON public.case_work_sessions 
FOR UPDATE 
USING (auth.uid() = lawyer_id OR auth.uid() = client_id OR has_admin_role());

-- Add new case statuses
-- Update cases table to support new statuses in the status check constraint if it exists
-- Note: We're not modifying existing constraints, just documenting expected values

-- Create trigger for updating updated_at column
CREATE TRIGGER update_case_work_sessions_updated_at
BEFORE UPDATE ON public.case_work_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER TABLE public.case_work_sessions REPLICA IDENTITY FULL;

-- Add case work sessions to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.case_work_sessions;