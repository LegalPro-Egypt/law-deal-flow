import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, Eye, Clock, AlertCircle } from 'lucide-react';
import { FormsPoliciesEditor } from './FormsPoliciesEditor';
import { VersionHistory } from './VersionHistory';
import { FormPolicy, useFormsPolicies } from '@/hooks/useFormsPolicies';

interface FormsPoliciesLayoutProps {
  type: 'lawyer_forms' | 'client_forms' | 'client_policies' | 'lawyer_policies';
  title: string;
  description: string;
}

export const FormsPoliciesLayout = ({ type, title, description }: FormsPoliciesLayoutProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('published');
  const [draftContent, setDraftContent] = useState('');
  const autosaveIntervalRef = useRef<NodeJS.Timeout>();
  
  const {
    items,
    currentItem,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    fetchItem,
    saveDraft,
    publishItem,
    setCurrentItem,
  } = useFormsPolicies(type);

  // Get the main item (first published or latest)
  const mainItem = items.find(item => item.status === 'published') || items[0];

  useEffect(() => {
    if (mainItem && !selectedItemId) {
      setSelectedItemId(mainItem.id);
      fetchItem(mainItem.id);
    }
  }, [mainItem, selectedItemId, fetchItem]);

  useEffect(() => {
    if (currentItem) {
      setDraftContent(currentItem.content || '');
    }
  }, [currentItem]);

  // Auto-save functionality
  useEffect(() => {
    if (isEditing && hasUnsavedChanges && currentItem) {
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
      }
      
      autosaveIntervalRef.current = setInterval(() => {
        handleSaveDraft();
      }, 5000); // Auto-save every 5 seconds
    }

    return () => {
      if (autosaveIntervalRef.current) {
        clearInterval(autosaveIntervalRef.current);
      }
    };
  }, [isEditing, hasUnsavedChanges, currentItem]);

  const handleSaveDraft = async () => {
    if (!currentItem || !hasUnsavedChanges) return;
    
    try {
      await saveDraft(currentItem.id, {
        title: currentItem.title,
        content: draftContent,
        schema: currentItem.schema,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleContentChange = (content: string) => {
    setDraftContent(content);
    setHasUnsavedChanges(true);
  };

  const handlePublish = async (changeNote: string) => {
    if (!currentItem) return;
    
    try {
      // First save the current draft content to the item
      await saveDraft(currentItem.id, {
        title: currentItem.title,
        content: draftContent,
        schema: currentItem.schema,
      });
      
      // Then publish it
      await publishItem(currentItem.id, changeNote);
      setIsEditing(false);
    } catch (error) {
      console.error('Publish failed:', error);
    }
  };

  const publishedContent = items.find(item => item.status === 'published')?.content || '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              Unsaved changes
            </Badge>
          )}
          {isSaving && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3 animate-spin" />
              Saving...
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVersionHistory(true)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Version History
          </Button>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(false)} variant="outline">
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentItem?.title || 'No Content'}
            {currentItem && (
              <Badge variant={currentItem.status === 'published' ? 'default' : 'secondary'}>
                {currentItem.status} v{currentItem.version}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!isEditing ? (
            <div className="prose max-w-none">
              <div dangerouslySetInnerHTML={{ __html: publishedContent || 'No content available' }} />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="draft">Draft</TabsTrigger>
                <TabsTrigger value="published">Published</TabsTrigger>
              </TabsList>
              
              <TabsContent value="draft" className="mt-4">
                <FormsPoliciesEditor
                  content={draftContent}
                  onChange={handleContentChange}
                  onPublish={handlePublish}
                  isLoading={isSaving}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
              </TabsContent>
              
              <TabsContent value="published" className="mt-4">
                <div className="prose max-w-none p-4 bg-muted/50 rounded-lg">
                  <div dangerouslySetInnerHTML={{ __html: publishedContent || 'No published content' }} />
                </div>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      <VersionHistory
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        type={type}
        currentItem={currentItem}
      />
    </div>
  );
};