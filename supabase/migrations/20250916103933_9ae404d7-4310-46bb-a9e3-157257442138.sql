-- Allow admins to delete conversations
CREATE POLICY "Admins can delete conversations" 
ON public.conversations 
FOR DELETE 
USING (has_admin_role());

-- Add foreign key constraint with cascade deletion for messages
ALTER TABLE public.messages 
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

ALTER TABLE public.messages 
ADD CONSTRAINT messages_conversation_id_fkey 
FOREIGN KEY (conversation_id) 
REFERENCES public.conversations(id) 
ON DELETE CASCADE;