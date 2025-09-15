-- Drop all existing conversation policies first
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Restrict anonymous access to conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations" ON public.conversations;

-- Create new policy that allows both authenticated users and anonymous intake
CREATE POLICY "Allow conversation creation" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  -- Allow authenticated users to create their own conversations
  (auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text)
  OR 
  -- Allow anonymous users to create intake conversations
  (user_id IS NULL AND mode = 'intake')
);

-- Create new SELECT policy to allow viewing conversations
CREATE POLICY "Allow conversation viewing" 
ON public.conversations 
FOR SELECT 
USING (
  -- Authenticated users can view their own conversations
  (auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text)
  OR
  -- Anonymous users can view intake conversations (they'll use session_id for filtering)
  (user_id IS NULL AND mode = 'intake')
);