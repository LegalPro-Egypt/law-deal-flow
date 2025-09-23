-- Create a function to notify about new signups
CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Call the edge function to send email notifications
  PERFORM
    net.http_post(
      url := 'https://igrpbeordzwcsxihlwny.supabase.co/functions/v1/notify-new-signup',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.service_role_key', true) || '"}'::jsonb,
      body := jsonb_build_object(
        'email', NEW.email,
        'source', NEW.source,
        'created_at', NEW.created_at,
        'metadata', NEW.metadata,
        'user_agent', NEW.user_agent,
        'ip_address', NEW.ip_address
      )
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically notify on new signups
CREATE TRIGGER trigger_notify_new_signup
  AFTER INSERT ON public.email_signups
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_signup();

-- Update config to make the notify-new-signup function public (no JWT verification needed for internal calls)
-- This will be handled in the config.toml file