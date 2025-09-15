-- Fix security vulnerability: Anonymous users can access all client conversations
-- The current RLS policies allow any anonymous user to see all anonymous conversations
-- We need to restrict access based on session_id for anonymous users

-- First, let's update the conversations table RLS policy
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;

CREATE POLICY "Users can view their own conversations" 
ON public.conversations 
FOR SELECT 
USING (
  -- Authenticated users can see their own conversations
  (auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text)
);

-- Create a separate policy for anonymous intake conversations that requires session validation
-- Note: This policy would need application-level session management to be secure
-- For now, we'll disable anonymous access to prevent the security vulnerability
CREATE POLICY "Restrict anonymous access to conversations" 
ON public.conversations 
FOR SELECT 
USING (
  -- Only allow authenticated users to view conversations
  auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text
);

-- Update the messages table RLS policy to only allow authenticated users
DROP POLICY IF EXISTS "Users can view messages from accessible conversations" ON public.messages;

CREATE POLICY "Authenticated users can view messages from their conversations" 
ON public.messages 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversations.id = messages.conversation_id 
      AND (conversations.user_id)::text = (auth.uid())::text
  )
);

-- Update the insert policy for messages to only allow authenticated users
DROP POLICY IF EXISTS "Allow messages in accessible conversations" ON public.messages;

CREATE POLICY "Authenticated users can create messages in their conversations" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM conversations
    WHERE conversations.id = messages.conversation_id 
      AND (conversations.user_id)::text = (auth.uid())::text
  )
);

-- Update conversations insert policy to only allow authenticated users
DROP POLICY IF EXISTS "Allow anonymous intake conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create their own conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND (auth.uid())::text = (user_id)::text
);