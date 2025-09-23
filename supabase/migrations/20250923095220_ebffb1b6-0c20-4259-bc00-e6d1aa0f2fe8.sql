-- Clean up the stuck active chat session
UPDATE communication_sessions 
SET 
  status = 'ended',
  ended_at = NOW(),
  duration_seconds = EXTRACT(EPOCH FROM (NOW() - created_at))::integer
WHERE 
  id = 'de07bda7-e99b-4838-baa5-86171c4f0395' 
  AND status = 'active';