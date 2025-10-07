import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useContracts, Contract } from "@/hooks/useContracts";
import { Download, Send, AlertCircle, Package } from "lucide-react";
import { LanguageToggleButton } from "./LanguageToggleButton";
import { DhlShipmentDialog } from "./DhlShipmentDialog";
import { downloadContractPdf } from "@/utils/contractPdfGenerator";
import { Badge } from "@/components/ui/badge";

interface ContractReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  contract: Contract;
  caseInfo?: {
    case_number: string;
    title: string;
    client_name?: string;
  };
  lawyerName?: string;
}

export function ContractReviewDialog({
  isOpen,
  onClose,
  contract,
  caseInfo,
  lawyerName
}: ContractReviewDialogProps) {
  const { toast } = useToast();
  const { updateContractStatus, markContractViewed, markContractDownloaded } = useContracts();
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar'>('en');
  const [changeRequest, setChangeRequest] = useState("");
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [showDhlDialog, setShowDhlDialog] = useState(false);

  const displayContent = currentLanguage === 'en' ? contract.content_en : contract.content_ar;

  const handleDownloadPdf = async () => {
    try {
      if (!caseInfo) {
        throw new Error("Case information not available");
      }

      downloadContractPdf({
        caseNumber: caseInfo.case_number,
        caseTitle: caseInfo.title,
        clientName: caseInfo.client_name || "Client",
        lawyerName: lawyerName || "Lawyer",
        content: displayContent || "",
        language: currentLanguage,
        createdAt: new Date(contract.created_at).toLocaleDateString()
      });

      await markContractDownloaded.mutateAsync(contract.id);

      toast({
        title: "Success",
        description: "Contract downloaded successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to download contract",
        variant: "destructive"
      });
    }
  };

  const handleRequestChanges = async () => {
    if (!changeRequest.trim()) {
      toast({
        title: "Error",
        description: "Please describe the changes you'd like",
        variant: "destructive"
      });
      return;
    }

    setIsRequestingChanges(true);
    try {
      await updateContractStatus.mutateAsync({
        contractId: contract.id,
        status: 'changes_requested',
        updates: {
          client_change_request: changeRequest,
          change_source: 'client_request'
        }
      });

      toast({
        title: "Success",
        description: "Change request sent to lawyer"
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to request changes",
        variant: "destructive"
      });
    } finally {
      setIsRequestingChanges(false);
    }
  };

  // Mark as viewed when opened
  useState(() => {
    if (contract.status === 'sent' && !contract.viewed_at) {
      markContractViewed.mutate(contract.id);
    }
  });

  const getStatusBadge = () => {
    const statusColors: Record<string, string> = {
      'sent': 'bg-blue-500',
      'viewed': 'bg-purple-500',
      'downloaded': 'bg-green-500',
      'sent_for_signature': 'bg-orange-500',
      'physically_signed': 'bg-emerald-500',
      'active': 'bg-green-600'
    };

    return (
      <Badge className={statusColors[contract.status] || 'bg-gray-500'}>
        {contract.status.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Contract Review</DialogTitle>
              {getStatusBadge()}
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <LanguageToggleButton
                currentLanguage={currentLanguage}
                onLanguageChange={setCurrentLanguage}
                contentEn={contract.content_en}
                contentAr={contract.content_ar}
              />
              <Button onClick={handleDownloadPdf} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>

            {contract.dhl_tracking_number && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm font-medium mb-1">Shipment Tracking</p>
                <p className="text-sm text-muted-foreground">
                  DHL Tracking: {contract.dhl_tracking_number}
                </p>
                {contract.expected_delivery_date && (
                  <p className="text-sm text-muted-foreground">
                    Expected: {new Date(contract.expected_delivery_date).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}

            <div className="bg-background border rounded-lg p-4 max-h-[400px] overflow-y-auto">
              <pre
                className={`whitespace-pre-wrap ${currentLanguage === 'ar' ? 'text-right' : ''}`}
                dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
              >
                {displayContent}
              </pre>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Physical Signature Required</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    After reviewing, download and print this contract, sign it, and ship it via DHL.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="change-request">Request Changes</Label>
              <Textarea
                id="change-request"
                value={changeRequest}
                onChange={(e) => setChangeRequest(e.target.value)}
                placeholder="Describe any changes you'd like to request..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="outline"
                onClick={handleRequestChanges}
                disabled={isRequestingChanges || !changeRequest.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Request Changes
              </Button>
              {contract.status === 'downloaded' && (
                <Button onClick={() => setShowDhlDialog(true)}>
                  <Package className="w-4 h-4 mr-2" />
                  Mark as Sent for Signature
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DhlShipmentDialog
        isOpen={showDhlDialog}
        onClose={() => setShowDhlDialog(false)}
        contractId={contract.id}
      />
    </>
  );
}