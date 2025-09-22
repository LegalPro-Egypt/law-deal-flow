-- Add updated_at column to proposals table
ALTER TABLE public.proposals 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

-- Update existing rows to have updated_at values
UPDATE public.proposals 
SET updated_at = COALESCE(created_at, now());

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER proposals_set_updated_at
    BEFORE UPDATE ON public.proposals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();