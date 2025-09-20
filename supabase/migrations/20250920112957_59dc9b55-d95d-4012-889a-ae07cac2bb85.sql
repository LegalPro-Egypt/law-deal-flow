-- Fix case_number generation to prevent duplicates by adding seconds and random suffix
ALTER TABLE public.cases 
ALTER COLUMN case_number 
SET DEFAULT (
  'CASE-' || 
  EXTRACT(year FROM now()) || '-' ||
  lpad((EXTRACT(doy FROM now()))::text, 3, '0') || '-' ||
  lpad((EXTRACT(hour FROM now()))::text, 2, '0') || 
  lpad((EXTRACT(minute FROM now()))::text, 2, '0') ||
  lpad((EXTRACT(second FROM now()))::integer::text, 2, '0') || '-' ||
  substr(gen_random_uuid()::text, 1, 8)
);