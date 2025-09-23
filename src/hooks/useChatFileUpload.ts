import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface FileUploadResult {
  url: string;
  name: string;
  size: number;
  type: string;
}

export const useChatFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = (file: File): string | null => {
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      return 'File size must be less than 20MB';
    }

    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed'
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOC, DOCX, TXT, images, or ZIP files.';
    }

    return null;
  };

  const uploadFile = async (file: File, caseId: string): Promise<FileUploadResult | null> => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const validation = validateFile(file);
      if (validation) {
        toast({
          title: "Upload Error",
          description: validation,
          variant: "destructive",
        });
        return null;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to upload files.",
          variant: "destructive",
        });
        return null;
      }

      // Create file path for chat files
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const fileName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = `${user.id}/chat/${caseId}/${fileName}`;

      setUploadProgress(50);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('case-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        toast({
          title: "Upload Failed",
          description: `Storage error: ${error.message}`,
          variant: "destructive",
        });
        return null;
      }

      setUploadProgress(90);

      // Get signed URL (7 day expiry for private bucket)
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('case-documents')
        .createSignedUrl(filePath, 7 * 24 * 60 * 60); // 7 days

      if (urlError) {
        toast({
          title: "Upload Failed",
          description: `URL generation error: ${urlError.message}`,
          variant: "destructive",
        });
        return null;
      }

      setUploadProgress(100);

      // Add to documents table
      const { error: dbError } = await supabase
        .from('documents')
        .insert({
          case_id: caseId,
          file_name: file.name,
          file_url: signedUrlData.signedUrl,
          file_type: file.type,
          file_size: file.size,
          document_category: 'chat',
          uploaded_by: user.id
        });

      if (dbError) {
        console.error('Database save error:', dbError);
        // Don't show error to user, file upload was successful
      }

      toast({
        title: "File Uploaded",
        description: `${file.name} has been uploaded successfully.`,
      });

      return {
        url: signedUrlData.signedUrl,
        name: file.name,
        size: file.size,
        type: file.type
      };
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    uploadFile,
    isUploading,
    uploadProgress
  };
};