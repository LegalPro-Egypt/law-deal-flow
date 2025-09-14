-- Create lawyer_requests table for managing lawyer access requests
CREATE TABLE public.lawyer_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  law_firm TEXT,
  specializations TEXT[],
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT
);

-- Enable RLS on lawyer_requests
ALTER TABLE public.lawyer_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for lawyer_requests
CREATE POLICY "Anyone can submit a lawyer request" 
ON public.lawyer_requests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Users can view their own requests" 
ON public.lawyer_requests 
FOR SELECT 
USING (auth.jwt() ->> 'email' = email OR EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

CREATE POLICY "Only admins can update lawyer requests" 
ON public.lawyer_requests 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create function to enforce admin email restriction
CREATE OR REPLACE FUNCTION public.enforce_admin_email_restriction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'admin' AND NEW.email != 'dankevforster@gmail.com' THEN
    RAISE EXCEPTION 'Admin role is restricted to dankevforster@gmail.com only';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce admin restriction on profiles
CREATE TRIGGER enforce_admin_email_restriction_trigger
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_admin_email_restriction();

-- Create trigger for updating lawyer_requests updated_at
CREATE TRIGGER update_lawyer_requests_updated_at
  BEFORE UPDATE ON public.lawyer_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient querying
CREATE INDEX idx_lawyer_requests_status ON public.lawyer_requests(status);
CREATE INDEX idx_lawyer_requests_email ON public.lawyer_requests(email);