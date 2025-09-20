-- Add admin policies for conversations to allow viewing all conversations
CREATE POLICY "Admins can view all conversations" 
ON public.conversations 
FOR SELECT 
USING (has_admin_role());

-- Add admin policies for messages to allow viewing all messages
CREATE POLICY "Admins can view all messages" 
ON public.messages 
FOR SELECT 
USING (has_admin_role());

-- Add admin policy for cases to allow viewing all cases (already exists but ensuring it's there)
-- Add admin policy for updating conversations
CREATE POLICY "Admins can update all conversations" 
ON public.conversations 
FOR UPDATE 
USING (has_admin_role());