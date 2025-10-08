-- Add client_accepted_at timestamp to contracts table
ALTER TABLE public.contracts 
ADD COLUMN IF NOT EXISTS client_accepted_at timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN public.contracts.client_accepted_at IS 'Timestamp when client explicitly accepted the contract';

-- Create notification trigger for contract acceptance
CREATE OR REPLACE FUNCTION public.notify_contract_acceptance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  case_title TEXT;
  client_name TEXT;
BEGIN
  -- Only trigger when status changes to 'client_accepted'
  IF NEW.status = 'client_accepted' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Get case title
    SELECT cases.title INTO case_title
    FROM cases 
    WHERE cases.id = NEW.case_id;
    
    -- Get client name
    SELECT COALESCE(profiles.first_name || ' ' || profiles.last_name, profiles.email) 
    INTO client_name
    FROM profiles 
    WHERE profiles.user_id = NEW.client_id;
    
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
      'contract_accepted',
      'contract',
      'Contract Accepted',
      'Client has accepted the contract for case: ' || COALESCE(case_title, 'Untitled'),
      false,
      jsonb_build_object(
        'contract_id', NEW.id,
        'client_name', client_name
      )
    );
    
    -- Create notification for admins
    INSERT INTO public.notifications (
      user_id,
      case_id,
      type,
      category,
      title,
      message,
      action_required,
      metadata
    )
    SELECT 
      profiles.user_id,
      NEW.case_id,
      'contract_accepted',
      'contract',
      'Contract Accepted by Client',
      'Client has accepted contract for case: ' || COALESCE(case_title, 'Untitled'),
      false,
      jsonb_build_object(
        'contract_id', NEW.id,
        'client_name', client_name
      )
    FROM profiles
    WHERE profiles.role = 'admin';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for contract acceptance notifications
DROP TRIGGER IF EXISTS on_contract_acceptance ON public.contracts;
CREATE TRIGGER on_contract_acceptance
  AFTER UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_contract_acceptance();