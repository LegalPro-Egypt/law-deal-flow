-- Add terms acceptance configuration for personal_details form
INSERT INTO form_configurations (
  form_type,
  field_name,
  is_enabled,
  is_required,
  field_order,
  label_override,
  help_text,
  validation_rules,
  field_options
) VALUES (
  'personal_details',
  'terms_acceptance',
  true,
  true,
  7,
  'Terms and Privacy Agreement',
  'By checking this box, you agree to our Terms of Service and Privacy Policy',
  '{"required": true, "type": "boolean"}',
  '{"links": [{"text": "Terms of Service", "url": "/terms-of-service"}, {"text": "Privacy Policy", "url": "/privacy-policy"}]}'
);