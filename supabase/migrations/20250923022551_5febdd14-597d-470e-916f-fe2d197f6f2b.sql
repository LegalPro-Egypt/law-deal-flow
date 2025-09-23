UPDATE cases 
SET 
  consultation_paid = true,
  payment_status = 'paid',
  payment_amount = 500.00,
  payment_date = now(),
  status = 'in_progress',
  updated_at = now()
WHERE case_number = 'CASE-2025-263-223703-IJJWGT';