import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useContracts, Contract } from "@/hooks/useContracts";
import { Download, Send, AlertCircle, Package, History } from "lucide-react";
import { LanguageToggleButton } from "./LanguageToggleButton";
import { DhlShipmentDialog } from "./DhlShipmentDialog";
import { downloadContractPdf } from "@/utils/contractPdfGenerator";
import { Badge } from "@/components/ui/badge";
import { ContractVersionHistory } from "@/components/ContractVersionHistory";
import { cn } from "@/lib/utils";

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
  const { updateContractStatus, markContractViewed, markContractDownloaded, acceptContract } = useContracts();
  const [currentLanguage, setCurrentLanguage] = useState<'en' | 'ar'>('en');
  const [changeRequest, setChangeRequest] = useState("");
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [showDhlDialog, setShowDhlDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

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

  // Lock body scroll on mobile when dialog is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      
      return () => {
        document.body.style.overflow = originalStyle;
        document.body.style.touchAction = '';
      };
    }
  }, [isOpen]);

  const handleAcceptContract = async () => {
    try {
      await acceptContract.mutateAsync(contract.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to accept contract",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = () => {
    const statusColors: Record<string, string> = {
      'sent': 'bg-blue-500',
      'viewed': 'bg-purple-500',
      'client_accepted': 'bg-teal-500',
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
        <DialogContent 
          className={cn(
            "max-w-4xl flex flex-col overflow-hidden",
            "h-[100dvh] sm:h-auto",
            "w-full sm:max-h-[90vh]",
            "p-0 gap-0",
            "sm:rounded-lg"
          )}
          style={{
            maxHeight: '-webkit-fill-available',
          }}
        >
          {/* Fixed Header */}
          <div 
            className="flex-shrink-0 px-6 py-4 border-b bg-background"
            style={{ 
              paddingTop: 'max(1rem, env(safe-area-inset-top))' 
            }}
          >
            <DialogHeader>
              <div className="flex items-center justify-between mb-3">
                <DialogTitle>Contract Review</DialogTitle>
                {getStatusBadge()}
              </div>
            </DialogHeader>
            
            <div className="flex items-center justify-between">
              <LanguageToggleButton
                currentLanguage={currentLanguage}
                onLanguageChange={setCurrentLanguage}
                contentEn={contract.content_en}
                contentAr={contract.content_ar}
              />
              {contract.status === 'client_accepted' && (
                <Button onClick={handleDownloadPdf} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
              )}
            </div>
          </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-4">
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

            <div className="bg-background border rounded-lg p-4 flex-1 overflow-y-auto min-h-0">
              <pre
                className={`whitespace-pre-wrap ${currentLanguage === 'ar' ? 'text-right' : ''}`}
                dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'}
              >
                {displayContent}
              </pre>
            </div>

            {(contract.status === 'viewed' || contract.status === 'sent') && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">Review Required</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Please review the contract carefully. You can accept it or request changes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(contract.status === 'client_accepted' || contract.status === 'downloaded') && (
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                <div className="flex gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">Physical Signature Required</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      Download and print this contract, sign it, and ship it via DHL.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(contract.status === 'viewed' || contract.status === 'sent') && (
              <div>
                <Label htmlFor="change-request">Request Changes (Optional)</Label>
                <Textarea
                  id="change-request"
                  value={changeRequest}
                  onChange={(e) => setChangeRequest(e.target.value)}
                  placeholder="Describe any changes you'd like to request..."
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div 
            className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t bg-background"
            style={{ 
              paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' 
            }}
          >
            <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowHistory(true)}
                className="w-full sm:w-auto"
              >
                <History className="w-4 h-4 mr-2" />
                View History
              </Button>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                
                {(contract.status === 'viewed' || contract.status === 'sent') && (
                  <>
                    <Button
                      variant="outline"
                      onClick={handleRequestChanges}
                      disabled={isRequestingChanges || !changeRequest.trim()}
                      className="w-full sm:w-auto"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Request Changes
                    </Button>
                    <Button 
                      onClick={handleAcceptContract}
                      className="w-full sm:w-auto"
                    >
                      Accept Contract
                    </Button>
                  </>
                )}
                
                {contract.status === 'downloaded' && (
                  <Button 
                    onClick={() => setShowDhlDialog(true)}
                    className="w-full sm:w-auto"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Mark as Sent for Signature
                  </Button>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ContractVersionHistory
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        contractId={contract.id}
        currentVersion={contract.version}
      />

      <DhlShipmentDialog
        isOpen={showDhlDialog}
        onClose={() => setShowDhlDialog(false)}
        contractId={contract.id}
      />
    </>
  );
}