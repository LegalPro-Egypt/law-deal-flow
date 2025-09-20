-- Update existing cases to reflect assignment status
UPDATE public.cases
SET status = 'lawyer_assigned', updated_at = now()
WHERE assigned_lawyer_id IS NOT NULL
  AND status IN ('submitted','intake');

-- Function: Automatically set status when a lawyer is assigned
CREATE OR REPLACE FUNCTION public.set_status_on_lawyer_assignment()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.assigned_lawyer_id IS NOT NULL AND (OLD.assigned_lawyer_id IS DISTINCT FROM NEW.assigned_lawyer_id) THEN
      -- Only override if current status is one of pre-assignment states
      IF NEW.status IN ('submitted','intake') THEN
        NEW.status = 'lawyer_assigned';
        NEW.updated_at = now();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger: Apply the status update automatically on cases table
DROP TRIGGER IF EXISTS trg_set_status_on_lawyer_assignment ON public.cases;
CREATE TRIGGER trg_set_status_on_lawyer_assignment
BEFORE UPDATE OF assigned_lawyer_id, status ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.set_status_on_lawyer_assignment();