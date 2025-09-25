-- Create appointments table for scheduling
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  lawyer_id UUID NOT NULL,
  client_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  appointment_type TEXT NOT NULL DEFAULT 'consultation', -- consultation, meeting, call, etc.
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, confirmed, cancelled, completed
  location TEXT, -- for in-person meetings
  meeting_link TEXT, -- for virtual meetings
  notes TEXT,
  created_by UUID NOT NULL, -- who created the appointment
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID,
  cancellation_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Clients can view their appointments"
ON public.appointments
FOR SELECT
USING (client_id = auth.uid());

CREATE POLICY "Lawyers can view their appointments"
ON public.appointments
FOR SELECT
USING (lawyer_id = auth.uid());

CREATE POLICY "Admins can view all appointments"
ON public.appointments
FOR SELECT
USING (has_admin_role());

CREATE POLICY "Lawyers can create appointments for their cases"
ON public.appointments
FOR INSERT
WITH CHECK (
  lawyer_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = appointments.case_id 
    AND cases.assigned_lawyer_id = auth.uid()
  )
);

CREATE POLICY "Clients can create appointments for their cases"
ON public.appointments
FOR INSERT
WITH CHECK (
  client_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = appointments.case_id 
    AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Participants can update their appointments"
ON public.appointments
FOR UPDATE
USING (lawyer_id = auth.uid() OR client_id = auth.uid() OR has_admin_role());

CREATE POLICY "Participants can delete their appointments"
ON public.appointments
FOR DELETE
USING (lawyer_id = auth.uid() OR client_id = auth.uid() OR has_admin_role());

-- Create function to update timestamps
CREATE TRIGGER update_appointments_updated_at
BEFORE UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create lawyer availability slots table
CREATE TABLE public.lawyer_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lawyer_id UUID NOT NULL,
  case_id UUID, -- optional: availability specific to a case
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security
ALTER TABLE public.lawyer_availability ENABLE ROW LEVEL SECURITY;

-- Create policies for lawyer availability
CREATE POLICY "Lawyers can manage their availability"
ON public.lawyer_availability
FOR ALL
USING (lawyer_id = auth.uid())
WITH CHECK (lawyer_id = auth.uid());

CREATE POLICY "Clients can view lawyer availability for their cases"
ON public.lawyer_availability
FOR SELECT
USING (
  case_id IS NULL OR 
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = lawyer_availability.case_id 
    AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all availability"
ON public.lawyer_availability
FOR SELECT
USING (has_admin_role());

-- Create trigger for availability timestamps
CREATE TRIGGER update_lawyer_availability_updated_at
BEFORE UPDATE ON public.lawyer_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();