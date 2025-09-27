import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, FileText, Edit3, Save, Eye } from 'lucide-react';
import { FormsPoliciesEditor } from '@/components/forms-policies/FormsPoliciesEditor';
import { useFormsPolicies } from '@/hooks/useFormsPolicies';
import { useToast } from '@/hooks/use-toast';

const contractTemplates = [
  {
    id: 'basic-retainer',
    name: 'Basic Retainer Agreement',
    description: 'Standard lawyer-client retainer agreement',
    content: `# Retainer Agreement

This Retainer Agreement ("Agreement") is entered into between [LAWYER_NAME], a licensed attorney ("Attorney"), and [CLIENT_NAME] ("Client").

## 1. Legal Services
Attorney agrees to provide legal services for the following matter: [CASE_DESCRIPTION]

## 2. Attorney Fees
- Hourly Rate: $[HOURLY_RATE]/hour
- Retainer Amount: $[RETAINER_AMOUNT]
- Billing Frequency: Monthly

## 3. Scope of Representation
[SCOPE_DETAILS]

## 4. Client Responsibilities
Client agrees to:
- Provide all necessary information and documents
- Pay fees as agreed
- Cooperate in the legal matter

## 5. Termination
Either party may terminate this agreement with written notice.

Attorney: _________________________ Date: _________
[LAWYER_NAME]

Client: _________________________ Date: _________
[CLIENT_NAME]`
  },
  {
    id: 'partnership-agreement',
    name: 'Law Firm Partnership Agreement',
    description: 'Partnership agreement for joining the firm',
    content: `# Law Firm Partnership Agreement

This Partnership Agreement is between [FIRM_NAME] ("Firm") and [LAWYER_NAME] ("Partner").

## 1. Partnership Terms
- Start Date: [START_DATE]
- Partnership Level: [LEVEL]
- Practice Areas: [PRACTICE_AREAS]

## 2. Compensation Structure
- Base Salary: $[BASE_SALARY]
- Commission Rate: [COMMISSION_RATE]%
- Bonus Structure: [BONUS_DETAILS]

## 3. Responsibilities
Partner agrees to:
- Handle assigned cases professionally
- Meet performance standards
- Follow firm policies and procedures

## 4. Revenue Sharing
[REVENUE_SHARING_DETAILS]

## 5. Confidentiality
Partner agrees to maintain strict confidentiality of all client and firm information.

Firm Representative: _________________________ Date: _________

Partner: _________________________ Date: _________
[LAWYER_NAME]`
  },
  {
    id: 'fee-agreement',
    name: 'Fee Agreement Template',
    description: 'Contingency and hourly fee agreement',
    content: `# Fee Agreement

This Fee Agreement is between [LAWYER_NAME] ("Attorney") and [CLIENT_NAME] ("Client").

## 1. Fee Structure
Select one:
☐ Hourly Rate: $[HOURLY_RATE]/hour
☐ Contingency Fee: [PERCENTAGE]% of recovery
☐ Flat Fee: $[FLAT_FEE]

## 2. Costs and Expenses
Client is responsible for:
- Court filing fees
- Expert witness fees
- Investigation costs
- Document production costs

## 3. Payment Terms
[PAYMENT_TERMS]

## 4. No Recovery, No Fee
In contingency cases, if no recovery is obtained, client owes no attorney fees.

## 5. Dispute Resolution
Any fee disputes will be resolved through arbitration.

Attorney: _________________________ Date: _________
[LAWYER_NAME]

Client: _________________________ Date: _________
[CLIENT_NAME]`
  }
];

