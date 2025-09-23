-- Add fee structure fields to proposals table
ALTER TABLE public.proposals 
ADD COLUMN platform_fee_percentage numeric DEFAULT 5.0,
ADD COLUMN payment_processing_fee_percentage numeric DEFAULT 3.0,
ADD COLUMN client_protection_fee_percentage numeric DEFAULT 3.0,
ADD COLUMN platform_fee_amount numeric DEFAULT 0,
ADD COLUMN payment_processing_fee_amount numeric DEFAULT 0,
ADD COLUMN client_protection_fee_amount numeric DEFAULT 0,
ADD COLUMN base_total_fee numeric DEFAULT 0,
ADD COLUMN total_additional_fees numeric DEFAULT 0,
ADD COLUMN final_total_fee numeric DEFAULT 0;