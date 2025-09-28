-- Clean up duplicate TOS entry and publish the remaining one
DELETE FROM form_policies 
WHERE id = 'e5511641-ec48-4ce4-b3b4-c6a83805ad90' 
  AND type = 'client_policies' 
  AND title = 'Terms of Service';

-- Publish the remaining TOS draft
UPDATE form_policies 
SET 
  status = 'published',
  version = 2,
  change_note = 'Initial publication after fixing duplicate issue',
  updated_at = NOW()
WHERE id = '1641dca2-f5cd-4e6f-b989-f91c322e9b0b'
  AND type = 'client_policies' 
  AND title = 'Terms of Service';