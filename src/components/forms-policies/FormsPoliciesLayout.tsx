import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Edit, Save, Eye, Clock, AlertCircle, Plus } from 'lucide-react';
import { FormsPoliciesEditor } from './FormsPoliciesEditor';
import { VersionHistory } from './VersionHistory';
import { FormPolicy, useFormsPolicies } from '@/hooks/useFormsPolicies';
import { useToast } from '@/hooks/use-toast';

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
  const [showNewPolicyDialog, setShowNewPolicyDialog] = useState(false);
  const [newPolicyTitle, setNewPolicyTitle] = useState('');
  const autosaveIntervalRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  
  const {
    items,
    currentItem,
    isLoading,
    isSaving,
    hasUnsavedChanges,
    setHasUnsavedChanges,
    fetchItems,
    fetchItem,
    saveDraft,
    publishItem,
    setCurrentItem,
    createItem,
  } = useFormsPolicies(type);

  // Auto-select first item when items load
  useEffect(() => {
    if (items.length > 0 && !selectedItemId) {
      const firstItem = items[0];
      setSelectedItemId(firstItem.id);
      fetchItem(firstItem.id);
    }
  }, [items, selectedItemId, fetchItem]);

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

  const handleItemSelect = async (itemId: string) => {
    setSelectedItemId(itemId);
    await fetchItem(itemId);
    setIsEditing(false);
    setActiveTab('published');
  };

  const handleCreateNewPolicy = async () => {
    if (!newPolicyTitle.trim()) return;
    
    try {
      await createItem({
        type,
        title: newPolicyTitle.trim(),
        content: `# ${newPolicyTitle}\n\nEnter your policy content here...`
      });
      setNewPolicyTitle('');
      setShowNewPolicyDialog(false);
      toast({
        title: "Policy Created",
        description: `${newPolicyTitle} has been created as a draft.`
      });
    } catch (error) {
      console.error('Error creating policy:', error);
      toast({
        title: "Error",
        description: "Failed to create policy",
        variant: "destructive"
      });
    }
  };

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
      
      // Refresh items to show updated status
      await fetchItems();
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
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        
        {/* Policy Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
          {items.length > 0 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Label htmlFor="policy-select" className="flex-shrink-0">Policy:</Label>
              <Select value={selectedItemId || ''} onValueChange={handleItemSelect}>
                <SelectTrigger id="policy-select" className="w-full sm:w-[200px] bg-background">
                  <SelectValue placeholder="Select a policy..." />
                </SelectTrigger>
                <SelectContent className="bg-background border shadow-lg z-50">
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id} className="hover:bg-muted">
                      {item.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            onClick={() => setShowNewPolicyDialog(true)}
            size="sm"
            variant="outline"
            className="w-full sm:w-auto flex-shrink-0"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2">
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
            <div className="prose max-w-none overflow-hidden">
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
                <div className="prose max-w-none p-4 bg-muted/50 rounded-lg overflow-hidden">
                  <div dangerouslySetInnerHTML={{ __html: (currentItem?.status === 'published' ? currentItem.content : publishedContent) || 'No published content' }} />
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

      {/* New Policy Dialog */}
      <Dialog open={showNewPolicyDialog} onOpenChange={setShowNewPolicyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="policy-title">Policy Title *</Label>
              <Input
                id="policy-title"
                value={newPolicyTitle}
                onChange={(e) => setNewPolicyTitle(e.target.value)}
                placeholder="e.g., Cookie Policy"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewPolicyDialog(false);
                setNewPolicyTitle('');
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateNewPolicy}
              disabled={!newPolicyTitle.trim()}
            >
              Create Policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};