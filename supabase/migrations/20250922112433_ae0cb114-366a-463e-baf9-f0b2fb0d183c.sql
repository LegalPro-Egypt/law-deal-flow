-- Create proposals table for dedicated proposal storage
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  consultation_fee NUMERIC,
  remaining_fee NUMERIC,
  total_fee NUMERIC,
  timeline TEXT,
  strategy TEXT,
  generated_content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  viewed_at TIMESTAMP WITH TIME ZONE,
  response_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create notifications table for inbox system
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  case_id UUID,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  action_required BOOLEAN NOT NULL DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS on proposals table
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for proposals
CREATE POLICY "Lawyers can create proposals for assigned cases"
ON public.proposals
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = proposals.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
);

CREATE POLICY "Clients can view their proposals"
ON public.proposals
FOR SELECT
USING (client_id = auth.uid());

CREATE POLICY "Lawyers can view their created proposals"
ON public.proposals
FOR SELECT
USING (lawyer_id = auth.uid());

CREATE POLICY "Clients can update proposal status"
ON public.proposals
FOR UPDATE
USING (client_id = auth.uid());

CREATE POLICY "Admins can view all proposals"
ON public.proposals
FOR SELECT
USING (has_admin_role());

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all notifications"
ON public.notifications
FOR SELECT
USING (has_admin_role());

-- Add indexes for better performance
CREATE INDEX idx_proposals_case_id ON public.proposals(case_id);
CREATE INDEX idx_proposals_client_id ON public.proposals(client_id);
CREATE INDEX idx_proposals_lawyer_id ON public.proposals(lawyer_id);
CREATE INDEX idx_proposals_status ON public.proposals(status);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_case_id ON public.notifications(case_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_type ON public.notifications(type);

-- Add triggers for timestamps
CREATE TRIGGER update_proposals_updated_at
BEFORE UPDATE ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;