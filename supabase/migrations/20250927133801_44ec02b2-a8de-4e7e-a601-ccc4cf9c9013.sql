-- Create form_policies table for managing forms and policies with versioning
CREATE TABLE public.form_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('lawyer_forms', 'client_forms', 'client_policies', 'lawyer_policies')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  schema JSONB,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.form_policies ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access only
CREATE POLICY "Admins can view all form policies" 
ON public.form_policies 
FOR SELECT 
USING (has_admin_role());

CREATE POLICY "Admins can create form policies" 
ON public.form_policies 
FOR INSERT 
WITH CHECK (has_admin_role());

CREATE POLICY "Admins can update form policies" 
ON public.form_policies 
FOR UPDATE 
USING (has_admin_role());

CREATE POLICY "Admins can delete form policies" 
ON public.form_policies 
FOR DELETE 
USING (has_admin_role());

-- Create trigger for updating updated_at timestamp
CREATE TRIGGER update_form_policies_updated_at
BEFORE UPDATE ON public.form_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data for existing policies
INSERT INTO public.form_policies (type, title, content, status, version, change_note) VALUES
('client_policies', 'Privacy Policy', 'Our Privacy Policy content will be managed here.', 'published', 1, 'Initial migration from static content'),
('client_policies', 'Terms of Service', 'Our Terms of Service content will be managed here.', 'published', 1, 'Initial migration from static content'),
('lawyer_policies', 'Lawyer Privacy Policy', 'Lawyer Privacy Policy content will be managed here.', 'published', 1, 'Initial migration from static content'),
('lawyer_policies', 'Lawyer Terms of Service', 'Lawyer Terms of Service content will be managed here.', 'published', 1, 'Initial migration from static content'),
('client_forms', 'Client Registration Form', 'Client registration form configuration.', 'published', 1, 'Initial form setup'),
('lawyer_forms', 'Lawyer Profile Form', 'Lawyer profile and verification form configuration.', 'published', 1, 'Initial form setup');