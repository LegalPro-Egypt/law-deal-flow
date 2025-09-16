-- Add DELETE policy for admins on lawyer_requests table
CREATE POLICY "Only admins can delete lawyer requests" 
ON lawyer_requests 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM profiles
  WHERE ((profiles.user_id = auth.uid()) AND (profiles.role = 'admin'::text))
));