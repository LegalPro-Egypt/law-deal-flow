-- Drop the existing trigger function
DROP FUNCTION IF EXISTS public.notify_lawyer_contract_changes() CASCADE;

-- Recreate the trigger function with proper message handling
CREATE OR REPLACE FUNCTION public.notify_lawyer_contract_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  case_title TEXT;
  notification_message TEXT;
  notification_title TEXT;
BEGIN
  -- Only trigger when status changes to 'changes_requested'
  IF NEW.status = 'changes_requested' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Get case title
    SELECT cases.title INTO case_title
    FROM cases 
    WHERE cases.id = NEW.case_id;
    
    -- Determine message based on change source
    IF NEW.change_source = 'client_request' THEN
      notification_title := 'Client Requested Contract Changes';
      notification_message := 'Client has requested changes to the contract for case: ' || COALESCE(case_title, 'Untitled');
    ELSE
      notification_title := 'Contract Changes Requested';
      notification_message := 'Admin has requested changes to your contract for case: ' || COALESCE(case_title, 'Untitled');
    END IF;
    
    -- Create notification for the lawyer
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
      NEW.lawyer_id,
      NEW.case_id,
      'contract_changes_requested',
      'contract',
      notification_title,
      notification_message,
      true,
      jsonb_build_object(
        'contract_id', NEW.id,
        'change_source', NEW.change_source,
        'admin_notes', NEW.admin_notes,
        'client_change_request', NEW.client_change_request
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_contract_changes_requested ON public.contracts;
CREATE TRIGGER on_contract_changes_requested
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lawyer_contract_changes();