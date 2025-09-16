import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';

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
                src={document.file_url}
                alt={document.file_name}
                className="max-w-full h-auto rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                }}
              />
            </div>
          ) : isPDF ? (
            <div className="w-full h-full">
              <iframe
                src={document.file_url}
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