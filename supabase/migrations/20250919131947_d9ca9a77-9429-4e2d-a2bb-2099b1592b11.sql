-- Add RLS policy to allow users to delete their own draft cases
CREATE POLICY "Users can delete their own draft cases" 
ON public.cases 
FOR DELETE 
USING (
  (auth.uid())::text = (user_id)::text 
  AND status = 'draft'
);

-- Add cascade deletion for related data when a case is deleted
-- First, add foreign key constraints with cascade delete to ensure cleanup

-- Add foreign key constraint for conversations.case_id with cascade delete
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS conversations_case_id_fkey;

ALTER TABLE public.conversations 
ADD CONSTRAINT conversations_case_id_fkey 
FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;

-- Add foreign key constraint for documents.case_id with cascade delete
ALTER TABLE public.documents 
DROP CONSTRAINT IF EXISTS documents_case_id_fkey;

ALTER TABLE public.documents 
ADD CONSTRAINT documents_case_id_fkey 
FOREIGN KEY (case_id) REFERENCES public.cases(id) ON DELETE CASCADE;