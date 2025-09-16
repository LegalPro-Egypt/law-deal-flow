-- Add draft_data and step columns to cases table for persistence
ALTER TABLE public.cases 
ADD COLUMN draft_data JSONB DEFAULT '{}'::jsonb,
ADD COLUMN step INTEGER DEFAULT 1;

-- Make client_name and client_email nullable for draft cases
ALTER TABLE public.cases 
ALTER COLUMN client_name DROP NOT NULL,
ALTER COLUMN client_email DROP NOT NULL;

-- Add index for better performance on draft cases
CREATE INDEX idx_cases_draft_step ON public.cases(user_id, step) WHERE status = 'draft';

-- Add comment for clarity
COMMENT ON COLUMN public.cases.draft_data IS 'Stores intermediate case data including extracted info, personal details, and step progress';
COMMENT ON COLUMN public.cases.step IS 'Current intake step: 1=chat, 2=personal details, 3=documents, 4=review';