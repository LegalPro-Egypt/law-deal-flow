-- Allow authenticated users to upload files to case-documents bucket
CREATE POLICY "Authenticated users can upload to case-documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'case-documents');

-- Allow authenticated users to view files in case-documents bucket
CREATE POLICY "Authenticated users can view case-documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'case-documents');

-- Allow authenticated users to update files in case-documents bucket
CREATE POLICY "Authenticated users can update case-documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'case-documents')
WITH CHECK (bucket_id = 'case-documents');

-- Allow authenticated users to delete files in case-documents bucket
CREATE POLICY "Authenticated users can delete case-documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'case-documents');