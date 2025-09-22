-- Clean up duplicate notifications, keeping only the most recent ones
WITH duplicate_notifications AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY case_id, type ORDER BY created_at DESC) as rn
  FROM notifications 
  WHERE type IN ('proposal_received', 'proposal_approved')
)
DELETE FROM notifications 
WHERE id IN (
  SELECT id FROM duplicate_notifications WHERE rn > 1
);