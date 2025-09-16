-- Create lawyer_invitations table to track invited lawyers
CREATE TABLE public.lawyer_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  invited_by UUID NOT NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on lawyer_invitations
ALTER TABLE public.lawyer_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for lawyer_invitations
CREATE POLICY "Admins can view all invitations" 
ON public.lawyer_invitations 
FOR SELECT 
USING (has_admin_role());

CREATE POLICY "Admins can create invitations" 
ON public.lawyer_invitations 
FOR INSERT 
WITH CHECK (has_admin_role());

CREATE POLICY "Admins can update invitations" 
ON public.lawyer_invitations 
FOR UPDATE 
USING (has_admin_role());

-- Add lawyer-specific fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN law_firm TEXT,
ADD COLUMN employee_count INTEGER,
ADD COLUMN profile_picture_url TEXT,
ADD COLUMN credentials_documents TEXT[],
ADD COLUMN bio TEXT,
ADD COLUMN years_experience INTEGER,
ADD COLUMN license_number TEXT,
ADD COLUMN bar_admissions TEXT[],
ADD COLUMN languages TEXT[] DEFAULT ARRAY['en'];

-- Create storage bucket for lawyer documents and profile pictures
INSERT INTO storage.buckets (id, name, public) VALUES ('lawyer-documents', 'lawyer-documents', false);

-- Create storage policies for lawyer documents
CREATE POLICY "Users can upload their own lawyer documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'lawyer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own lawyer documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'lawyer-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all lawyer documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'lawyer-documents' AND has_admin_role());

-- Create trigger for updating lawyer_invitations updated_at
CREATE TRIGGER update_lawyer_invitations_updated_at
BEFORE UPDATE ON public.lawyer_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();