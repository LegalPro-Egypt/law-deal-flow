-- Update existing proposals with calculated additional fees
UPDATE public.proposals 
SET 
  platform_fee_percentage = 5.0,
  payment_processing_fee_percentage = 3.0,
  client_protection_fee_percentage = 3.0,
  base_total_fee = COALESCE(remaining_fee, 0),
  platform_fee_amount = ROUND(COALESCE(remaining_fee, 0) * 0.05, 2),
  payment_processing_fee_amount = ROUND(COALESCE(remaining_fee, 0) * 0.03, 2),
  client_protection_fee_amount = ROUND(COALESCE(remaining_fee, 0) * 0.03, 2),
  total_additional_fees = ROUND(COALESCE(remaining_fee, 0) * 0.11, 2),
  final_total_fee = COALESCE(remaining_fee, 0) + ROUND(COALESCE(remaining_fee, 0) * 0.11, 2),
  updated_at = now()
WHERE 
  total_additional_fees = 0 OR total_additional_fees IS NULL;