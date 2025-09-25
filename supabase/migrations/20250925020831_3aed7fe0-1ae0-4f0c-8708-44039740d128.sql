-- Update the notification function to use "milestone" terminology
CREATE OR REPLACE FUNCTION public.create_case_activity_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  client_user_id UUID;
  case_title TEXT;
BEGIN
  -- Get the client user_id and case title
  SELECT cases.user_id, cases.title 
  INTO client_user_id, case_title
  FROM cases 
  WHERE cases.id = NEW.case_id;
  
  -- Create notification for the client
  IF client_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      case_id,
      type,
      category,
      title,
      message,
      action_required,
      metadata
    ) VALUES (
      client_user_id,
      NEW.case_id,
      'case_activity',
      'case_update',
      'New Milestone Update',
      'Your lawyer has added a new milestone to your case: ' || case_title,
      false,
      jsonb_build_object(
        'activity_id', NEW.id,
        'activity_title', NEW.title,
        'lawyer_id', NEW.lawyer_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;