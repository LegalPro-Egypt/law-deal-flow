import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, FileText, AlertCircle, History } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Contract } from '@/hooks/useContracts';
import { ContractVersionHistory } from '@/components/ContractVersionHistory';

interface LawyerContractRevisionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract | null;
  onUpdate: () => void;
}

export const LawyerContractRevisionDialog = ({
  isOpen,
  onClose,
  contract,
  onUpdate,
}: LawyerContractRevisionDialogProps) => {
  const [updatedContentEn, setUpdatedContentEn] = useState(contract?.content_en || '');
  const [updatedContentAr, setUpdatedContentAr] = useState(contract?.content_ar || '');
  const [changeNotes, setChangeNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar'>('en');
  const [showHistory, setShowHistory] = useState(false);
  const { toast } = useToast();

  const handleResubmit = async () => {
    if (!contract) return;

    if (!changeNotes.trim()) {
      toast({
        title: 'Change notes required',
        description: 'Please describe what changes you made',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({
          content_en: updatedContentEn,
          content_ar: updatedContentAr,
          change_notes: changeNotes,
          change_source: 'lawyer_revision',
          status: 'pending_admin_review',
          version: contract.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', contract.id);

      if (error) throw error;

      toast({
        title: 'Contract resubmitted',
        description: 'Your revised contract has been sent for admin review',
      });

      onUpdate();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!contract) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Revise Contract</DialogTitle>
            <Badge variant="destructive">Changes Requested</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Admin Feedback:</strong>
              <p className="mt-2 whitespace-pre-wrap">{contract.admin_notes}</p>
            </AlertDescription>
          </Alert>

          <div className="flex gap-2 justify-between items-center">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Contract Content
            </Label>
            <div className="flex gap-2">
              <Button
                variant={currentLanguage === 'en' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentLanguage('en')}
              >
                English
              </Button>
              <Button
                variant={currentLanguage === 'ar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCurrentLanguage('ar')}
              >
                Arabic
              </Button>
            </div>
          </div>

          <Textarea
            value={currentLanguage === 'en' ? updatedContentEn : updatedContentAr}
            onChange={(e) =>
              currentLanguage === 'en'
                ? setUpdatedContentEn(e.target.value)
                : setUpdatedContentAr(e.target.value)
            }
            className="min-h-[300px] font-mono text-sm"
            dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
          />

          <div>
            <Label htmlFor="changeNotes">
              Change Notes <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="changeNotes"
              value={changeNotes}
              onChange={(e) => setChangeNotes(e.target.value)}
              placeholder="Describe the changes you made based on admin feedback..."
              className="mt-2"
              rows={4}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              disabled={isProcessing}
              className="w-full sm:w-auto"
            >
              <History className="w-4 h-4 mr-2" />
              View History
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isProcessing}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleResubmit}
                disabled={isProcessing || !changeNotes.trim()}
                className="w-full sm:w-auto"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Resubmit for Review
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      <ContractVersionHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        contractId={contract.id}
        currentVersion={contract.version}
      />
    </Dialog>
  );
};
