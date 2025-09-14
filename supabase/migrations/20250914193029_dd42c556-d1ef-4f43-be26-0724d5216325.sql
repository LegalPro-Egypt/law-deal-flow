-- Fix the security warning by setting search_path on the function
CREATE OR REPLACE FUNCTION public.enforce_admin_email_restriction()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' AND NEW.email != 'dankevforster@gmail.com' THEN
    RAISE EXCEPTION 'Admin role is restricted to dankevforster@gmail.com only';
  END IF;
  RETURN NEW;
END;
$$;