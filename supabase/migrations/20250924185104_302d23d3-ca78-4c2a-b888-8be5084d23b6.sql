-- Corrected retroactive bot detection cleanup and reclassification
-- This migration applies the new advanced bot detection algorithm to existing data

-- Add function to reclassify existing visitors based on page view rates
CREATE OR REPLACE FUNCTION reclassify_visitor_bots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  visitor_record RECORD;
  page_view_rate NUMERIC;
  page_view_rate_per_minute NUMERIC;
  new_score INTEGER;
  new_classification TEXT;
  new_reasons JSONB := '[]'::jsonb;
  existing_reasons JSONB;
BEGIN
  -- Process visitors with suspicious page view patterns
  FOR visitor_record IN 
    SELECT 
      id, 
      page_views_count, 
      session_duration, 
      user_agent,
      bot_classification,
      bot_confidence_score,
      detection_reasons
    FROM visitor_analytics 
    WHERE session_duration > 0 
      AND page_views_count > 1
      AND (
        bot_classification IN ('human', 'likely_human', 'uncertain') OR
        bot_classification IS NULL
      )
  LOOP
    new_score := 0;
    new_reasons := '[]'::jsonb;
    
    -- Calculate page view rates
    page_view_rate := visitor_record.page_views_count::NUMERIC / visitor_record.session_duration;
    page_view_rate_per_minute := visitor_record.page_views_count::NUMERIC / (visitor_record.session_duration / 60.0);
    
    -- Apply enhanced bot detection rules
    IF page_view_rate > 2 THEN
      new_reasons := new_reasons || to_jsonb('Extreme page view rate: ' || ROUND(page_view_rate, 2) || ' pages/sec');
      new_score := new_score + 95;
    ELSIF page_view_rate > 1 THEN
      new_reasons := new_reasons || to_jsonb('Very high page view rate: ' || ROUND(page_view_rate, 2) || ' pages/sec');
      new_score := new_score + 80;
    ELSIF page_view_rate > 0.5 THEN
      new_reasons := new_reasons || to_jsonb('High page view rate: ' || ROUND(page_view_rate, 2) || ' pages/sec');
      new_score := new_score + 60;
    ELSIF page_view_rate_per_minute > 30 THEN
      new_reasons := new_reasons || to_jsonb('High page view rate: ' || ROUND(page_view_rate_per_minute, 1) || ' pages/min');
      new_score := new_score + 40;
    END IF;
    
    -- Rapid browsing patterns
    IF visitor_record.page_views_count > 100 AND visitor_record.session_duration < 300 THEN
      new_reasons := new_reasons || to_jsonb('Rapid browsing: ' || visitor_record.page_views_count || ' pages in ' || visitor_record.session_duration || 's');
      new_score := new_score + 70;
    END IF;
    
    -- Enhanced user agent checks
    IF visitor_record.user_agent ~* 'chrome/1[4-9][0-9]' THEN
      new_reasons := new_reasons || to_jsonb('Invalid Chrome version detected');
      new_score := new_score + 50;
    END IF;
    
    IF visitor_record.user_agent ~* 'Android 10; K' OR visitor_record.user_agent ~* 'Android 9; K' THEN
      new_reasons := new_reasons || to_jsonb('Generic Android device identifier');
      new_score := new_score + 40;
    END IF;
    
    -- Determine new classification
    IF new_score >= 90 THEN
      new_classification := 'confirmed_bot';
    ELSIF new_score >= 65 THEN
      new_classification := 'likely_bot';
    ELSIF new_score >= 40 THEN
      new_classification := 'uncertain';
    ELSIF new_score >= 15 THEN
      new_classification := 'likely_human';
    ELSE
      new_classification := 'human';
    END IF;
    
    -- Update record if score changed significantly
    IF new_score > COALESCE(visitor_record.bot_confidence_score, 0) THEN
      -- Combine existing reasons with new ones
      existing_reasons := COALESCE(visitor_record.detection_reasons, '[]'::jsonb);
      
      UPDATE visitor_analytics 
      SET 
        bot_confidence_score = LEAST(new_score, 100),
        bot_classification = new_classification,
        detection_reasons = existing_reasons || new_reasons,
        meaningful_interaction = (new_classification IN ('human', 'likely_human')),
        updated_at = NOW()
      WHERE id = visitor_record.id;
      
      RAISE NOTICE 'Reclassified visitor % from % to % (score: % -> %)', 
        visitor_record.id, 
        COALESCE(visitor_record.bot_classification, 'null'), 
        new_classification,
        COALESCE(visitor_record.bot_confidence_score, 0),
        new_score;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Completed retroactive bot detection reclassification';
END;
$$;

-- Execute the reclassification function
SELECT reclassify_visitor_bots();

-- Create index for better performance on bot detection queries
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_bot_detection 
ON visitor_analytics (bot_classification, page_views_count, session_duration) 
WHERE session_duration > 0;

-- Create index for page view rate analysis
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_page_view_rate 
ON visitor_analytics ((page_views_count::NUMERIC / NULLIF(session_duration, 0))) 
WHERE session_duration > 0 AND page_views_count > 0;