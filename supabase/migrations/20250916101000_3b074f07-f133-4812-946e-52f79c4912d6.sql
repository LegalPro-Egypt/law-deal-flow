-- Create security definer function to check if user has admin role
CREATE OR REPLACE FUNCTION public.has_admin_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
  )
$$;

-- Add RLS policy for admins to view all cases
CREATE POLICY "Admins can view all cases" 
ON public.cases 
FOR SELECT 
USING (public.has_admin_role());

-- Add RLS policy for admins to update all cases (for assignment and status management)
CREATE POLICY "Admins can update all cases" 
ON public.cases 
FOR UPDATE 
USING (public.has_admin_role());

-- Add RLS policy for admins to view all conversations
CREATE POLICY "Admins can view all conversations" 
ON public.conversations 
FOR SELECT 
USING (public.has_admin_role());

-- Add RLS policy for admins to update conversation status
CREATE POLICY "Admins can update conversation status" 
ON public.conversations 
FOR UPDATE 
USING (public.has_admin_role());

-- Add RLS policy for admins to view all messages
CREATE POLICY "Admins can view all messages" 
ON public.messages 
FOR SELECT 
USING (
  public.has_admin_role() OR 
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND (
      (conversations.user_id IS NOT NULL AND conversations.user_id::text = auth.uid()::text) OR 
      (conversations.user_id IS NULL AND conversations.mode = 'intake')
    )
  )
);

-- Clean up old anonymous test conversations (keep only the ones that created cases)
UPDATE public.conversations 
SET status = 'completed' 
WHERE id IN (
  SELECT DISTINCT conversation_id 
  FROM public.cases 
  WHERE conversation_id IS NOT NULL
);

-- Archive old anonymous test conversations that didn't create cases
UPDATE public.conversations 
SET status = 'archived' 
WHERE user_id IS NULL 
  AND mode = 'intake' 
  AND status = 'active' 
  AND id NOT IN (
    SELECT DISTINCT conversation_id 
    FROM public.cases 
    WHERE conversation_id IS NOT NULL
  );