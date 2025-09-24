-- Create additional_fee_requests table
CREATE TABLE public.additional_fee_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id uuid NOT NULL,
  lawyer_id uuid NOT NULL,
  client_id uuid NOT NULL,
  original_proposal_id uuid NOT NULL,
  request_title text NOT NULL,
  request_description text NOT NULL,
  additional_fee_amount numeric(10,2) NOT NULL,
  timeline_extension_days integer DEFAULT 0,
  justification text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  client_response text,
  client_responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  payment_due_date timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.additional_fee_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Lawyers can create additional fee requests for their cases"
ON public.additional_fee_requests
FOR INSERT
WITH CHECK (
  lawyer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM cases 
    WHERE id = additional_fee_requests.case_id 
    AND assigned_lawyer_id = auth.uid()
  )
);

CREATE POLICY "Lawyers can view their additional fee requests"
ON public.additional_fee_requests
FOR SELECT
USING (lawyer_id = auth.uid());

CREATE POLICY "Clients can view requests for their cases"
ON public.additional_fee_requests
FOR SELECT
USING (client_id = auth.uid());

CREATE POLICY "Clients can update request responses"
ON public.additional_fee_requests
FOR UPDATE
USING (client_id = auth.uid())
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins can view all additional fee requests"
ON public.additional_fee_requests
FOR SELECT
USING (has_admin_role());

CREATE POLICY "Admins can update all additional fee requests"
ON public.additional_fee_requests
FOR UPDATE
USING (has_admin_role());

-- Add trigger for updated_at
CREATE TRIGGER update_additional_fee_requests_updated_at
  BEFORE UPDATE ON public.additional_fee_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_additional_fee_requests_case_id ON public.additional_fee_requests(case_id);
CREATE INDEX idx_additional_fee_requests_lawyer_id ON public.additional_fee_requests(lawyer_id);
CREATE INDEX idx_additional_fee_requests_client_id ON public.additional_fee_requests(client_id);
CREATE INDEX idx_additional_fee_requests_status ON public.additional_fee_requests(status);