-- Clean up AI assistant messages from case_messages table
-- These should only contain lawyer-client communication, not AI intake messages

DELETE FROM case_messages 
WHERE role = 'assistant' 
  AND message_type = 'text' 
  AND (metadata->>'mode' = 'intake' OR metadata->>'mode' = 'qa');

-- Log the cleanup
DO $$
DECLARE
    cleanup_count INTEGER;
BEGIN
    GET DIAGNOSTICS cleanup_count = ROW_COUNT;
    RAISE NOTICE 'Cleaned up % AI assistant messages from case_messages table', cleanup_count;
END $$;