-- Add delete policy for admins on cases table
CREATE POLICY "Admins can delete cases" 
ON cases 
FOR DELETE 
USING (has_admin_role());