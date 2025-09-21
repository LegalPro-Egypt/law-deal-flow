-- Create content_translations table for caching translations
CREATE TABLE public.content_translations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cache_key TEXT NOT NULL,
  original_content TEXT NOT NULL,
  translated_content TEXT NOT NULL,
  source_language VARCHAR(5) NOT NULL,
  target_language VARCHAR(5) NOT NULL,
  content_type VARCHAR(50) DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient lookups
CREATE INDEX idx_content_translations_cache_key ON public.content_translations(cache_key);
CREATE INDEX idx_content_translations_target_lang ON public.content_translations(target_language);
CREATE UNIQUE INDEX idx_content_translations_unique ON public.content_translations(cache_key, target_language);

-- Create trigger for updated_at
CREATE TRIGGER update_content_translations_updated_at
  BEFORE UPDATE ON public.content_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

-- Create policies for content translations (accessible to all authenticated users for caching)
CREATE POLICY "Content translations are readable by authenticated users"
  ON public.content_translations
  FOR SELECT
  USING (true);

CREATE POLICY "Content translations are insertable by authenticated users"
  ON public.content_translations
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Content translations are updatable by authenticated users"
  ON public.content_translations
  FOR UPDATE
  USING (true);