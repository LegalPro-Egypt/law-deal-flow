-- Add bot detection columns to visitor_analytics table
ALTER TABLE visitor_analytics 
ADD COLUMN bot_confidence_score INTEGER DEFAULT 0 CHECK (bot_confidence_score >= 0 AND bot_confidence_score <= 100),
ADD COLUMN bot_classification TEXT DEFAULT 'human' CHECK (bot_classification IN ('human', 'likely_human', 'uncertain', 'likely_bot', 'confirmed_bot')),
ADD COLUMN detection_reasons JSONB DEFAULT '[]'::jsonb,
ADD COLUMN is_excluded_admin BOOLEAN DEFAULT false,
ADD COLUMN meaningful_interaction BOOLEAN DEFAULT true,
ADD COLUMN screen_resolution TEXT,
ADD COLUMN timezone TEXT,
ADD COLUMN language_preferences TEXT[];

-- Add index for bot classification queries
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_bot_classification 
ON visitor_analytics(bot_classification);

-- Add index for filtering non-bot traffic
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_human_traffic 
ON visitor_analytics(bot_classification, is_excluded) 
WHERE bot_classification IN ('human', 'likely_human');

-- Update existing records to have proper default values
UPDATE visitor_analytics 
SET bot_confidence_score = 0,
    bot_classification = 'human',
    detection_reasons = '[]'::jsonb,
    is_excluded_admin = CASE WHEN is_excluded = true THEN true ELSE false END,
    meaningful_interaction = true
WHERE bot_confidence_score IS NULL;