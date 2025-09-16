-- Fix: Create or replace security definer function to check if current user is admin
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
  );
$$;

-- Allow admins to view/insert/update cases
DO $$ BEGIN
  -- SELECT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cases' AND policyname = 'Admins can view all cases'
  ) THEN
    CREATE POLICY "Admins can view all cases" 
    ON public.cases 
    FOR SELECT 
    USING (public.has_admin_role());
  END IF;

  -- UPDATE policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cases' AND policyname = 'Admins can update all cases'
  ) THEN
    CREATE POLICY "Admins can update all cases" 
    ON public.cases 
    FOR UPDATE 
    USING (public.has_admin_role());
  END IF;

  -- INSERT policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'cases' AND policyname = 'Admins can insert cases'
  ) THEN
    CREATE POLICY "Admins can insert cases" 
    ON public.cases 
    FOR INSERT 
    WITH CHECK (public.has_admin_role());
  END IF;
END $$;

-- Allow admins to view/update conversations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Admins can view all conversations'
  ) THEN
    CREATE POLICY "Admins can view all conversations" 
    ON public.conversations 
    FOR SELECT 
    USING (public.has_admin_role());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'conversations' AND policyname = 'Admins can update conversation status'
  ) THEN
    CREATE POLICY "Admins can update conversation status" 
    ON public.conversations 
    FOR UPDATE 
    USING (public.has_admin_role());
  END IF;
END $$;

-- Allow admins to view all messages
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'Admins can view all messages'
  ) THEN
    CREATE POLICY "Admins can view all messages" 
    ON public.messages 
    FOR SELECT 
    USING (public.has_admin_role());
  END IF;
END $$;

-- Allow admins to view all documents
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'Admins can view all documents'
  ) THEN
    CREATE POLICY "Admins can view all documents" 
    ON public.documents 
    FOR SELECT 
    USING (public.has_admin_role());
  END IF;
END $$;

-- Mark conversations linked to cases as completed
UPDATE public.conversations 
SET status = 'completed' 
WHERE case_id IS NOT NULL;

-- Mark anonymous active intakes without cases as abandoned (since they're not linked to real cases)
UPDATE public.conversations 
SET status = 'abandoned' 
WHERE user_id IS NULL 
  AND mode = 'intake' 
  AND status = 'active' 
  AND case_id IS NULL;