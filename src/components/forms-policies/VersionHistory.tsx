import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Eye, RotateCcw, FileText, User } from 'lucide-react';
import { FormPolicy, useFormsPolicies } from '@/hooks/useFormsPolicies';
import { formatDistanceToNow } from 'date-fns';
import { DiffViewer } from './DiffViewer';

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'lawyer_forms' | 'client_forms' | 'client_policies' | 'lawyer_policies';
  currentItem: FormPolicy | null;
}

export const VersionHistory = ({ isOpen, onClose, type, currentItem }: VersionHistoryProps) => {
  const [versions, setVersions] = useState<FormPolicy[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<FormPolicy | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { getVersionHistory, restoreVersion } = useFormsPolicies(type);

  useEffect(() => {
    if (isOpen && currentItem) {
      loadVersionHistory();
    }
  }, [isOpen, currentItem]);

  const loadVersionHistory = async () => {
    if (!currentItem) return;
    
    setIsLoading(true);
    try {
      const history = await getVersionHistory(currentItem.title);
      setVersions(history as FormPolicy[]);
    } catch (error) {
      console.error('Error loading version history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreview = (version: FormPolicy) => {
    setSelectedVersion(version);
  };

  const handleShowDiff = (version: FormPolicy) => {
    setSelectedVersion(version);
    setShowDiff(true);
  };

  const handleRestore = async (version: FormPolicy) => {
    if (!currentItem) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to restore version ${version.version}? This will create a new draft with the content from that version.`
    );
    
    if (confirmed) {
      try {
        await restoreVersion(version.id, currentItem.id);
        onClose();
      } catch (error) {
        console.error('Error restoring version:', error);
      }
    }
  };

  if (showDiff && selectedVersion) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Diff: Version {selectedVersion.version} vs Current
            </DialogTitle>
          </DialogHeader>
          <DiffViewer
            oldContent={selectedVersion.content}
            newContent={currentItem?.content || ''}
            onClose={() => setShowDiff(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  if (selectedVersion) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview: Version {selectedVersion.version}
              </div>
              <Button variant="outline" size="sm" onClick={() => setSelectedVersion(null)}>
                Back to History
              </Button>
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <Badge variant={selectedVersion.status === 'published' ? 'default' : 'secondary'}>
                    {selectedVersion.status} v{selectedVersion.version}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatDistanceToNow(new Date(selectedVersion.updated_at), { addSuffix: true })}
                </div>
                {selectedVersion.change_note && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {selectedVersion.change_note}
                  </div>
                )}
              </div>
              <div className="prose max-w-none">
                <div dangerouslySetInnerHTML={{ __html: selectedVersion.content }} />
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Version History
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : versions.length === 0 ? (
              <div className="text-center text-muted-foreground p-8">
                No version history available
              </div>
            ) : (
              versions.map((version, index) => (
                <div key={version.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant={version.status === 'published' ? 'default' : 'secondary'}>
                        v{version.version}
                      </Badge>
                      <Badge variant={version.status === 'published' ? 'default' : 'outline'}>
                        {version.status}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline">Current</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(version.updated_at), { addSuffix: true })}
                    </div>
                  </div>
                  
                  {version.change_note && (
                    <p className="text-sm text-muted-foreground">{version.change_note}</p>
                  )}
                  
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(version)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    {currentItem && version.id !== currentItem.id && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowDiff(version)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Diff vs Current
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(version)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};