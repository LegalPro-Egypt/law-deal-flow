-- Clear demo payment data from the case
UPDATE cases SET 
  payment_status = 'pending',
  payment_amount = NULL,
  payment_date = NULL,
  consultation_fee = NULL,
  remaining_fee = NULL,
  total_fee = NULL,
  consultation_paid = false,
  status = 'proposal_accepted',
  updated_at = now()
WHERE id = 'e30b4e4c-202b-4d93-b658-034615578e42';

-- Remove any payment-related notifications for this case
DELETE FROM notifications 
WHERE case_id = 'e30b4e4c-202b-4d93-b658-034615578e42' 
  AND (type = 'payment_received' OR message LIKE '%payment%');