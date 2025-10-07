-- Clean up orphaned notifications that reference deleted proposals
-- These are notifications where the proposal_id in metadata no longer exists in the proposals table

DELETE FROM public.notifications
WHERE type IN ('general', 'proposal_received', 'proposal_sent', 'proposal_approved', 'proposal_rejected')
  AND metadata ? 'proposal_id'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.proposals 
    WHERE proposals.id = (notifications.metadata->>'proposal_id')::uuid
  );

-- Add a comment
COMMENT ON COLUMN notifications.metadata IS 'JSON metadata including proposal_id and other context-specific data';
