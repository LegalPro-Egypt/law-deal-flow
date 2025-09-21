-- Add payment tracking fields to cases table
ALTER TABLE cases 
ADD COLUMN consultation_paid boolean DEFAULT false,
ADD COLUMN payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
ADD COLUMN payment_amount numeric(10,2),
ADD COLUMN payment_date timestamp with time zone;

-- Update case status check constraint to include new statuses
ALTER TABLE cases 
DROP CONSTRAINT IF EXISTS cases_status_check;

ALTER TABLE cases 
ADD CONSTRAINT cases_status_check 
CHECK (status IN (
  'draft', 'intake', 'submitted', 'lawyer_assigned', 
  'proposal_sent', 'proposal_accepted', 'consultation_paid', 
  'active', 'in_progress', 'completed', 'closed', 'cancelled'
));

-- Create index for payment queries
CREATE INDEX IF NOT EXISTS idx_cases_payment_status ON cases(payment_status);
CREATE INDEX IF NOT EXISTS idx_cases_consultation_paid ON cases(consultation_paid);

-- Update RLS policies to handle new statuses
-- (Existing policies should automatically cover new statuses since they use user_id and assigned_lawyer_id checks)