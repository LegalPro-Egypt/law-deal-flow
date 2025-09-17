-- Add missing RLS policies for lawyer-documents bucket
-- These policies allow users to update and delete files in their own folders

CREATE POLICY "Users can update their own lawyer documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'lawyer-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own lawyer documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'lawyer-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);