-- Add RLS policy for admins to delete proposals
CREATE POLICY "Admins can delete proposals" 
ON public.proposals 
FOR DELETE 
USING (has_admin_role());