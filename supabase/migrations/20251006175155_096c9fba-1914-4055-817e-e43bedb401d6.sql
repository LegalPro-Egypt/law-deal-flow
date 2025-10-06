-- Add display_name column to documents table
ALTER TABLE public.documents 
ADD COLUMN display_name TEXT;

-- Set default display_name from file_name for existing documents
UPDATE public.documents 
SET display_name = file_name 
WHERE display_name IS NULL;

-- Create index for faster lookups
CREATE INDEX idx_documents_display_name ON public.documents(display_name);

-- Update RLS policies to allow users to update display_name for their own documents
CREATE POLICY "Users can update display_name for their documents"
ON public.documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = documents.case_id 
    AND cases.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = documents.case_id 
    AND cases.user_id = auth.uid()
  )
);

-- Allow lawyers to update display_name for documents in their assigned cases
CREATE POLICY "Lawyers can update display_name for assigned case documents"
ON public.documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = documents.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = documents.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
);

-- Allow admins to update display_name for any document
CREATE POLICY "Admins can update display_name for all documents"
ON public.documents
FOR UPDATE
USING (has_admin_role())
WITH CHECK (has_admin_role());