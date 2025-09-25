-- First, let's see what notification types currently exist and create a comprehensive enum
DO $$ 
BEGIN
  -- Drop the failed enum if it exists
  DROP TYPE IF EXISTS notification_type CASCADE;
  
  -- Create comprehensive notification type enum including all existing values
  CREATE TYPE notification_type AS ENUM (
    'case_activity',
    'missed_call', 
    'missed_message',
    'proposal_received',
    'proposal_approved',
    'proposal_rejected', 
    'payment_request',
    'payment_completed',
    'case_assigned',
    'communication_request',
    'system_update',
    'general'
  );
END $$;

-- Create case activities table for lawyer progress logs
CREATE TABLE public.case_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'progress_update',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  hours_worked NUMERIC,
  attachments JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.case_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for case_activities
CREATE POLICY "Lawyers can create activities for their assigned cases" 
ON public.case_activities 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = case_activities.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
);

CREATE POLICY "Lawyers can view activities for their assigned cases" 
ON public.case_activities 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = case_activities.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
);

CREATE POLICY "Clients can view activities for their cases" 
ON public.case_activities 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = case_activities.case_id 
    AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Lawyers can update their own activities" 
ON public.case_activities 
FOR UPDATE 
USING (lawyer_id = auth.uid());

CREATE POLICY "Admins can manage all activities" 
ON public.case_activities 
FOR ALL 
USING (has_admin_role())
WITH CHECK (has_admin_role());

-- Create indexes
CREATE INDEX idx_case_activities_case_id ON public.case_activities(case_id);
CREATE INDEX idx_case_activities_lawyer_id ON public.case_activities(lawyer_id);
CREATE INDEX idx_case_activities_created_at ON public.case_activities(created_at DESC);

-- Add trigger for updated_at
CREATE TRIGGER update_case_activities_updated_at
  BEFORE UPDATE ON public.case_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enhanced notifications table with better categorization
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Update notifications table to use the new enum (only if current values are compatible)
ALTER TABLE public.notifications ALTER COLUMN type TYPE notification_type USING 
  CASE 
    WHEN type = 'proposal_approved' THEN 'proposal_approved'::notification_type
    WHEN type = 'proposal_rejected' THEN 'proposal_rejected'::notification_type
    WHEN type = 'payment_request' THEN 'payment_request'::notification_type
    WHEN type = 'payment_completed' THEN 'payment_completed'::notification_type
    WHEN type = 'case_assigned' THEN 'case_assigned'::notification_type
    ELSE 'general'::notification_type
  END;

-- Function to automatically create notifications when case activities are added
CREATE OR REPLACE FUNCTION public.create_case_activity_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  client_user_id UUID;
  case_title TEXT;
BEGIN
  -- Get the client user_id and case title
  SELECT cases.user_id, cases.title 
  INTO client_user_id, case_title
  FROM cases 
  WHERE cases.id = NEW.case_id;
  
  -- Create notification for the client
  IF client_user_id IS NOT NULL THEN
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
      client_user_id,
      NEW.case_id,
      'case_activity',
      'case_update',
      'New Progress Update',
      'Your lawyer has added a new update to your case: ' || case_title,
      false,
      jsonb_build_object(
        'activity_id', NEW.id,
        'activity_title', NEW.title,
        'lawyer_id', NEW.lawyer_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for case activity notifications
CREATE TRIGGER create_case_activity_notification_trigger
  AFTER INSERT ON public.case_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.create_case_activity_notification();