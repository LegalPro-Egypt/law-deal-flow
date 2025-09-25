-- Clean up duplicate incomplete cases with generic titles for the user
DELETE FROM cases 
WHERE user_id = 'b2899737-4b7b-4724-9218-8cf3347f5775' 
  AND title = 'New Legal Inquiry' 
  AND status IN ('intake', 'draft')
  AND id != 'e30b4e4c-202b-4d93-b658-034615578e42';