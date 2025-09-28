import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Save, Upload, AlertCircle } from 'lucide-react';

interface FormsPoliciesEditorProps {
  content: string;
  onChange: (content: string) => void;
  onPublish: (changeNote: string) => Promise<void>;
  isLoading?: boolean;
  hasUnsavedChanges?: boolean;
}

export const FormsPoliciesEditor = ({
  content,
  onChange,
  onPublish,
  isLoading = false,
  hasUnsavedChanges = false,
}: FormsPoliciesEditorProps) => {
  const [editorContent, setEditorContent] = useState(content);
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [changeNote, setChangeNote] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

  useEffect(() => {
    setEditorContent(content);
  }, [content]);

  const handleContentChange = (value: string) => {
    setEditorContent(value);
    onChange(value);
  };

  const handlePublish = async () => {
    if (!changeNote.trim()) return;
    
    try {
      setIsPublishing(true);
      await onPublish(changeNote);
      setChangeNote('');
      setShowPublishDialog(false);
    } catch (error) {
      console.error('Publish error:', error);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="content-editor">Content</Label>
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Unsaved changes
            </Badge>
          )}
        </div>
        <Button 
          onClick={() => setShowPublishDialog(true)}
          disabled={isLoading || !hasUnsavedChanges}
          size="sm"
        >
          <Upload className="h-4 w-4 mr-2" />
          Publish
        </Button>
      </div>

      <Textarea
        id="content-editor"
        value={editorContent}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Enter your content here..."
        className="min-h-[400px] font-mono"
        disabled={isLoading}
      />

      <div className="text-sm text-muted-foreground">
        Tip: You can use HTML tags for formatting. Changes are auto-saved every 5 seconds.
      </div>

      {/* Publish Dialog */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Changes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="change-note">Change Note *</Label>
              <Textarea
                id="change-note"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
                placeholder="Describe what changes you made..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowPublishDialog(false)}
              disabled={isPublishing}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePublish}
              disabled={!changeNote.trim() || isPublishing}
            >
              {isPublishing ? 'Publishing...' : 'Publish'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};