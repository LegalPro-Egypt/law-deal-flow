-- Fix security warnings by setting search_path for functions

-- Update the first function to set search_path
CREATE OR REPLACE FUNCTION check_profile_auth_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if the user_id exists in auth.users
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id) THEN
    RAISE EXCEPTION 'Profile user_id must correspond to an existing auth user';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Update the second function to set search_path  
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;