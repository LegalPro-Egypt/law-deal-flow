-- Add new JSONB fields for enhanced legal analysis to cases table
ALTER TABLE public.cases 
ADD COLUMN legal_analysis JSONB DEFAULT '{}'::jsonb,
ADD COLUMN case_complexity_score INTEGER DEFAULT NULL,
ADD COLUMN applicable_laws TEXT[] DEFAULT NULL;