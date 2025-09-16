-- Add Civil Law category for cases like car property damage, personal injury, tort claims, etc.
INSERT INTO case_categories (
  name,
  name_ar, 
  name_de,
  description,
  applicable_laws,
  required_documents,
  is_active
) VALUES (
  'Civil Law',
  'القانون المدني',
  'Zivilrecht',
  'Personal injury, property damage, tort claims, contract disputes, civil liability matters',
  ARRAY['Egyptian Civil Code', 'Civil Procedure Law No. 13/1968', 'Tort Law'],
  ARRAY['Incident Report', 'Medical Reports', 'Property Assessment', 'Insurance Documents', 'Witness Statements', 'Photos/Evidence'],
  true
);