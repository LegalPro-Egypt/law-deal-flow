-- Create anonymous_qa_sessions table for tracking homepage Q&A interactions
CREATE TABLE public.anonymous_qa_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_messages INTEGER DEFAULT 0,
  first_message_preview TEXT,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'abandoned', 'upgraded_to_intake'))
);

-- Enable Row Level Security
ALTER TABLE public.anonymous_qa_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous_qa_sessions
CREATE POLICY "Anyone can create anonymous sessions" 
ON public.anonymous_qa_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all anonymous sessions" 
ON public.anonymous_qa_sessions 
FOR SELECT 
USING (has_admin_role());

CREATE POLICY "Admins can update anonymous sessions" 
ON public.anonymous_qa_sessions 
FOR UPDATE 
USING (has_admin_role());

CREATE POLICY "Admins can delete anonymous sessions" 
ON public.anonymous_qa_sessions 
FOR DELETE 
USING (has_admin_role());

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_anonymous_qa_sessions_updated_at
BEFORE UPDATE ON public.anonymous_qa_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance on frequent queries
CREATE INDEX idx_anonymous_qa_sessions_session_id ON public.anonymous_qa_sessions(session_id);
CREATE INDEX idx_anonymous_qa_sessions_status ON public.anonymous_qa_sessions(status);
CREATE INDEX idx_anonymous_qa_sessions_created_at ON public.anonymous_qa_sessions(created_at DESC);