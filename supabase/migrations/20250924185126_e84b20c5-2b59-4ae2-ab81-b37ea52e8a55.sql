-- Simple retroactive bot detection for high page view rates
-- Focus on the critical issue: visitors with impossible page view rates

UPDATE visitor_analytics 
SET 
  bot_confidence_score = CASE
    WHEN session_duration > 0 AND page_views_count > 0 THEN
      CASE 
        WHEN (page_views_count::NUMERIC / session_duration) > 2 THEN 95
        WHEN (page_views_count::NUMERIC / session_duration) > 1 THEN 80  
        WHEN (page_views_count::NUMERIC / session_duration) > 0.5 THEN 60
        WHEN page_views_count > 100 AND session_duration < 300 THEN 70
        WHEN user_agent ~* 'chrome/1[4-9][0-9]' THEN 50
        WHEN user_agent ~* 'Android 10; K' OR user_agent ~* 'Android 9; K' THEN 40
        ELSE COALESCE(bot_confidence_score, 0)
      END
    ELSE COALESCE(bot_confidence_score, 0)
  END,
  
  bot_classification = CASE
    WHEN session_duration > 0 AND page_views_count > 0 THEN
      CASE 
        WHEN (page_views_count::NUMERIC / session_duration) > 2 THEN 'confirmed_bot'
        WHEN (page_views_count::NUMERIC / session_duration) > 1 THEN 'likely_bot'
        WHEN (page_views_count::NUMERIC / session_duration) > 0.5 THEN 'likely_bot'
        WHEN page_views_count > 100 AND session_duration < 300 THEN 'likely_bot'
        WHEN user_agent ~* 'chrome/1[4-9][0-9]' THEN 'likely_bot'
        WHEN user_agent ~* 'Android 10; K' OR user_agent ~* 'Android 9; K' THEN 'uncertain'
        ELSE COALESCE(bot_classification, 'human')
      END
    ELSE COALESCE(bot_classification, 'human')
  END,
  
  meaningful_interaction = CASE
    WHEN session_duration > 0 AND page_views_count > 0 THEN
      CASE 
        WHEN (page_views_count::NUMERIC / session_duration) > 0.5 THEN false
        WHEN page_views_count > 100 AND session_duration < 300 THEN false
        WHEN user_agent ~* 'chrome/1[4-9][0-9]' THEN false
        ELSE true
      END
    ELSE true
  END,
  
  updated_at = NOW()
  
WHERE session_duration > 0 
  AND page_views_count > 1
  AND (
    bot_classification IN ('human', 'likely_human', 'uncertain') OR
    bot_classification IS NULL OR
    (page_views_count::NUMERIC / session_duration) > 0.5 OR
    user_agent ~* 'chrome/1[4-9][0-9]' OR
    user_agent ~* 'Android 10; K' OR
    user_agent ~* 'Android 9; K'
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_visitor_analytics_bot_detection 
ON visitor_analytics (bot_classification, page_views_count, session_duration) 
WHERE session_duration > 0;

CREATE INDEX IF NOT EXISTS idx_visitor_analytics_page_view_rate 
ON visitor_analytics ((page_views_count::NUMERIC / NULLIF(session_duration, 0))) 
WHERE session_duration > 0 AND page_views_count > 0;