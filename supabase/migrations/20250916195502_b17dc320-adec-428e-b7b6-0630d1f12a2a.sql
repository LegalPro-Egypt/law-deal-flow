-- Create verification status enum
CREATE TYPE public.verification_status AS ENUM ('pending_basic', 'pending_complete', 'verified');

-- Add new columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pricing_structure jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS lawyer_card_url text,
ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending_basic',
ADD COLUMN IF NOT EXISTS team_breakdown jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS professional_memberships text[],
ADD COLUMN IF NOT EXISTS consultation_methods text[] DEFAULT ARRAY['in-person'],
ADD COLUMN IF NOT EXISTS notable_achievements text,
ADD COLUMN IF NOT EXISTS payment_structures text[] DEFAULT ARRAY['hourly'];

-- Rename employee_count to team_size for clarity
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'employee_count') THEN
        ALTER TABLE public.profiles RENAME COLUMN employee_count TO team_size;
    END IF;
END $$;

-- Update existing profiles to have proper verification status
UPDATE public.profiles 
SET verification_status = 'pending_complete' 
WHERE role = 'lawyer' AND is_active = true AND verification_status = 'pending_basic';

-- Create index for better performance on verification queries
CREATE INDEX IF NOT EXISTS idx_profiles_verification_status ON public.profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_profiles_role_verification ON public.profiles(role, verification_status);