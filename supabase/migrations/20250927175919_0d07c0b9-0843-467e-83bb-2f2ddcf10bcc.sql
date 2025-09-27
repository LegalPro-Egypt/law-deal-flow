-- Clean up duplicate Terms of Service records
-- Keep only the published one and delete the empty drafts
DELETE FROM form_policies 
WHERE type = 'client_policies' 
  AND title = 'Terms of Service' 
  AND status = 'draft' 
  AND (content = '' OR content = '# Terms of Service \n\nEnter your policy content here...');