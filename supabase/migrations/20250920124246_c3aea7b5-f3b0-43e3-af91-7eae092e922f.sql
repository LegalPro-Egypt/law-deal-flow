-- Add database function to prevent multiple draft cases for the same user
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_draft_cases()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Delete older draft cases when a user has multiple drafts of the same category
  DELETE FROM cases c1
  WHERE c1.status = 'draft'
    AND EXISTS (
      SELECT 1 FROM cases c2 
      WHERE c2.user_id = c1.user_id 
        AND c2.status = 'draft'
        AND c2.category = c1.category
        AND c2.created_at > c1.created_at
    );
    
  -- Delete draft cases when there's a submitted case with similar content
  DELETE FROM cases draft
  WHERE draft.status = 'draft'
    AND EXISTS (
      SELECT 1 FROM cases submitted 
      WHERE submitted.user_id = draft.user_id 
        AND submitted.status IN ('submitted', 'in_progress')
        AND submitted.category = draft.category
        AND submitted.created_at > draft.created_at - INTERVAL '2 hours'
    );
END;
$$;

-- Create trigger to clean up duplicate drafts before case insertion
CREATE OR REPLACE FUNCTION public.prevent_duplicate_drafts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- When inserting a new draft case, clean up existing drafts
  IF NEW.status = 'draft' THEN
    -- Delete any existing draft cases for this user with the same category
    DELETE FROM cases 
    WHERE user_id = NEW.user_id 
      AND status = 'draft' 
      AND category = NEW.category
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS prevent_duplicate_drafts_trigger ON cases;
CREATE TRIGGER prevent_duplicate_drafts_trigger
  BEFORE INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_duplicate_drafts();