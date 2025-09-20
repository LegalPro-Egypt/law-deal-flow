-- Add idempotency key and constraints to prevent duplicate case creation
ALTER TABLE public.cases 
ADD COLUMN idempotency_key uuid;

-- Create unique constraint to prevent duplicate cases for same user with same idempotency key
CREATE UNIQUE INDEX unique_case_per_user_idempotency 
ON public.cases (user_id, idempotency_key) 
WHERE status != 'deleted' AND idempotency_key IS NOT NULL;

-- Add index for performance on idempotency lookups
CREATE INDEX idx_cases_idempotency_key ON public.cases (idempotency_key) 
WHERE idempotency_key IS NOT NULL;