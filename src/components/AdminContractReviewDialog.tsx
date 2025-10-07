import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useContracts, Contract } from "@/hooks/useContracts";
import { CheckCircle, XCircle, Trash2, Loader2 } from "lucide-react";
import { LanguageToggleButton } from "./LanguageToggleButton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface AdminContractReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  caseInfo?: {
    case_number: string;
    title: string;
    category: string;
  };
  lawyerName?: string;
  onUpdate?: () => void;
}

export function AdminContractReviewDialog({
  isOpen,
  onClose,
  contract,
  caseInfo,
  lawyerName,
  onUpdate
}: AdminContractReviewDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { updateContractStatus } = useContracts();
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar'>('en');
  const [adminNotes, setAdminNotes] = useState(contract.admin_notes || "");
  const [isProcessing, setIsProcessing] = useState(false);

  const displayContent = currentLanguage === 'en' ? contract.content_en : contract.content_ar;

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      // First approve, then immediately send to client
      await updateContractStatus.mutateAsync({
        contractId: contract.id,
        status: 'sent',
        updates: {
          admin_reviewed_by: user?.id,
          admin_reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
          sent_at: new Date().toISOString()
        }
      });

      toast({
        title: "Success",
        description: "Contract approved and sent to client"
      });

      onUpdate?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve contract",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!adminNotes.trim()) {
      toast({
        title: "Error",
        description: "Please provide notes about required changes",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      await updateContractStatus.mutateAsync({
        contractId: contract.id,
        status: 'changes_requested',
        updates: {
          admin_reviewed_by: user?.id,
          admin_reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes,
          change_source: 'admin_request'
        }
      });

      toast({
        title: "Success",
        description: "Change request sent to lawyer"
      });

      onUpdate?.();

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request changes",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this contract? This action cannot be undone.")) {
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', contract.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contract deleted successfully"
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contract",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Admin Contract Review</DialogTitle>
            <Badge variant="outline">{contract.status.replace(/_/g, ' ').toUpperCase()}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {caseInfo && (
            <div className="bg-muted p-3 rounded-lg space-y-1">
              <p className="text-sm"><span className="font-medium">Case:</span> {caseInfo.case_number}</p>
              <p className="text-sm"><span className="font-medium">Title:</span> {caseInfo.title}</p>
              <p className="text-sm"><span className="font-medium">Category:</span> {caseInfo.category}</p>
              {lawyerName && <p className="text-sm"><span className="font-medium">Lawyer:</span> {lawyerName}</p>}
            </div>
          )}

          {contract.change_source && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 p-3 rounded-lg">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                Resubmitted ({contract.change_source.replace(/_/g, ' ')})
              </p>
              {contract.client_change_request && (
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Client Request: {contract.client_change_request}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Contract Content</Label>
            <LanguageToggleButton
              currentLanguage={currentLanguage}
              onLanguageChange={setCurrentLanguage}
              contentEn={contract.content_en}
              contentAr={contract.content_ar}
            />
          </div>

          <div className="bg-background border rounded-lg p-4 max-h-[400px] overflow-y-auto">
            <pre
              className={`whitespace-pre-wrap ${currentLanguage === 'ar' ? 'text-right' : ''}`}
              dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
            >
              {displayContent}
            </pre>
          </div>

          <div>
            <Label htmlFor="admin-notes">Admin Notes</Label>
            <Textarea
              id="admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about the review or required changes..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-between">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isProcessing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={handleRequestChanges}
                disabled={isProcessing || !adminNotes.trim()}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Request Changes
              </Button>
              <Button onClick={handleApprove} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-2" />
                )}
                Approve & Send to Client
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}