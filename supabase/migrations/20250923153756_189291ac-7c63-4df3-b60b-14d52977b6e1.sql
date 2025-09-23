-- Update the case_messages role check constraint to include 'lawyer' role
ALTER TABLE public.case_messages 
DROP CONSTRAINT IF EXISTS case_messages_role_check;

-- Add the updated constraint that includes 'lawyer' role
ALTER TABLE public.case_messages 
ADD CONSTRAINT case_messages_role_check 
CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'lawyer'::text, 'client'::text, 'system'::text]));