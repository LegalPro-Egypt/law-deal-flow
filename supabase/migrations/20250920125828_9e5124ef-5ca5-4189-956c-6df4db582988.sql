-- Create function to clean up duplicate cases in admin dashboard
CREATE OR REPLACE FUNCTION public.cleanup_admin_duplicate_cases()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Delete draft cases when submitted cases exist for the same user/category
  DELETE FROM cases 
  WHERE status = 'draft'
    AND id IN (
      SELECT draft_case.id 
      FROM cases draft_case
      INNER JOIN cases submitted_case ON (
        submitted_case.user_id = draft_case.user_id 
        AND submitted_case.category = draft_case.category
        AND submitted_case.status IN ('submitted', 'in_progress', 'under_review')
        AND submitted_case.id != draft_case.id
        AND ABS(EXTRACT(EPOCH FROM (submitted_case.created_at - draft_case.created_at))) < 7200
      )
      WHERE draft_case.status = 'draft'
    );
    
  -- Delete older duplicate cases of the same status for the same user/category  
  DELETE FROM cases 
  WHERE id IN (
    SELECT c1.id 
    FROM cases c1
    INNER JOIN cases c2 ON (
      c2.user_id = c1.user_id 
      AND c2.category = c1.category
      AND c2.status = c1.status
      AND c2.created_at > c1.created_at
      AND c2.id != c1.id
      AND ABS(EXTRACT(EPOCH FROM (c2.created_at - c1.created_at))) < 7200
    )
  );
END;
$$;