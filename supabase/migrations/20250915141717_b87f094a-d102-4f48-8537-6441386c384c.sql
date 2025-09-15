-- Update messages table RLS policies to allow anonymous users to create and view messages in intake conversations

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can view messages from their conversations" ON public.messages;

-- Create new policies that support anonymous intake conversations
CREATE POLICY "Users can create messages in conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (
      -- Authenticated users can create messages in their conversations
      (conversations.user_id IS NOT NULL AND (conversations.user_id)::text = (auth.uid())::text)
      OR
      -- Anonymous users can create messages in intake conversations
      (conversations.user_id IS NULL AND conversations.mode = 'intake')
    )
  )
);

CREATE POLICY "Users can view messages from conversations" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (
      -- Authenticated users can view messages from their conversations
      (conversations.user_id IS NOT NULL AND (conversations.user_id)::text = (auth.uid())::text)
      OR
      -- Anonymous users can view messages from intake conversations
      (conversations.user_id IS NULL AND conversations.mode = 'intake')
    )
  )
);