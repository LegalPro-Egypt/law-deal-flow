-- Close legacy active communication session
UPDATE communication_sessions 
SET 
  status = 'ended',
  ended_at = NOW(),
  duration_seconds = 0,
  updated_at = NOW()
WHERE id = 'a4c89b42-9d30-4534-9c81-4ef072b251de' 
  AND status = 'active';