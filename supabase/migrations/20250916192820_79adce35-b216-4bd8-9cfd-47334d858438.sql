-- Add lawyer_id column to conversations table to track lawyer QA sessions
ALTER TABLE public.conversations 
ADD COLUMN lawyer_id UUID REFERENCES auth.users(id);

-- Update RLS policies for lawyer QA conversations
CREATE POLICY "Lawyers can view their own QA conversations" 
ON public.conversations 
FOR SELECT 
USING (
  mode = 'qa_lawyer' 
  AND auth.uid() = lawyer_id
);

CREATE POLICY "Lawyers can create their own QA conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  mode = 'qa_lawyer' 
  AND auth.uid() = lawyer_id
);

-- Allow admins to view all lawyer QA conversations
CREATE POLICY "Admins can view all lawyer QA conversations" 
ON public.conversations 
FOR SELECT 
USING (
  mode = 'qa_lawyer' 
  AND has_admin_role()
);