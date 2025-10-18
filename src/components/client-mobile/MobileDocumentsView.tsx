import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Upload, FileText, Grid3x3, List } from 'lucide-react';
import DocumentUpload from '@/components/DocumentUpload';
import { DocumentThumbnail } from '@/components/DocumentThumbnail';
import { DocumentPreview } from '@/components/DocumentPreview';

interface MobileDocumentsViewProps {
  caseId: string;
  documents: any[];
  onBack: () => void;
  onDocumentRename?: (docId: string, newName: string) => void;
}

export const MobileDocumentsView: React.FC<MobileDocumentsViewProps> = ({
  caseId,
  documents,
  onBack,
  onDocumentRename,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Documents</h1>
          </div>
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <Card className="p-4 mb-4">
          <DocumentUpload caseId={caseId} />
        </Card>

        {documents.length === 0 ? (
          <Card className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No documents yet</p>
            <p className="text-sm text-muted-foreground">Upload documents to get started</p>
          </Card>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'space-y-3'}>
            {documents.map((doc) => (
              <div key={doc.id} onClick={() => setSelectedDoc(doc)} className="cursor-pointer">
                <DocumentThumbnail
                  fileUrl={doc.file_url}
                  fileName={doc.display_name || doc.file_name}
                  fileType={doc.file_type}
                  size="medium"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDoc && (
        <DocumentPreview
          document={selectedDoc}
          isOpen={!!selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  );
};
