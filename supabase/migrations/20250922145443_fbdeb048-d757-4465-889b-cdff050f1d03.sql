-- Delete the existing proposal for case CASE-2025-263-223703-IJJWGT
DELETE FROM proposals 
WHERE id = 'a201ec44-98e1-421f-8c0d-dc93ef041a96';

-- Update the case status back to lawyer_assigned so a new proposal can be created
UPDATE cases 
SET status = 'lawyer_assigned', updated_at = now()
WHERE case_number = 'CASE-2025-263-223703-IJJWGT';

-- Clean up any notifications related to this proposal
DELETE FROM notifications 
WHERE metadata->>'proposal_id' = 'a201ec44-98e1-421f-8c0d-dc93ef041a96';