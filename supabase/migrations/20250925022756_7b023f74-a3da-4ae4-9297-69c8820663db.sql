-- Fix search path for all functions to address security warnings
-- These functions already exist but may need search_path set

-- Check and update existing functions that might not have search_path set
ALTER FUNCTION public.is_original_admin(text) 
SET search_path = 'public';

ALTER FUNCTION public.check_profile_auth_consistency() 
SET search_path = 'public', 'auth';

ALTER FUNCTION public.handle_lawyer_profile_deletion() 
SET search_path = 'public';

ALTER FUNCTION public.cleanup_old_anonymous_sessions() 
SET search_path = 'public';

ALTER FUNCTION public.set_status_on_lawyer_assignment() 
SET search_path = 'public';

ALTER FUNCTION public.prevent_duplicate_case_submission() 
SET search_path = 'public';

ALTER FUNCTION public.update_communication_sessions_updated_at() 
SET search_path = 'public';

ALTER FUNCTION public.mark_case_messages_as_read(uuid, uuid, text) 
SET search_path = 'public';

ALTER FUNCTION public.cleanup_stale_communication_sessions() 
SET search_path = 'public';

ALTER FUNCTION public.has_admin_role() 
SET search_path = 'public';

ALTER FUNCTION public.notify_new_signup() 
SET search_path = 'public';

ALTER FUNCTION public.reclassify_visitor_bots() 
SET search_path = 'public';

ALTER FUNCTION public.cleanup_admin_analytics_data() 
SET search_path = 'public';

ALTER FUNCTION public.create_case_activity_notification() 
SET search_path = 'public';

ALTER FUNCTION public.migrate_anonymous_conversation(text, uuid) 
SET search_path = 'public';

ALTER FUNCTION public.enforce_admin_email_restriction() 
SET search_path = 'public';