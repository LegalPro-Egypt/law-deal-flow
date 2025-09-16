-- Create storage bucket for case documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'case-documents', 
  'case-documents', 
  false,
  20971520, -- 20MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
);

-- Create RLS policies for case documents storage
CREATE POLICY "Users can upload their own case documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'case-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own case documents"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'case-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own case documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'case-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own case documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'case-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);