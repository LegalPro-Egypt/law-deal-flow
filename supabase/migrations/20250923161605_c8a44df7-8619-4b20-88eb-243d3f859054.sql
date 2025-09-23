-- Add initiated_by field to communication_sessions to track who started the call
ALTER TABLE public.communication_sessions 
ADD COLUMN initiated_by uuid REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX idx_communication_sessions_initiated_by ON public.communication_sessions(initiated_by);

-- Update existing records to set initiated_by = client_id (assuming existing calls were client-initiated)
UPDATE public.communication_sessions 
SET initiated_by = client_id 
WHERE initiated_by IS NULL;