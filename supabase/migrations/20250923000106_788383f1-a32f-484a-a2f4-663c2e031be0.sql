-- Add source column to anonymous_qa_sessions table to track chat origin
ALTER TABLE anonymous_qa_sessions 
ADD COLUMN source TEXT DEFAULT 'homepage';

-- Add index for better performance when filtering by source
CREATE INDEX idx_anonymous_qa_sessions_source ON anonymous_qa_sessions(source);