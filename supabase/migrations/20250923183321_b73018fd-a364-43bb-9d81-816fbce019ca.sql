-- Clean up legacy admin analytics data
-- Mark existing visits from admin IP as excluded
UPDATE visitor_analytics 
SET is_excluded = true, updated_at = now()
WHERE is_excluded = false 
  AND (
    -- Mark visits from known admin IP patterns
    visitor_hash IN (
      SELECT DISTINCT visitor_hash 
      FROM visitor_analytics 
      WHERE created_at > now() - INTERVAL '7 days'
        AND page_path = '/admin'
    )
    OR 
    -- Mark recent visits to admin pages
    page_path LIKE '/admin%'
  );

-- Create a function to clean up admin analytics data
CREATE OR REPLACE FUNCTION public.cleanup_admin_analytics_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Mark admin visits as excluded based on admin page access patterns
  UPDATE visitor_analytics 
  SET is_excluded = true, updated_at = now()
  WHERE is_excluded = false 
    AND (
      page_path LIKE '/admin%' 
      OR visitor_hash IN (
        SELECT DISTINCT visitor_hash 
        FROM visitor_analytics 
        WHERE page_path = '/admin'
      )
    );
    
  RAISE NOTICE 'Cleaned up admin analytics data at %', now();
END;
$$;