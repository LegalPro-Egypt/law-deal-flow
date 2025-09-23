-- Add new fields to cases table for consultation completion workflow
ALTER TABLE public.cases 
ADD COLUMN consultation_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN grace_period_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN communication_modes JSONB DEFAULT '{"text": true, "voice": true, "video": true}'::jsonb;

-- Update existing cases to have default communication modes
UPDATE public.cases 
SET communication_modes = '{"text": true, "voice": true, "video": true}'::jsonb 
WHERE communication_modes IS NULL;