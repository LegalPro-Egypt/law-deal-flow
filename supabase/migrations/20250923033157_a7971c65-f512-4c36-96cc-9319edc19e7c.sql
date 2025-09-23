-- Fix security warnings by setting proper search paths

-- Update the cleanup function to have proper search path
CREATE OR REPLACE FUNCTION cleanup_stale_communication_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Clean up active sessions that have been running too long or never started
  UPDATE public.communication_sessions 
  SET 
    status = 'ended',
    ended_at = CASE 
      WHEN started_at IS NOT NULL THEN started_at + INTERVAL '2 hours'
      ELSE created_at + INTERVAL '30 minutes'
    END,
    duration_seconds = CASE 
      WHEN started_at IS NOT NULL THEN 7200 -- 2 hours in seconds
      ELSE NULL
    END
  WHERE 
    status = 'active' 
    AND (
      (started_at IS NULL AND created_at < NOW() - INTERVAL '30 minutes') OR
      (started_at IS NOT NULL AND started_at < NOW() - INTERVAL '2 hours')
    );

  -- Clean up scheduled sessions that are too old
  UPDATE public.communication_sessions 
  SET 
    status = 'failed',
    ended_at = created_at + INTERVAL '1 hour'
  WHERE 
    status = 'scheduled' 
    AND created_at < NOW() - INTERVAL '1 hour';

  -- Log cleanup activity
  RAISE NOTICE 'Cleaned up stale communication sessions at %', NOW();
END;
$$;

-- Update the trigger function to have proper search path
CREATE OR REPLACE FUNCTION update_communication_sessions_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;