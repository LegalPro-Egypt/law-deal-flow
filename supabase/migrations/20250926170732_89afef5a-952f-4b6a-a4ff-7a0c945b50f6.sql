-- Create support tickets table to store copies of support messages
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium',
  source TEXT DEFAULT 'contact_form',
  user_agent TEXT,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT
);

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies for support tickets
CREATE POLICY "Admins can view all support tickets" 
ON public.support_tickets 
FOR SELECT 
USING (has_admin_role());

CREATE POLICY "Admins can update support tickets" 
ON public.support_tickets 
FOR UPDATE 
USING (has_admin_role());

CREATE POLICY "Admins can insert support tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (has_admin_role());

CREATE POLICY "System can create support tickets" 
ON public.support_tickets 
FOR INSERT 
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON public.support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_email ON public.support_tickets(email);