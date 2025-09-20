-- Complete database cleanup: Delete all conversations, messages, and orphaned data

-- Step 1: Delete all intake conversations (this will cascade delete their messages)
DELETE FROM conversations WHERE mode = 'intake';

-- Step 2: Delete all QA conversations (this will cascade delete their messages)
DELETE FROM conversations WHERE mode = 'qa';

-- Step 3: Delete all QA lawyer conversations (this will cascade delete their messages)
DELETE FROM conversations WHERE mode = 'qa_lawyer';

-- Step 4: Clean up orphaned documents that reference deleted cases
DELETE FROM documents WHERE case_id NOT IN (SELECT id FROM cases);

-- Step 5: Clean up orphaned case analysis records
DELETE FROM case_analysis WHERE case_id NOT IN (SELECT id FROM cases);

-- Step 6: Clean up orphaned anonymous QA sessions
DELETE FROM anonymous_qa_sessions WHERE conversation_id NOT IN (SELECT id FROM conversations);

-- Step 7: Clean up any remaining orphaned anonymous QA sessions (those without conversation_id)
DELETE FROM anonymous_qa_sessions WHERE conversation_id IS NULL;