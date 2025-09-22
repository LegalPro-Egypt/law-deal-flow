-- Add policy for admins to update proposals
CREATE POLICY "Admins can update proposals" 
ON public.proposals 
FOR UPDATE 
USING (has_admin_role()) 
WITH CHECK (has_admin_role());

-- Fix existing proposals that are stuck at 'approved' status
UPDATE public.proposals 
SET status = 'sent' 
WHERE status = 'approved' AND response_at IS NULL;