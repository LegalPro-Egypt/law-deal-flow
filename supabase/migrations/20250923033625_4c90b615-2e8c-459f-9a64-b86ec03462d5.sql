-- Final cleanup of remaining stuck sessions
UPDATE communication_sessions 
SET 
  status = 'ended',
  ended_at = CASE 
    WHEN started_at IS NOT NULL THEN started_at + INTERVAL '2 hours'
    ELSE created_at + INTERVAL '30 minutes'
  END,
  duration_seconds = CASE 
    WHEN started_at IS NOT NULL THEN 7200
    ELSE NULL
  END
WHERE 
  status = 'active' 
  AND (
    (started_at IS NULL AND created_at < NOW() - INTERVAL '30 minutes') OR
    (started_at IS NOT NULL AND started_at < NOW() - INTERVAL '2 hours')
  );