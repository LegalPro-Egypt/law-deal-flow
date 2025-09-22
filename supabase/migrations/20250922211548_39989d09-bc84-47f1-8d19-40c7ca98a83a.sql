-- Create visitor analytics table for tracking website visitors
CREATE TABLE public.visitor_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  visitor_hash TEXT NOT NULL,
  country TEXT,
  city TEXT,
  region TEXT,
  user_agent TEXT,
  device_type TEXT,
  browser TEXT,
  page_path TEXT NOT NULL,
  referrer_url TEXT,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  first_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_visit TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  page_views_count INTEGER NOT NULL DEFAULT 1,
  session_duration INTEGER DEFAULT 0,
  is_excluded BOOLEAN NOT NULL DEFAULT false,
  ip_info JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.visitor_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for visitor analytics
CREATE POLICY "Admins can view all visitor analytics" 
ON public.visitor_analytics 
FOR SELECT 
USING (has_admin_role());

CREATE POLICY "System can insert visitor analytics" 
ON public.visitor_analytics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update visitor analytics" 
ON public.visitor_analytics 
FOR UPDATE 
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_visitor_analytics_visitor_hash ON public.visitor_analytics(visitor_hash);
CREATE INDEX idx_visitor_analytics_country ON public.visitor_analytics(country);
CREATE INDEX idx_visitor_analytics_created_at ON public.visitor_analytics(created_at);
CREATE INDEX idx_visitor_analytics_session_id ON public.visitor_analytics(session_id);
CREATE INDEX idx_visitor_analytics_excluded ON public.visitor_analytics(is_excluded);

-- Create function to update timestamps
CREATE TRIGGER update_visitor_analytics_updated_at
BEFORE UPDATE ON public.visitor_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();