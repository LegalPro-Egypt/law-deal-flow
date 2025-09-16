-- Check current schema and add missing columns
-- Add step column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'step') THEN
        ALTER TABLE public.cases ADD COLUMN step INTEGER DEFAULT 1;
    END IF;
END $$;

-- Make client_name and client_email nullable for draft cases
ALTER TABLE public.cases 
ALTER COLUMN client_name DROP NOT NULL,
ALTER COLUMN client_email DROP NOT NULL;

-- Add index for better performance on draft cases (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_cases_draft_step') THEN
        CREATE INDEX idx_cases_draft_step ON public.cases(user_id, step) WHERE status = 'draft';
    END IF;
END $$;

-- Add draft_data column if it doesn't exist  
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cases' AND column_name = 'draft_data') THEN
        ALTER TABLE public.cases ADD COLUMN draft_data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add comments for clarity
COMMENT ON COLUMN public.cases.draft_data IS 'Stores intermediate case data including extracted info, personal details, and step progress';
COMMENT ON COLUMN public.cases.step IS 'Current intake step: 1=chat, 2=personal details, 3=documents, 4=review';