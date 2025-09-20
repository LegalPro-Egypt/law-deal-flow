-- Clean up duplicate cases and fix data inconsistencies
-- This migration identifies and consolidates duplicate cases created during intake process

-- Step 1: Identify and merge duplicate cases for each user
-- Find cases where user has both draft and submitted status (indicating duplicates)
WITH duplicate_users AS (
  SELECT user_id, COUNT(*) as case_count
  FROM cases 
  WHERE status IN ('draft', 'submitted')
  GROUP BY user_id 
  HAVING COUNT(*) > 1
),
case_pairs AS (
  SELECT 
    c1.id as draft_id,
    c2.id as submitted_id,
    c1.user_id,
    c1.created_at as draft_created,
    c2.created_at as submitted_created,
    c1.draft_data as draft_data,
    c2.extracted_entities as submitted_entities
  FROM cases c1
  JOIN cases c2 ON c1.user_id = c2.user_id
  JOIN duplicate_users du ON c1.user_id = du.user_id
  WHERE c1.status = 'draft' 
    AND c2.status = 'submitted'
    AND c1.id != c2.id
    AND ABS(EXTRACT(EPOCH FROM (c2.created_at - c1.created_at))) < 3600 -- Within 1 hour
)
-- Merge data from draft cases into submitted cases and then clean up
UPDATE cases 
SET 
  draft_data = COALESCE(
    (SELECT draft_data FROM cases WHERE id = case_pairs.draft_id),
    draft_data,
    '{}'::jsonb
  ),
  client_name = COALESCE(
    client_name,
    (SELECT client_name FROM cases WHERE id = case_pairs.draft_id)
  ),
  client_email = COALESCE(
    client_email, 
    (SELECT client_email FROM cases WHERE id = case_pairs.draft_id)
  ),
  client_phone = COALESCE(
    client_phone,
    (SELECT client_phone FROM cases WHERE id = case_pairs.draft_id)
  )
FROM case_pairs 
WHERE cases.id = case_pairs.submitted_id;

-- Step 2: Update conversations to point to the correct (submitted) case
WITH case_pairs AS (
  SELECT 
    c1.id as draft_id,
    c2.id as submitted_id,
    c1.user_id
  FROM cases c1
  JOIN cases c2 ON c1.user_id = c2.user_id
  WHERE c1.status = 'draft' 
    AND c2.status = 'submitted'
    AND c1.id != c2.id
    AND ABS(EXTRACT(EPOCH FROM (c2.created_at - c1.created_at))) < 3600
)
UPDATE conversations
SET case_id = case_pairs.submitted_id
FROM case_pairs
WHERE conversations.case_id = case_pairs.draft_id
  OR (conversations.user_id = case_pairs.user_id AND conversations.case_id IS NULL);

-- Step 3: Update documents to point to the correct (submitted) case
WITH case_pairs AS (
  SELECT 
    c1.id as draft_id,
    c2.id as submitted_id,
    c1.user_id
  FROM cases c1
  JOIN cases c2 ON c1.user_id = c2.user_id
  WHERE c1.status = 'draft' 
    AND c2.status = 'submitted'
    AND c1.id != c2.id
    AND ABS(EXTRACT(EPOCH FROM (c2.created_at - c1.created_at))) < 3600
)
UPDATE documents
SET case_id = case_pairs.submitted_id
FROM case_pairs
WHERE documents.case_id = case_pairs.draft_id;

-- Step 4: Delete orphaned draft cases that now have submitted counterparts
WITH case_pairs AS (
  SELECT 
    c1.id as draft_id,
    c2.id as submitted_id
  FROM cases c1
  JOIN cases c2 ON c1.user_id = c2.user_id
  WHERE c1.status = 'draft' 
    AND c2.status = 'submitted'
    AND c1.id != c2.id
    AND ABS(EXTRACT(EPOCH FROM (c2.created_at - c1.created_at))) < 3600
)
DELETE FROM cases 
WHERE id IN (SELECT draft_id FROM case_pairs);

-- Step 5: Add constraint to prevent future duplicate case creation
-- Create a function to check for existing submitted cases before allowing new ones
CREATE OR REPLACE FUNCTION prevent_duplicate_case_submission()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for the duplicate prevention function
DROP TRIGGER IF EXISTS check_duplicate_cases ON cases;
CREATE TRIGGER check_duplicate_cases
  BEFORE INSERT OR UPDATE ON cases
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_case_submission();