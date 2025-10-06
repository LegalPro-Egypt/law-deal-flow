import React from 'react';
import { FileText, File, FileSpreadsheet, FileImage } from 'lucide-react';

interface DocumentThumbnailProps {
  fileUrl: string;
  fileName: string;
  fileType: string;
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
  const isImage = fileType.startsWith('image/');
  const isPDF = fileType === 'application/pdf';
  
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

  // Get optimized image URL with transformations
  const getOptimizedImageUrl = (url: string) => {
    if (!isImage) return url;
    const sizeMap = { small: 80, medium: 200, large: 320 };
    const dimension = sizeMap[size];
    return `${url}?width=${dimension}&height=${dimension}&quality=80`;
  };

  const getFileIcon = () => {
    if (isPDF) {
      return <FileText className={`${iconSizes[size]} text-red-500`} />;
    }
    if (fileType.includes('spreadsheet') || fileType.includes('excel')) {
      return <FileSpreadsheet className={`${iconSizes[size]} text-green-500`} />;
    }
    if (fileType.includes('word') || fileType.includes('document')) {
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
          src={getOptimizedImageUrl(fileUrl)}
          alt={fileName}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            e.currentTarget.nextElementSibling?.classList.remove('hidden');
          }}
        />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          {getFileIcon()}
        </div>
      )}
      {isImage && (
        <div className="hidden flex items-center justify-center w-full h-full">
          <FileImage className={`${iconSizes[size]} text-muted-foreground`} />
        </div>
      )}
    </div>
  );
};
