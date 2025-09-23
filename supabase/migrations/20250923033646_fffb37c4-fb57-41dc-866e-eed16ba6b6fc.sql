-- Clean up all remaining active sessions that are older than 10 minutes
UPDATE communication_sessions 
SET 
  status = 'ended',
  ended_at = NOW(),
  duration_seconds = CASE 
    WHEN started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (NOW() - started_at))::integer
    ELSE NULL
  END
WHERE 
  status = 'active' 
  AND created_at < NOW() - INTERVAL '10 minutes';