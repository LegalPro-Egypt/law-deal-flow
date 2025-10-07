-- Mark consultation payment as completed for testing case (fixed payment_status)
UPDATE cases 
SET 
  consultation_paid = true,
  payment_status = 'paid',
  payment_amount = 530.00,
  payment_date = NOW()
WHERE id = 'e30b4e4c-202b-4d93-b658-034615578e42';