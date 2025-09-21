-- Create pro bono applications table
CREATE TABLE public.pro_bono_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  financial_info JSONB NOT NULL DEFAULT '{}',
  case_details JSONB NOT NULL DEFAULT '{}',
  supporting_documents TEXT[],
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  admin_response TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pro_bono_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create their own applications"
ON public.pro_bono_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view their own applications"
ON public.pro_bono_applications
FOR SELECT
USING (auth.uid() = user_id OR has_admin_role());

CREATE POLICY "Admins can update applications"
ON public.pro_bono_applications
FOR UPDATE
USING (has_admin_role());

CREATE POLICY "Admins can view all applications"
ON public.pro_bono_applications
FOR SELECT
USING (has_admin_role());

-- Create trigger for updated_at
CREATE TRIGGER update_pro_bono_applications_updated_at
BEFORE UPDATE ON public.pro_bono_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();