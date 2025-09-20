-- Fix security issue: Set proper search_path for the function
CREATE OR REPLACE FUNCTION prevent_duplicate_case_submission()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check when inserting a new submitted case or updating to submitted status
  IF (TG_OP = 'INSERT' AND NEW.status = 'submitted') OR 
     (TG_OP = 'UPDATE' AND OLD.status != 'submitted' AND NEW.status = 'submitted') THEN
    
    -- Check if user already has a submitted case with similar data within the last hour
    IF EXISTS (
      SELECT 1 FROM cases 
      WHERE user_id = NEW.user_id 
        AND status = 'submitted' 
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND created_at > NOW() - INTERVAL '1 hour'
        AND (category = NEW.category OR category IS NULL OR NEW.category IS NULL)
    ) THEN
      RAISE NOTICE 'Potential duplicate case submission detected for user %, but allowing due to business rules', NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;