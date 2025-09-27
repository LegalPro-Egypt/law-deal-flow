-- Add terms acceptance fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN terms_accepted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN terms_version TEXT;

-- Insert form configuration for terms acceptance in lawyer profile form
INSERT INTO public.form_configurations (
  form_type,
  field_name,
  is_enabled,
  is_required,
  field_order,
  validation_rules,
  field_options,
  help_text,
  label_override
) VALUES (
  'lawyer_profile',
  'terms_acceptance',
  true,
  true,
  15,
  '{"required": true}'::jsonb,
  '{"type": "checkbox"}'::jsonb,
  'You must accept the Terms of Service and Privacy Policy to continue',
  'I accept the Terms of Service and Privacy Policy'
);