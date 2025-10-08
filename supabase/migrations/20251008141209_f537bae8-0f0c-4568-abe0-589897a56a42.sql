-- Add payment structure and contract details columns to contracts table
ALTER TABLE public.contracts
ADD COLUMN IF NOT EXISTS payment_structure text,
ADD COLUMN IF NOT EXISTS consultation_fee numeric,
ADD COLUMN IF NOT EXISTS remaining_fee numeric,
ADD COLUMN IF NOT EXISTS contingency_percentage numeric,
ADD COLUMN IF NOT EXISTS hybrid_fixed_fee numeric,
ADD COLUMN IF NOT EXISTS hybrid_contingency_percentage numeric,
ADD COLUMN IF NOT EXISTS timeline text,
ADD COLUMN IF NOT EXISTS strategy text;