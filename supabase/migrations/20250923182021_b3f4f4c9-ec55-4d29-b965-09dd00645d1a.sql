-- Fix the function search path security issue
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;