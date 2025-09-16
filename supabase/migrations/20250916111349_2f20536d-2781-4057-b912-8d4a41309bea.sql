-- Add client responses summary field to cases table
ALTER TABLE public.cases 
ADD COLUMN client_responses_summary JSONB DEFAULT '{}'::jsonb;