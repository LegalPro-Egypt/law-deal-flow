-- Clean up empty anonymous sessions that have no actual messages
DELETE FROM anonymous_qa_sessions 
WHERE total_messages <= 1 
  AND id NOT IN (
    SELECT DISTINCT aqs.id 
    FROM anonymous_qa_sessions aqs
    INNER JOIN conversations c ON c.id = aqs.conversation_id
    INNER JOIN messages m ON m.conversation_id = c.id
    WHERE m.role = 'user'
  );

-- Add a new column to better track actual user interactions
ALTER TABLE anonymous_qa_sessions 
ADD COLUMN IF NOT EXISTS actual_message_count integer DEFAULT 0;

-- Update existing sessions with actual message counts
UPDATE anonymous_qa_sessions 
SET actual_message_count = (
  SELECT COUNT(*) 
  FROM messages m 
  INNER JOIN conversations c ON c.id = m.conversation_id 
  WHERE c.id = anonymous_qa_sessions.conversation_id 
    AND m.role = 'user'
);