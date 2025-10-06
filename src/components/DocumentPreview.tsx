import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    file_name: string;
    file_type: string;
    file_url: string;
  } | null;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const [resolvedUrl, setResolvedUrl] = useState<string>('');

  // Extract bucket and path from Supabase Storage URLs
  const extractBucketPath = (url: string) => {
    try {
      const u = new URL(url);
      const parts = u.pathname.split('/');
      const idx = parts.findIndex((p) => p === 'object');
      if (idx >= 0 && parts.length > idx + 3) {
        const bucket = parts[idx + 2];
        const path = decodeURIComponent(parts.slice(idx + 3).join('/'));
        return { bucket, path } as const;
      }
    } catch {}
    return null;
  };

  // Re-sign URLs for private buckets
  useEffect(() => {
    if (!document?.file_url) {
      setResolvedUrl('');
      return;
    }

    const bp = extractBucketPath(document.file_url);
    const bucketName = bp?.bucket;

    const isSigned = document.file_url.includes('?token=') || document.file_url.includes('/storage/v1/object/sign/');
    const shouldResign = isSigned || bucketName === 'case-documents';

    if (shouldResign && bp) {
      (async () => {
        try {
          const { data } = await supabase.storage
            .from(bp.bucket)
            .createSignedUrl(bp.path, 3600);
          if (data?.signedUrl) {
            setResolvedUrl(data.signedUrl);
            return;
          }
        } catch (error) {
          console.error('Failed to create signed URL:', error);
        }
        setResolvedUrl(document.file_url);
      })();
      return;
    }

    setResolvedUrl(document.file_url);
  }, [document?.file_url]);

  if (!document) return null;

  const isImage = document.file_type.startsWith('image/');
  const isPDF = document.file_type === 'application/pdf';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {document.file_name}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[70vh]">
          {isImage ? (
            <div className="flex justify-center">
              <img
                src={resolvedUrl}
                alt={document.file_name}
                className="max-w-full h-auto rounded-lg shadow-lg"
                onError={(e) => {
                  const imgEl = e.currentTarget as HTMLImageElement;
                  console.error('DocumentPreview: image load failed', {
                    failedUrl: imgEl.src,
                    originalUrl: document.file_url,
                  });

                  const bp = extractBucketPath(document.file_url);

                  // Try to re-sign once
                  if (!imgEl.dataset.signRetryTried && bp) {
                    imgEl.dataset.signRetryTried = 'true';
                    supabase.storage
                      .from(bp.bucket)
                      .createSignedUrl(bp.path, 3600)
                      .then(({ data }) => {
                        if (data?.signedUrl) {
                          imgEl.src = data.signedUrl;
                        } else {
                          imgEl.src = document.file_url;
                        }
                      })
                      .catch(() => {
                        imgEl.src = document.file_url;
                      });
                    return;
                  }

                  // Fallback to placeholder
                  if (!imgEl.dataset.fallbackTried) {
                    imgEl.dataset.fallbackTried = 'true';
                    imgEl.src = document.file_url;
                  } else {
                    imgEl.src = '/placeholder.svg';
                  }
                }}
              />
            </div>
          ) : isPDF ? (
            <div className="w-full h-full">
              <iframe
                src={resolvedUrl}
                className="w-full h-[60vh] border-0 rounded-lg"
                title={document.file_name}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Preview not available</h3>
              <p className="text-muted-foreground">
                This file type cannot be previewed. You can download it instead.
              </p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};