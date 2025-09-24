-- Add hybrid payment structure fields to proposals table
ALTER TABLE public.proposals 
ADD COLUMN hybrid_fixed_fee DECIMAL(10,2),
ADD COLUMN hybrid_contingency_percentage DECIMAL(5,2);

-- Update the payment_structure check constraint if it exists (or add it)
-- Note: We don't use CHECK constraints for enum-like values in this setup,
-- but we document the valid values: 'fixed_fee', 'contingency', 'hybrid'