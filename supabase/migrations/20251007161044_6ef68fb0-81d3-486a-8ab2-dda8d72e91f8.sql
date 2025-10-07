-- Create function to automatically delete proposal notifications when a proposal is deleted
CREATE OR REPLACE FUNCTION public.delete_proposal_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete all notifications related to the deleted proposal
  DELETE FROM public.notifications
  WHERE type IN ('proposal_received', 'proposal_sent', 'proposal_approved', 'proposal_rejected')
    AND (metadata->>'proposal_id')::uuid = OLD.id;
  
  RETURN OLD;
END;
$$;

-- Create trigger to run the function when a proposal is deleted
CREATE TRIGGER on_proposal_delete
  AFTER DELETE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.delete_proposal_notifications();

-- One-time cleanup: Delete orphaned proposal notifications
DELETE FROM public.notifications
WHERE type IN ('proposal_received', 'proposal_sent', 'proposal_approved', 'proposal_rejected')
  AND metadata ? 'proposal_id'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.proposals 
    WHERE proposals.id = (notifications.metadata->>'proposal_id')::uuid
  );