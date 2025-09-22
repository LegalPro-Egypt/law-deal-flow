-- Migrate legacy proposal_sent cases to new proposals and notifications system
-- This handles cases that were marked as proposal_sent but don't have entries in the new tables

INSERT INTO proposals (
  case_id,
  client_id,
  lawyer_id,
  consultation_fee,
  remaining_fee,
  total_fee,
  timeline,
  strategy,
  generated_content,
  status,
  created_at
)
SELECT 
  c.id as case_id,
  c.user_id as client_id,
  c.assigned_lawyer_id as lawyer_id,
  c.consultation_fee,
  c.remaining_fee,
  c.total_fee,
  'As discussed during consultation' as timeline,
  'Custom legal strategy tailored to your case requirements' as strategy,
  'A comprehensive legal proposal has been prepared for your case: ' || c.title || '. This proposal includes detailed consultation and representation services based on your specific needs.' as generated_content,
  'sent' as status,
  c.updated_at as created_at
FROM cases c
WHERE c.status = 'proposal_sent' 
  AND NOT EXISTS (
    SELECT 1 FROM proposals p WHERE p.case_id = c.id
  );

-- Create corresponding notifications for the migrated proposals
INSERT INTO notifications (
  user_id,
  case_id,
  type,
  title,
  message,
  action_required,
  is_read,
  metadata,
  created_at
)
SELECT 
  p.client_id as user_id,
  p.case_id,
  'proposal_received' as type,
  'New Legal Proposal Received' as title,
  'You have received a new legal proposal for your case. Please review and respond.' as message,
  true as action_required,
  false as is_read,
  jsonb_build_object('proposal_id', p.id) as metadata,
  p.created_at
FROM proposals p
WHERE NOT EXISTS (
  SELECT 1 FROM notifications n 
  WHERE n.case_id = p.case_id AND n.type = 'proposal_received'
);