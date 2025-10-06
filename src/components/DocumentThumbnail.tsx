import React, { useEffect, useMemo, useState } from 'react';
import { FileText, File, FileSpreadsheet, FileImage } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DocumentThumbnailProps {
  fileUrl: string;
  fileName: string;
  fileType?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export const DocumentThumbnail: React.FC<DocumentThumbnailProps> = ({
  fileUrl,
  fileName,
  fileType,
  size = 'medium',
  onClick,
}) => {
  const inferredType = useMemo(() => {
    const lower = (fileName || fileUrl || '').toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/.test(lower)) return 'image/*';
    if (/\.(pdf)(\?|$)/.test(lower)) return 'application/pdf';
    if (/\.(xlsx?|csv)(\?|$)/.test(lower)) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    if (/\.(docx?|rtf)(\?|$)/.test(lower)) return 'application/msword';
    return undefined;
  }, [fileName, fileUrl]);

  const effectiveFileType = fileType ?? inferredType;
  const isImage = effectiveFileType?.startsWith('image/') || false;
  const isPDF = effectiveFileType === 'application/pdf';
  
  const sizeClasses = {
    small: 'w-10 h-10',
    medium: 'w-24 h-24',
    large: 'w-40 h-40',
  };

  const iconSizes = {
    small: 'h-5 w-5',
    medium: 'h-12 w-12',
    large: 'h-20 w-20',
  };

  const [resolvedSrc, setResolvedSrc] = useState<string>(fileUrl);

  // Get optimized image URL with transformations
  const getOptimizedImageUrl = (url: string) => {
    if (!isImage) return url;

    // Signed URLs (private buckets) don't support transformations
    if (url.includes('?token=')) {
      return url;
    }

    const sizeMap = { small: 80, medium: 200, large: 320 } as const;
    const dimension = sizeMap[size];

    // For public images, use Supabase render endpoint to resize
    if (url.includes('/storage/v1/object/public/')) {
      const renderUrl = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/');
      const separator = renderUrl.includes('?') ? '&' : '?';
      return `${renderUrl}${separator}width=${dimension}&height=${dimension}&quality=80`;
    }

    // Fallback: try appending params, or return original
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}width=${dimension}&height=${dimension}&quality=80`;
  };

  // Resolve fresh signed URL for private images; optimize public ones
  useEffect(() => {
    if (!isImage) {
      setResolvedSrc(fileUrl);
      return;
    }

    const isSigned = fileUrl.includes('?token=') || fileUrl.includes('/storage/v1/object/sign/');

    if (isSigned) {
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

      (async () => {
        try {
          const bp = extractBucketPath(fileUrl);
          if (bp) {
            const { data } = await supabase.storage
              .from(bp.bucket)
              .createSignedUrl(bp.path, 3600);
            if (data?.signedUrl) {
              setResolvedSrc(data.signedUrl);
              return;
            }
          }
        } catch {}
        setResolvedSrc(fileUrl);
      })();

      return;
    }

    // Public or generic
    setResolvedSrc(getOptimizedImageUrl(fileUrl));
  }, [fileUrl, size, isImage]);

  const getFileIcon = () => {
    if (isPDF) {
      return <FileText className={`${iconSizes[size]} text-red-500`} />;
    }
    if (fileType?.includes('spreadsheet') || fileType?.includes('excel')) {
      return <FileSpreadsheet className={`${iconSizes[size]} text-green-500`} />;
    }
    if (fileType?.includes('word') || fileType?.includes('document')) {
      return <FileText className={`${iconSizes[size]} text-blue-500`} />;
    }
    return <File className={`${iconSizes[size]} text-muted-foreground`} />;
  };

  return (
    <div
      className={`${sizeClasses[size]} flex items-center justify-center bg-muted rounded-lg overflow-hidden flex-shrink-0 ${
        onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''
      }`}
      onClick={onClick}
    >
      {isImage ? (
        <img
          src={resolvedSrc}
          alt={fileName}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const imgEl = e.currentTarget as HTMLImageElement;
            console.error('DocumentThumbnail: image load failed', {
              failedUrl: imgEl.src,
              originalUrl: fileUrl,
            });
            // If optimized/signed URL failed, try original URL once
            if (!imgEl.dataset.fallbackTried) {
              imgEl.dataset.fallbackTried = 'true';
              imgEl.src = fileUrl;
              return;
            }
            // Hide the image and show the fallback icon
            imgEl.style.display = 'none';
            const fallback = imgEl.nextElementSibling as HTMLElement;
            if (fallback) {
              fallback.style.display = 'flex';
            }
          }}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {getFileIcon()}
        </div>
      )}
      {isImage && (
        <div className="hidden items-center justify-center w-full h-full">
          <FileImage className={`${iconSizes[size]} text-muted-foreground`} />
        </div>
      )}
    </div>
  );
};
