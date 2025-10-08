-- Add national_id_passport field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN national_id_passport TEXT;