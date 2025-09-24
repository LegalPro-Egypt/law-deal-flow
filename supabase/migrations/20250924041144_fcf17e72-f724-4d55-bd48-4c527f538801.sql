-- Add new columns for contingency payment structure support
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS payment_structure TEXT DEFAULT 'fixed_fee' CHECK (payment_structure IN ('fixed_fee', 'contingency'));
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contingency_percentage NUMERIC CHECK (contingency_percentage >= 0 AND contingency_percentage <= 100);
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS contingency_disclaimer_accepted BOOLEAN DEFAULT FALSE;

-- Create index for better performance on payment structure queries
CREATE INDEX IF NOT EXISTS idx_proposals_payment_structure ON proposals(payment_structure);

-- Update existing proposals to have fixed_fee payment structure
UPDATE proposals SET payment_structure = 'fixed_fee' WHERE payment_structure IS NULL;