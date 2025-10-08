-- Drop all Twilio-related tables
DROP TABLE IF EXISTS public.twilio_session_participants CASCADE;
DROP TABLE IF EXISTS public.twilio_session_recordings CASCADE;
DROP TABLE IF EXISTS public.session_recordings CASCADE;
DROP TABLE IF EXISTS public.communication_sessions CASCADE;
DROP TABLE IF EXISTS public.video_sessions CASCADE;

-- Drop the cleanup function
DROP FUNCTION IF EXISTS public.cleanup_stale_communication_sessions() CASCADE;

-- Note: The 'session-recordings' storage bucket should be deleted manually from the Supabase dashboard
-- at: Storage > session-recordings > Settings > Delete bucket