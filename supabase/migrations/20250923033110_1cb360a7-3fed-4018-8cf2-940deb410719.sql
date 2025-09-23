-- Clean up stuck active sessions and add session management improvements

-- First, clean up existing stuck sessions
UPDATE communication_sessions 
SET 
  status = 'ended',
  ended_at = COALESCE(started_at, created_at) + INTERVAL '30 minutes',
  duration_seconds = CASE 
    WHEN started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (COALESCE(started_at, created_at) + INTERVAL '30 minutes' - started_at))::integer
    ELSE NULL
  END
WHERE 
  status = 'active' 
  AND (
    (started_at IS NULL AND created_at < NOW() - INTERVAL '30 minutes') OR
    (started_at IS NOT NULL AND started_at < NOW() - INTERVAL '2 hours')
  );

-- Update scheduled sessions that are too old
UPDATE communication_sessions 
SET 
  status = 'failed',
  ended_at = created_at + INTERVAL '1 hour'
WHERE 
  status = 'scheduled' 
  AND created_at < NOW() - INTERVAL '1 hour';

-- Create a function to cleanup old sessions automatically
CREATE OR REPLACE FUNCTION cleanup_stale_communication_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Clean up active sessions that have been running too long or never started
  UPDATE communication_sessions 
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
  UPDATE communication_sessions 
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

-- Add an index to improve cleanup performance
CREATE INDEX IF NOT EXISTS idx_communication_sessions_status_created 
ON communication_sessions(status, created_at);

-- Add an index for session lookups by room
CREATE INDEX IF NOT EXISTS idx_communication_sessions_room_name 
ON communication_sessions(room_name) WHERE room_name IS NOT NULL;

-- Add a trigger to automatically set updated_at
CREATE OR REPLACE FUNCTION update_communication_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_communication_sessions_updated_at ON communication_sessions;
CREATE TRIGGER trigger_update_communication_sessions_updated_at
  BEFORE UPDATE ON communication_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_communication_sessions_updated_at();