export default function LawyerContractsPage() {
  const { 
    items: contracts, 
    currentItem, 
    isLoading, 
    isSaving, 
    hasUnsavedChanges,
    fetchItems,
    fetchItem, 
    createItem, 
    saveDraft,
    publishItem,
    setCurrentItem 
  } = useFormsPolicies('lawyer_contracts');
  
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [showNewContractDialog, setShowNewContractDialog] = useState(false);
  const [newContractTitle, setNewContractTitle] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [draftContent, setDraftContent] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    if (contracts.length > 0 && !selectedContractId) {
      setSelectedContractId(contracts[0].id);
      fetchItem(contracts[0].id);
    }
  }, [contracts, selectedContractId, fetchItem]);

  useEffect(() => {
    if (currentItem) {
      setDraftContent(currentItem.content);
    }
  }, [currentItem]);

  const handleContractSelect = (contractId: string) => {
    if (hasUnsavedChanges) {
      const confirm = window.confirm('You have unsaved changes. Are you sure you want to switch contracts?');
      if (!confirm) return;
    }
    
    setSelectedContractId(contractId);
    fetchItem(contractId);
    setIsEditing(false);
  };

  const handleCreateNewContract = async () => {
    if (!newContractTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a contract title",
        variant: "destructive",
      });
      return;
    }

    try {
      const template = contractTemplates.find(t => t.id === selectedTemplate);
      const content = template ? template.content : '# New Contract\n\nEnter your contract content here...';
      
      await createItem({
        type: 'lawyer_contracts',
        title: newContractTitle,
        content: content,
      });

      setNewContractTitle('');
      setSelectedTemplate('');
      setShowNewContractDialog(false);
      fetchItems();
      
      toast({
        title: "Success",
        description: "New contract created successfully",
      });
    } catch (error) {
      console.error('Error creating contract:', error);
      toast({
        title: "Error",
        description: "Failed to create contract",
        variant: "destructive",
      });
    }
  };

  const handleSaveDraft = async () => {
    if (!currentItem) return;
    
    try {
      await saveDraft(currentItem.id, { content: draftContent });
      toast({
        title: "Success",
        description: "Draft saved successfully",
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error", 
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  const handleContentChange = (content: string) => {
    setDraftContent(content);
  };

  const handlePublish = async (changeNote: string) => {
    if (!currentItem) return;
    
    await publishItem(currentItem.id, changeNote);
    setIsEditing(false);
    fetchItems();
    
    toast({
      title: "Success",
      description: "Contract published successfully",
    });
  };

  if (isLoading) {
    return <div className="p-6">Loading contracts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Lawyer Partner Contracts</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage legal contracts for lawyer partnerships, retainer agreements, and fee structures.
          </p>
        </div>
        <Button onClick={() => setShowNewContractDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Contract
        </Button>
      </div>

      {/* Contract Selector */}
      {contracts.length > 0 && (
        <div className="flex items-center gap-4">
          <Label htmlFor="contract-select">Select Contract:</Label>
          <Select value={selectedContractId} onValueChange={handleContractSelect}>
            <SelectTrigger className="w-80">
              <SelectValue placeholder="Choose a contract" />
            </SelectTrigger>
            <SelectContent>
              {contracts.map((contract) => (
                <SelectItem key={contract.id} value={contract.id}>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{contract.title}</span>
                    <Badge variant={contract.status === 'published' ? 'default' : 'secondary'}>
                      {contract.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Action Buttons */}
      {currentItem && (
        <div className="flex items-center gap-2">
          <Button 
            variant={isEditing ? "default" : "outline"}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? <Save className="h-4 w-4 mr-2" /> : <Edit3 className="h-4 w-4 mr-2" />}
            {isEditing ? 'Save Changes' : 'Edit Contract'}
          </Button>
          
          <Button variant="outline" onClick={() => setIsEditing(false)} disabled={!isEditing}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
        </div>
      )}

      {/* Contract Content */}
      {currentItem && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {currentItem.title}
              <Badge variant={currentItem.status === 'published' ? 'default' : 'secondary'}>
                {currentItem.status} v{currentItem.version}
              </Badge>
            </CardTitle>
            <CardDescription>
              Last updated: {new Date(currentItem.updated_at).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <FormsPoliciesEditor
                content={draftContent}
                onChange={handleContentChange}
                onPublish={handlePublish}
                isLoading={isSaving}
                hasUnsavedChanges={hasUnsavedChanges}
              />
            ) : (
              <div className="prose max-w-none">
                <div 
                  className="border rounded-lg p-6 bg-muted/30"
                  dangerouslySetInnerHTML={{ 
                    __html: currentItem.content.replace(/\n/g, '<br/>') 
                  }} 
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No Contracts State */}
      {contracts.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold">No contracts yet</h3>
                <p className="text-muted-foreground">Create your first lawyer contract to get started.</p>
              </div>
              <Button onClick={() => setShowNewContractDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Contract
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Contract Dialog */}
      <Dialog open={showNewContractDialog} onOpenChange={setShowNewContractDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Contract</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="contract-title">Contract Title *</Label>
              <Input
                id="contract-title"
                value={newContractTitle}
                onChange={(e) => setNewContractTitle(e.target.value)}
                placeholder="Enter contract title..."
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="template-select">Choose Template (Optional)</Label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a template or start blank" />
                </SelectTrigger>
                <SelectContent>
                  {contractTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-semibold">{template.name}</div>
                        <div className="text-sm text-muted-foreground">{template.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewContractDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateNewContract} disabled={!newContractTitle.trim()}>
              Create Contract
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}