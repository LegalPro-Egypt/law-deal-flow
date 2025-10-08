-- Create notification when admin requests contract changes
CREATE OR REPLACE FUNCTION public.notify_lawyer_contract_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  case_title TEXT;
BEGIN
  -- Only trigger when status changes to 'changes_requested'
  IF NEW.status = 'changes_requested' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Get case title
    SELECT cases.title INTO case_title
    FROM cases 
    WHERE cases.id = NEW.case_id;
    
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
      'Contract Changes Requested',
      'Admin has requested changes to your contract for case: ' || COALESCE(case_title, 'Untitled'),
      true,
      jsonb_build_object(
        'contract_id', NEW.id,
        'admin_notes', NEW.admin_notes
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for contract change notifications
DROP TRIGGER IF EXISTS contract_changes_notification ON public.contracts;
CREATE TRIGGER contract_changes_notification
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lawyer_contract_changes();