-- Create a function to clean up duplicate cases in admin dashboard
CREATE OR REPLACE FUNCTION public.cleanup_admin_duplicate_cases()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Delete draft cases when submitted cases exist for the same user/category
  DELETE FROM cases draft_case
  WHERE draft_case.status = 'draft'
    AND EXISTS (
      SELECT 1 FROM cases submitted_case 
      WHERE submitted_case.user_id = draft_case.user_id 
        AND submitted_case.category = draft_case.category
        AND submitted_case.status IN ('submitted', 'in_progress', 'under_review')
        AND submitted_case.id != draft_case.id
        AND ABS(EXTRACT(EPOCH FROM (submitted_case.created_at - draft_case.created_at))) < 7200 -- Within 2 hours
    );
    
  -- Delete older duplicate cases of the same status for the same user/category  
  DELETE FROM cases c1
  WHERE EXISTS (
    SELECT 1 FROM cases c2 
    WHERE c2.user_id = c1.user_id 
      AND c2.category = c1.category
      AND c2.status = c1.status
      AND c2.created_at > c1.created_at
      AND c2.id != c1.id
      AND ABS(EXTRACT(EPOCH FROM (c2.created_at - c1.created_at))) < 7200 -- Within 2 hours
  );
END;
$function$

-- Create trigger to automatically cleanup duplicates on case status changes
CREATE OR REPLACE FUNCTION public.auto_cleanup_on_case_submit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- When a case is submitted (status changes to submitted/in_progress/under_review)
  IF (TG_OP = 'UPDATE' AND OLD.status = 'draft' AND NEW.status IN ('submitted', 'in_progress', 'under_review')) OR 
     (TG_OP = 'INSERT' AND NEW.status IN ('submitted', 'in_progress', 'under_review')) THEN
    
    -- Delete any draft cases for the same user/category
    DELETE FROM cases 
    WHERE user_id = NEW.user_id 
      AND category = NEW.category
      AND status = 'draft'
      AND id != NEW.id
      AND ABS(EXTRACT(EPOCH FROM (created_at - NEW.created_at))) < 7200; -- Within 2 hours
      
  END IF;
  
  RETURN NEW;
END;
$function$

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_auto_cleanup_on_case_submit ON cases;
CREATE TRIGGER trigger_auto_cleanup_on_case_submit
  AFTER INSERT OR UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION auto_cleanup_on_case_submit();