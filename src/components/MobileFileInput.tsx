import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle } from 'lucide-react';

interface MobileFileInputProps {
  onFileSelect: (files: FileList | null) => void;
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  hasFiles?: boolean;
  buttonText: string;
  className?: string;
}

const MobileFileInput: React.FC<MobileFileInputProps> = ({
  onFileSelect,
  accept,
  multiple = false,
  disabled = false,
  hasFiles = false,
  buttonText,
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled || !fileInputRef.current) return;
    
    // Clear previous value to allow re-uploading same file
    fileInputRef.current.value = '';
    
    // Trigger file input click directly
    fileInputRef.current.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    onFileSelect(files);
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />
      <Button
        type="button"
        variant={hasFiles ? "secondary" : "outline"}
        className="w-full"
        disabled={disabled}
        onClick={handleButtonClick}
      >
        {hasFiles ? (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            {buttonText} More
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {buttonText}
          </>
        )}
      </Button>
    </div>
  );
};

export default MobileFileInput;