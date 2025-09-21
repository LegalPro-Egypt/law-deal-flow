-- Add RLS policies for lawyers to access case_messages for assigned cases
CREATE POLICY "Lawyers can view messages from assigned cases" 
ON public.case_messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_messages.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
);

CREATE POLICY "Lawyers can create messages for assigned cases" 
ON public.case_messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_messages.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
);

-- Add RLS policy for lawyers to access documents for assigned cases
CREATE POLICY "Lawyers can view documents from assigned cases" 
ON public.documents 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = documents.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
);

-- Add RLS policy for lawyers to access case_analysis for assigned cases
CREATE POLICY "Lawyers can view analysis from assigned cases" 
ON public.case_analysis 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = case_analysis.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
);