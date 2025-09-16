-- Add RLS policy for documents to allow inserts when case belongs to user
CREATE POLICY "Users can insert documents for their cases" 
ON documents 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = documents.case_id 
    AND cases.user_id::text = auth.uid()::text
  )
);