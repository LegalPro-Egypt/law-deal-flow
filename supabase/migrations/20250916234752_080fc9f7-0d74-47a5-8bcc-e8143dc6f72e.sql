-- Data cleanup and foreign key constraints migration

-- First, clean up orphaned data
-- Remove profiles that don't have corresponding auth users
DELETE FROM profiles 
WHERE user_id NOT IN (
  SELECT id FROM auth.users
);

-- Remove lawyer_requests for emails that have profiles but no auth users  
DELETE FROM lawyer_requests 
WHERE status = 'approved' 
AND email IN (
  SELECT email FROM profiles p 
  WHERE p.user_id NOT IN (SELECT id FROM auth.users)
);

-- Add foreign key constraints to prevent future inconsistencies
-- Note: We can't add FK to auth.users directly, but we can add some data integrity checks

-- Add a function to validate profile consistency
CREATE OR REPLACE FUNCTION check_profile_auth_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user_id exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Profile user_id must correspond to an existing auth user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to profiles table
DROP TRIGGER IF EXISTS ensure_profile_auth_consistency ON profiles;
CREATE TRIGGER ensure_profile_auth_consistency
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_profile_auth_consistency();

-- Add cascading deletion for related data when profiles are deleted
-- Update cases to remove lawyer assignments when lawyer profile is deleted
CREATE OR REPLACE FUNCTION handle_lawyer_profile_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Unassign lawyer from any cases
  UPDATE cases 
  SET assigned_lawyer_id = NULL 
  WHERE assigned_lawyer_id = OLD.id;
  
  -- Delete lawyer's conversations
  DELETE FROM conversations 
  WHERE lawyer_id = OLD.id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for profile deletion
DROP TRIGGER IF EXISTS handle_lawyer_deletion ON profiles;
CREATE TRIGGER handle_lawyer_deletion
  BEFORE DELETE ON profiles
  FOR EACH ROW
  WHEN (OLD.role = 'lawyer')
  EXECUTE FUNCTION handle_lawyer_profile_deletion();