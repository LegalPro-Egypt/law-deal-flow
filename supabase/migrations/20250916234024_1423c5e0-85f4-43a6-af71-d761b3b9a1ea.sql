-- Add comprehensive contact information fields to profiles table
ALTER TABLE profiles 
ADD COLUMN office_address text,
ADD COLUMN private_phone text, 
ADD COLUMN office_phone text,
ADD COLUMN birth_date date;

-- Add check constraint to ensure birth_date is for adults (21+ for practicing law)
ALTER TABLE profiles 
ADD CONSTRAINT check_lawyer_age 
CHECK (birth_date IS NULL OR birth_date <= CURRENT_DATE - INTERVAL '21 years');