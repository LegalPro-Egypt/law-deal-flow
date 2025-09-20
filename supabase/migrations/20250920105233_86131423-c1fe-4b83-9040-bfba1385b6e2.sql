-- Add specific policy for intake conversation creation
-- This ensures authenticated users can always create intake conversations

CREATE POLICY "Users can create intake conversations" 
ON conversations 
FOR INSERT 
WITH CHECK (
  mode = 'intake' AND 
  auth.uid() IS NOT NULL AND 
  (user_id IS NULL OR user_id = auth.uid())
);