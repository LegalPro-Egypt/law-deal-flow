-- Update messages table RLS policies to allow anonymous intake conversations
DROP POLICY IF EXISTS "Authenticated users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can view messages from their conversations" ON public.messages;

-- Allow creating messages in conversations (both authenticated and anonymous intake)
CREATE POLICY "Allow message creation" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (
      -- Authenticated user's conversation
      (conversations.user_id IS NOT NULL AND (conversations.user_id)::text = (auth.uid())::text)
      OR
      -- Anonymous intake conversation
      (conversations.user_id IS NULL AND conversations.mode = 'intake')
    )
  )
);

-- Allow viewing messages from conversations (both authenticated and anonymous intake)
CREATE POLICY "Allow message viewing" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (
      -- Authenticated user's conversation
      (conversations.user_id IS NOT NULL AND (conversations.user_id)::text = (auth.uid())::text)
      OR
      -- Anonymous intake conversation
      (conversations.user_id IS NULL AND conversations.mode = 'intake')
    )
  )
);