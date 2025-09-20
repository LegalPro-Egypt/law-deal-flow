-- Update the cases table status constraint to replace 'draft' with 'intake'
-- First, drop the existing constraint
ALTER TABLE public.cases DROP CONSTRAINT IF EXISTS cases_status_check;

-- Add the new constraint with 'intake' instead of 'draft'
ALTER TABLE public.cases ADD CONSTRAINT cases_status_check 
CHECK (status IN ('intake', 'submitted', 'assigned', 'in_progress', 'delivered', 'closed'));

-- Migrate any existing draft cases to intake status for consistency
UPDATE public.cases 
SET status = 'intake', updated_at = now()
WHERE status = 'draft';

-- Update the default status for new cases to 'intake'
ALTER TABLE public.cases ALTER COLUMN status SET DEFAULT 'intake';