-- Allow anonymous users to create intake conversations
-- Update RLS policies for conversations table

-- Drop existing policies first
DROP POLICY IF EXISTS "Users can create their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;

-- Create new policies that support both authenticated and anonymous users
CREATE POLICY "Allow anonymous intake conversations" 
ON conversations 
FOR INSERT 
WITH CHECK (
  -- Allow authenticated users to create any conversation
  (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text) 
  OR 
  -- Allow anonymous users to create intake conversations only
  (auth.uid() IS NULL AND user_id IS NULL AND mode = 'intake')
);

CREATE POLICY "Users can view their own conversations" 
ON conversations 
FOR SELECT 
USING (
  -- Authenticated users can view their own conversations
  (auth.uid() IS NOT NULL AND auth.uid()::text = user_id::text)
  OR
  -- Anonymous users can view conversations by session_id (we'll add this logic in app)
  (auth.uid() IS NULL AND user_id IS NULL)
);

-- Update messages table policies to support anonymous conversations
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON messages;

CREATE POLICY "Allow messages in accessible conversations" 
ON messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id
    AND (
      -- Authenticated user owns the conversation
      (auth.uid() IS NOT NULL AND conversations.user_id::text = auth.uid()::text)
      OR
      -- Anonymous conversation (intake mode)
      (auth.uid() IS NULL AND conversations.user_id IS NULL AND conversations.mode = 'intake')
    )
  )
);

CREATE POLICY "Users can view messages from accessible conversations" 
ON messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id
    AND (
      -- Authenticated user owns the conversation
      (auth.uid() IS NOT NULL AND conversations.user_id::text = auth.uid()::text)
      OR
      -- Anonymous conversation (intake mode) 
      (auth.uid() IS NULL AND conversations.user_id IS NULL AND conversations.mode = 'intake')
    )
  )
);

-- Add function to migrate anonymous conversations to authenticated users
CREATE OR REPLACE FUNCTION migrate_anonymous_conversation(
  conversation_session_id text,
  new_user_id uuid
) RETURNS void AS $$
BEGIN
  -- Update the conversation to link it to the authenticated user
  UPDATE conversations 
  SET user_id = new_user_id, updated_at = now()
  WHERE session_id = conversation_session_id 
    AND user_id IS NULL 
    AND mode = 'intake';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;