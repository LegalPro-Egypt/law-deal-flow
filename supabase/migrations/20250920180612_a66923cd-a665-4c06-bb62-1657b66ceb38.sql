-- Add foreign key constraint to ensure case_messages.case_id references valid cases
-- This prevents orphaned messages and ensures data integrity

ALTER TABLE case_messages 
ADD CONSTRAINT case_messages_case_id_fkey 
FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE;

-- Add index for better query performance on case_messages by case_id
CREATE INDEX IF NOT EXISTS idx_case_messages_case_id_created_at 
ON case_messages(case_id, created_at ASC);

-- Add index for better query performance on cases by user_id
CREATE INDEX IF NOT EXISTS idx_cases_user_id_status 
ON cases(user_id, status);

-- Function to migrate any remaining messages from conversations to case_messages
CREATE OR REPLACE FUNCTION migrate_conversation_messages_to_case_messages()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert messages from conversations that have a case_id but no corresponding case_messages
  INSERT INTO case_messages (case_id, role, content, message_type, metadata, created_at)
  SELECT 
    c.case_id,
    m.role,
    m.content,
    COALESCE(m.message_type, 'text') as message_type,
    COALESCE(m.metadata, '{}') as metadata,
    m.created_at
  FROM conversations c
  INNER JOIN messages m ON m.conversation_id = c.id
  WHERE c.case_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM case_messages cm 
      WHERE cm.case_id = c.case_id 
      AND cm.role = m.role 
      AND cm.content = m.content 
      AND cm.created_at = m.created_at
    );
    
  -- Log the migration
  RAISE NOTICE 'Migration completed: moved conversation messages to case_messages where applicable';
END;
$$;