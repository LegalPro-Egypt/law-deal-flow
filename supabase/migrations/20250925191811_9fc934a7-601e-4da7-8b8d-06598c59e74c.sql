-- Create money requests table
CREATE TABLE public.money_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_intent_id TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.money_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for money requests
CREATE POLICY "Lawyers can create money requests for their cases" 
ON public.money_requests 
FOR INSERT 
WITH CHECK (
  lawyer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = money_requests.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
);

CREATE POLICY "Lawyers can view their money requests" 
ON public.money_requests 
FOR SELECT 
USING (lawyer_id = auth.uid());

CREATE POLICY "Clients can view money requests for their cases" 
ON public.money_requests 
FOR SELECT 
USING (client_id = auth.uid());

CREATE POLICY "Clients can update payment status" 
ON public.money_requests 
FOR UPDATE 
USING (client_id = auth.uid());

CREATE POLICY "Admins can manage all money requests" 
ON public.money_requests 
FOR ALL 
USING (has_admin_role());

-- Create function to update timestamps
CREATE TRIGGER update_money_requests_updated_at
  BEFORE UPDATE ON public.money_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create notification trigger for money requests
CREATE OR REPLACE FUNCTION public.create_money_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  case_title TEXT;
  lawyer_name TEXT;
BEGIN
  -- Get case title
  SELECT cases.title INTO case_title
  FROM cases 
  WHERE cases.id = NEW.case_id;
  
  -- Get lawyer name
  SELECT COALESCE(profiles.first_name || ' ' || profiles.last_name, profiles.email) 
  INTO lawyer_name
  FROM profiles 
  WHERE profiles.user_id = NEW.lawyer_id;
  
  -- Create notification for the client
  INSERT INTO public.notifications (
    user_id,
    case_id,
    type,
    category,
    title,
    message,
    action_required,
    metadata
  ) VALUES (
    NEW.client_id,
    NEW.case_id,
    'money_request',
    'payment',
    'Payment Request',
    lawyer_name || ' has requested ' || NEW.amount || ' ' || NEW.currency || ' for case: ' || case_title,
    true,
    jsonb_build_object(
      'money_request_id', NEW.id,
      'amount', NEW.amount,
      'currency', NEW.currency,
      'lawyer_name', lawyer_name
    )
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for money request notifications
CREATE TRIGGER create_money_request_notification_trigger
  AFTER INSERT ON public.money_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.create_money_request_notification();

-- Enable realtime for money requests
ALTER TABLE public.money_requests REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.money_requests;