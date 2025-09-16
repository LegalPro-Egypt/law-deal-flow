-- Add columns for front and back lawyer card images
ALTER TABLE public.profiles 
ADD COLUMN lawyer_card_front_url text,
ADD COLUMN lawyer_card_back_url text;

-- Update RLS policies to allow lawyers to update these new fields
-- The existing policies already cover these columns since they allow users to update their own profiles