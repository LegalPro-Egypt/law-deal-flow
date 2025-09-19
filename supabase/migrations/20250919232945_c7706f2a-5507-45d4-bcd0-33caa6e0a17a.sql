-- Fix RLS policies for anonymous Q&A conversations
-- Drop the existing restrictive policy for conversation creation
DROP POLICY IF EXISTS "Allow conversation creation" ON conversations;

-- Create a more permissive policy for anonymous Q&A conversations
CREATE POLICY "Allow anonymous qa conversation creation" 
ON conversations 
FOR INSERT 
WITH CHECK (
  -- Authenticated users can create any conversation
  (auth.uid() IS NOT NULL AND ((auth.uid())::text = (user_id)::text OR user_id IS NULL))
  OR
  -- Anonymous users can only create Q&A conversations
  (auth.uid() IS NULL AND user_id IS NULL AND mode = 'qa')
);

-- Update the viewing policy to be more permissive for anonymous Q&A
DROP POLICY IF EXISTS "Allow conversation viewing" ON conversations;

CREATE POLICY "Allow conversation viewing" 
ON conversations 
FOR SELECT 
USING (
  -- Authenticated users can view their own conversations
  (auth.uid() IS NOT NULL AND ((auth.uid())::text = (user_id)::text))
  OR
  -- Anonymous users can view Q&A conversations without user_id
  (user_id IS NULL AND mode = 'qa')
  OR
  -- Admins can view all conversations
  has_admin_role()
);