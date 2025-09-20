-- Create case_messages table for direct chat history linking
CREATE TABLE IF NOT EXISTS public.case_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create case_analysis table for legal analysis
CREATE TABLE IF NOT EXISTS public.case_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  analysis_data JSONB NOT NULL,
  analysis_type TEXT NOT NULL DEFAULT 'comprehensive',
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_case_messages_case_id ON public.case_messages(case_id);
CREATE INDEX IF NOT EXISTS idx_case_messages_created_at ON public.case_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_case_analysis_case_id ON public.case_analysis(case_id);

-- Enable RLS for case_messages
ALTER TABLE public.case_messages ENABLE ROW LEVEL SECURITY;

-- Create policies for case_messages
CREATE POLICY "Users can view messages from their cases" 
ON public.case_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_messages.case_id 
    AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all case messages" 
ON public.case_messages 
FOR SELECT 
USING (has_admin_role());

CREATE POLICY "Users can create messages for their cases" 
ON public.case_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_messages.case_id 
    AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can create case messages" 
ON public.case_messages 
FOR INSERT 
WITH CHECK (has_admin_role());

-- Enable RLS for case_analysis
ALTER TABLE public.case_analysis ENABLE ROW LEVEL SECURITY;

-- Create policies for case_analysis
CREATE POLICY "Users can view analysis from their cases" 
ON public.case_analysis 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_analysis.case_id 
    AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all case analysis" 
ON public.case_analysis 
FOR SELECT 
USING (has_admin_role());

CREATE POLICY "Admins can create case analysis" 
ON public.case_analysis 
FOR INSERT 
WITH CHECK (has_admin_role());

CREATE POLICY "Admins can update case analysis" 
ON public.case_analysis 
FOR UPDATE 
USING (has_admin_role());

-- Create trigger for updated_at on case_messages
CREATE TRIGGER update_case_messages_updated_at
  BEFORE UPDATE ON public.case_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on case_analysis  
CREATE TRIGGER update_case_analysis_updated_at
  BEFORE UPDATE ON public.case_analysis
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing conversation messages to case_messages for cases that have linked conversations
INSERT INTO public.case_messages (case_id, role, content, message_type, metadata, created_at)
SELECT 
  c.id as case_id,
  m.role,
  m.content,
  m.message_type,
  m.metadata,
  m.created_at
FROM public.cases c
INNER JOIN public.conversations conv ON conv.case_id = c.id
INNER JOIN public.messages m ON m.conversation_id = conv.id
WHERE NOT EXISTS (
  SELECT 1 FROM public.case_messages cm 
  WHERE cm.case_id = c.id
)
ORDER BY m.created_at;

-- Migrate existing legal analysis from cases to case_analysis table
INSERT INTO public.case_analysis (case_id, analysis_data, analysis_type, generated_at, status)
SELECT 
  id as case_id,
  legal_analysis as analysis_data,
  'comprehensive' as analysis_type,
  updated_at as generated_at,
  'completed' as status
FROM public.cases 
WHERE legal_analysis IS NOT NULL 
AND legal_analysis != '{}'::jsonb
AND NOT EXISTS (
  SELECT 1 FROM public.case_analysis ca 
  WHERE ca.case_id = cases.id
);