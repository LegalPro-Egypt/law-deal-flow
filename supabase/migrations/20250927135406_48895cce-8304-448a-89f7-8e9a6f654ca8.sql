-- Create form configurations table for managing dynamic form settings
CREATE TABLE public.form_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type TEXT NOT NULL, -- 'lawyer_profile', 'personal_details', 'lawyer_verification'
  field_name TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_required BOOLEAN NOT NULL DEFAULT false,
  field_order INTEGER NOT NULL DEFAULT 0,
  validation_rules JSONB DEFAULT '{}',
  field_options JSONB DEFAULT '{}', -- For dropdowns, checkboxes, etc.
  help_text TEXT,
  label_override TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(form_type, field_name)
);

-- Enable RLS
ALTER TABLE public.form_configurations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage form configurations" 
ON public.form_configurations 
FOR ALL 
USING (has_admin_role())
WITH CHECK (has_admin_role());

-- Create form field presets table for managing dropdown options
CREATE TABLE public.form_field_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  preset_type TEXT NOT NULL, -- 'specializations', 'languages', 'bar_admissions', etc.
  option_value TEXT NOT NULL,
  option_label TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(preset_type, option_value)
);

-- Enable RLS  
ALTER TABLE public.form_field_presets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view active form presets"
ON public.form_field_presets 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage form presets"
ON public.form_field_presets 
FOR ALL 
USING (has_admin_role())
WITH CHECK (has_admin_role());

-- Insert default form field presets
INSERT INTO public.form_field_presets (preset_type, option_value, option_label, display_order) VALUES
-- Specializations
('specializations', 'corporate_law', 'Corporate Law', 1),
('specializations', 'criminal_law', 'Criminal Law', 2),
('specializations', 'family_law', 'Family Law', 3),
('specializations', 'real_estate_law', 'Real Estate Law', 4),
('specializations', 'labor_law', 'Labor Law', 5),
('specializations', 'commercial_law', 'Commercial Law', 6),
('specializations', 'administrative_law', 'Administrative Law', 7),
('specializations', 'tax_law', 'Tax Law', 8),
('specializations', 'intellectual_property', 'Intellectual Property', 9),
('specializations', 'banking_finance', 'Banking & Finance', 10),

-- Languages
('languages', 'Arabic', 'Arabic', 1),
('languages', 'English', 'English', 2),
('languages', 'French', 'French', 3),
('languages', 'German', 'German', 4),
('languages', 'Italian', 'Italian', 5),

-- Bar Admissions
('bar_admissions', 'cairo_bar', 'Cairo Bar Association', 1),
('bar_admissions', 'alexandria_bar', 'Alexandria Bar Association', 2),
('bar_admissions', 'giza_bar', 'Giza Bar Association', 3),
('bar_admissions', 'mansoura_bar', 'Mansoura Bar Association', 4),
('bar_admissions', 'tanta_bar', 'Tanta Bar Association', 5);

-- Insert default form configurations for lawyer profile
INSERT INTO public.form_configurations (form_type, field_name, is_enabled, is_required, field_order, help_text) VALUES
('lawyer_profile', 'firstName', true, true, 1, 'Enter your first name as it appears on official documents'),
('lawyer_profile', 'lastName', true, true, 2, 'Enter your last name as it appears on official documents'),
('lawyer_profile', 'officePhone', true, true, 3, 'Primary office phone number for client contact'),
('lawyer_profile', 'privatePhone', true, false, 4, 'Optional private phone number'),
('lawyer_profile', 'officeAddress', true, true, 5, 'Complete office address including street, city, and postal code'),
('lawyer_profile', 'birthDate', true, true, 6, 'Date of birth for verification purposes'),
('lawyer_profile', 'lawFirm', true, false, 7, 'Name of your law firm or practice'),
('lawyer_profile', 'teamSize', true, true, 8, 'Number of legal professionals in your practice'),
('lawyer_profile', 'yearsExperience', true, true, 9, 'Years of active legal practice experience'),
('lawyer_profile', 'licenseNumber', true, true, 10, 'Valid bar association license number'),
('lawyer_profile', 'bio', true, false, 11, 'Professional biography highlighting your expertise and approach'),
('lawyer_profile', 'specializations', true, true, 12, 'Select your areas of legal specialization'),
('lawyer_profile', 'barAdmissions', true, true, 13, 'Bar associations where you are admitted to practice'),
('lawyer_profile', 'languages', true, true, 14, 'Languages you can provide legal services in');

-- Insert default form configurations for personal details
INSERT INTO public.form_configurations (form_type, field_name, is_enabled, is_required, field_order, help_text) VALUES
('personal_details', 'fullName', true, true, 1, 'Enter your full legal name'),
('personal_details', 'email', true, true, 2, 'Valid email address for account communications'),
('personal_details', 'phone', true, true, 3, 'Primary phone number for case updates'),
('personal_details', 'preferredLanguage', true, true, 4, 'Language preference for legal consultations'),
('personal_details', 'address', true, true, 5, 'Complete residential or business address'),
('personal_details', 'alternateContact', true, false, 6, 'Alternative contact method or emergency contact');

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_form_configurations_updated_at 
  BEFORE UPDATE ON public.form_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_field_presets_updated_at 
  BEFORE UPDATE ON public.form_field_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();