-- Create email_signups table for launch notifications
CREATE TABLE public.email_signups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified BOOLEAN NOT NULL DEFAULT false,
  source TEXT DEFAULT 'launching_soon',
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.email_signups ENABLE ROW LEVEL SECURITY;

-- Create policies for email signups
CREATE POLICY "Anyone can sign up for email notifications" 
ON public.email_signups 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all email signups" 
ON public.email_signups 
FOR SELECT 
USING (has_admin_role());

CREATE POLICY "Admins can update email signups" 
ON public.email_signups 
FOR UPDATE 
USING (has_admin_role());

-- Create index for email lookups
CREATE INDEX idx_email_signups_email ON public.email_signups(email);
CREATE INDEX idx_email_signups_created_at ON public.email_signups(created_at);