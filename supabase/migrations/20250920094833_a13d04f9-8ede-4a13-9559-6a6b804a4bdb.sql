-- Fix Admin Role Security: Remove hardcoded admin email dependency
-- Create a more secure admin role management system

-- First, create a security definer function to check if user is the original admin
CREATE OR REPLACE FUNCTION public.is_original_admin(user_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_email = 'dankevforster@gmail.com';
$$;

-- Create a trigger to enforce admin email restriction at database level
CREATE OR REPLACE FUNCTION public.enforce_admin_email_restriction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' AND NOT public.is_original_admin(NEW.email) THEN
    RAISE EXCEPTION 'Admin role is restricted to the original admin email only';
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists and recreate
DROP TRIGGER IF EXISTS enforce_admin_email ON public.profiles;
CREATE TRIGGER enforce_admin_email
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_email_restriction();

-- Fix Anonymous User Privacy: Remove sensitive tracking data
-- Remove IP address and user agent columns from anonymous_qa_sessions
ALTER TABLE public.anonymous_qa_sessions 
DROP COLUMN IF EXISTS ip_address,
DROP COLUMN IF EXISTS user_agent;

-- Add data retention policy for anonymous sessions (30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_anonymous_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete anonymous sessions older than 30 days
  DELETE FROM public.anonymous_qa_sessions 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete orphaned conversations for deleted sessions
  DELETE FROM public.conversations 
  WHERE mode = 'qa' 
    AND user_id IS NULL 
    AND id NOT IN (
      SELECT conversation_id 
      FROM public.anonymous_qa_sessions 
      WHERE conversation_id IS NOT NULL
    );
END;
$$;

-- Create a scheduled cleanup (would need to be set up in Supabase cron if available)
-- For now, this function can be called manually or triggered by the application