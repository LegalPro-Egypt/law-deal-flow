-- Update the generic titled case to have a proper title based on its category
UPDATE cases 
SET title = CASE 
  WHEN category = 'General Consultation' THEN 'General Legal Consultation'
  WHEN category = 'Business Law' THEN 'Business Law Consultation' 
  WHEN category = 'Family Law' THEN 'Family Law Consultation'
  WHEN category = 'Criminal Law' THEN 'Criminal Law Consultation'
  WHEN category = 'Real Estate' THEN 'Real Estate Legal Matter'
  WHEN category = 'Employment Law' THEN 'Employment Law Issue'
  WHEN category = 'Immigration' THEN 'Immigration Legal Matter'
  WHEN category = 'Intellectual Property' THEN 'Intellectual Property Issue'
  WHEN category = 'Tax Law' THEN 'Tax Law Consultation'
  WHEN category = 'Contract Law' THEN 'Contract Law Matter'
  WHEN category = 'Personal Injury' THEN 'Personal Injury Case'
  WHEN category = 'Corporate Law' THEN 'Corporate Legal Matter'
  ELSE CONCAT(category, ' - Legal Matter')
END,
updated_at = now()
WHERE title = 'New Legal Inquiry' 
  AND id = '048d122c-b431-441e-81b3-d73dde0bd2cf';