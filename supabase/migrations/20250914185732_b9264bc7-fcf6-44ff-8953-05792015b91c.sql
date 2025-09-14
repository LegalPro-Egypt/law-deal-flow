-- Fix security warning: Function Search Path Mutable
-- Update the function to have proper search_path set

CREATE OR REPLACE FUNCTION migrate_anonymous_conversation(
  conversation_session_id text,
  new_user_id uuid
) RETURNS void AS $$
BEGIN
  -- Update the conversation to link it to the authenticated user
  UPDATE conversations 
  SET user_id = new_user_id, updated_at = now()
  WHERE session_id = conversation_session_id 
    AND user_id IS NULL 
    AND mode = 'intake';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;