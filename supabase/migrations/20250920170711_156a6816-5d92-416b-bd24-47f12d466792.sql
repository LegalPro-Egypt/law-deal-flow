-- Link the orphaned conversation to the case
UPDATE conversations 
SET case_id = (SELECT id FROM cases WHERE case_number = 'CASE-2025-263-181104-QRZDGF')
WHERE id = '3c486563-2039-4cd4-aef8-78eb99401f8d' 
  AND case_id IS NULL;