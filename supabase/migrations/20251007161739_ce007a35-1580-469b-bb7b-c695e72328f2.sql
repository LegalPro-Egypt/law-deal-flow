-- One-time cleanup: Delete orphaned proposal notifications that reference non-existent proposals
-- This handles legacy data that may have been created before the trigger was in place

-- Delete notifications with proposal_id in metadata that don't have a matching proposal
DELETE FROM public.notifications
WHERE type IN ('proposal_received', 'proposal_sent', 'proposal_approved', 'proposal_rejected')
  AND metadata ? 'proposal_id'
  AND NOT EXISTS (
    SELECT 1 
    FROM public.proposals 
    WHERE proposals.id = (notifications.metadata->>'proposal_id')::uuid
  );

-- Delete proposal notifications without proposal_id metadata that don't have any proposals for that case
DELETE FROM public.notifications n
WHERE type IN ('proposal_received', 'proposal_sent', 'proposal_approved', 'proposal_rejected')
  AND NOT (metadata ? 'proposal_id')
  AND NOT EXISTS (
    SELECT 1
    FROM public.proposals p
    WHERE p.case_id = n.case_id
      AND p.client_id = n.user_id
  );