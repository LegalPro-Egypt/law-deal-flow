import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Clock, 
  PenTool, 
  Download, 
  CreditCard,
  ArrowLeft
} from "lucide-react";
import { useClientData } from "@/hooks/useClientData";
import { useContracts } from "@/hooks/useContracts";
import { useLanguage } from "@/hooks/useLanguage";
import { useNotifications } from "@/hooks/useNotifications";
import { ProposalReviewDialog } from "@/components/ProposalReviewDialog";
import { ContractReviewDialog } from "@/components/ContractReviewDialog";
import { ClientHeader } from "@/components/navigation/ClientHeader";
import { toast } from "@/hooks/use-toast";
import { getUserFriendlyDownloadMessage } from "@/utils/pdfDownload";

const ProposalsContracts = () => {
  const navigate = useNavigate();
  const { currentLanguage } = useLanguage();
  const { activeCase, cases, refreshData } = useClientData();
  const { proposals, proposalsWithCases, needsPayment } = useNotifications();
  const { contracts } = useContracts(activeCase?.id);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showProposalReview, setShowProposalReview] = useState(false);
  const [showContractReview, setShowContractReview] = useState(false);

  const handleDownloadContract = async (contract: any) => {
    try {
      const contractCase = cases?.find(c => c.id === contract.case_id);
      
      if (!contractCase) {
        toast({
          title: "Error",
          description: "Could not find case data for this contract",
          variant: "destructive",
        });
        return;
      }

      const content = currentLanguage === 'ar' 
        ? (contract.content_ar || contract.content_en) 
        : (contract.content_en || contract.content_ar);
      
      if (!content) {
        toast({
          title: "Error",
          description: "Contract content is missing. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      const { downloadContractPdf } = await import('@/utils/contractPdfGenerator');
      
      downloadContractPdf({
        caseNumber: contractCase.case_number,
        caseTitle: contractCase.title || 'Legal Contract',
        clientName: contractCase.client_name || 'Client',
        lawyerName: 'Lawyer',
        content: content,
        language: (currentLanguage as 'ar' | 'en'),
        paymentStructure: contract.consultation_fee ? {
          consultationFee: contract.consultation_fee,
          remainingFee: contract.remaining_fee,
          totalFee: contract.total_fee
        } : undefined,
        createdAt: new Date(contract.created_at).toLocaleDateString()
      });

      toast({
        title: "Success",
        description: getUserFriendlyDownloadMessage(),
      });
    } catch (error) {
      console.error('Error downloading contract:', error);
      toast({
        title: "Error",
        description: "Failed to download contract. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <ClientHeader />
      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/client')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <FileText className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Proposals & Contracts</h1>
          </div>
          <p className="text-muted-foreground">
            View proposals, contracts, and updates from your legal team
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="proposals" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="proposals" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Proposals
              {proposals && proposals.length > 0 && (
                <Badge variant="secondary" className="ml-1">{proposals.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Contracts
              {contracts && contracts.length > 0 && (
                <Badge variant="secondary" className="ml-1">{contracts.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proposals" className="mt-0">
            {!proposals || proposals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-lg border">
                <FileText className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-lg text-muted-foreground">
                  {currentLanguage === 'ar' ? 'لا توجد عروض بعد' : 'No proposals yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {proposalsWithCases.filter((p: any) => !activeCase?.id || p.case?.id === activeCase.id).map((proposalWithCase: any) => {
                  const getProposalStatusBadge = (status: string) => {
                    switch (status) {
                      case 'pending':
                        return <Badge className="bg-emerald-500 hover:bg-emerald-500">New</Badge>;
                      case 'viewed':
                        return <Badge className="bg-purple-500 hover:bg-purple-500">Viewed</Badge>;
                      case 'accepted':
                        return <Badge className="bg-blue-500 hover:bg-blue-500">Accepted</Badge>;
                      case 'rejected':
                        return <Badge className="bg-red-500 hover:bg-red-500">Rejected</Badge>;
                      default:
                        return <Badge variant="outline">{status}</Badge>;
                    }
                  };

                  return (
                    <div key={proposalWithCase.id} className="p-6 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-6 w-6 text-muted-foreground shrink-0" />
                          <h4 className="font-semibold text-lg truncate">
                            New Legal Proposal Received
                          </h4>
                        </div>
                        {getProposalStatusBadge(proposalWithCase.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(proposalWithCase.created_at).toLocaleDateString()}
                        </span>
                        {proposalWithCase.case && (
                          <>
                            <span>•</span>
                            <span className="truncate">{proposalWithCase.case.title}</span>
                          </>
                        )}
                      </div>

                      {proposalWithCase.consultation_fee && (
                        <p className="text-sm text-muted-foreground mb-4">
                          Consultation Fee: ${proposalWithCase.consultation_fee}
                        </p>
                      )}

                      <div className="flex justify-end gap-3">
                        {needsPayment(proposalWithCase) && (
                          <Button 
                            variant="default"
                            onClick={() => {
                              const isGracePeriodPayment = proposalWithCase.case?.status === 'active' && proposalWithCase.case?.consultation_completed_at;
                              const remainingFee = proposalWithCase.remaining_fee || 0;
                              const paymentType = isGracePeriodPayment ? 'remaining' : 'consultation';
                              
                              navigate('/payment', {
                                state: {
                                  paymentData: {
                                    type: paymentType,
                                    caseId: proposalWithCase.case?.id,
                                    proposalId: proposalWithCase.id,
                                    consultationFee: proposalWithCase.consultation_fee,
                                    remainingFee: remainingFee,
                                    totalFee: proposalWithCase.final_total_fee || proposalWithCase.total_fee,
                                    lawyerName: proposalWithCase.case?.assigned_lawyer_name || 'Your Lawyer',
                                    caseTitle: proposalWithCase.case?.title
                                  }
                                }
                              });
                            }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Complete Payment
                          </Button>
                        )}
                        <Button 
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => {
                            setSelectedProposal(proposalWithCase);
                            setShowProposalReview(true);
                          }}
                        >
                          View Proposal
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="contracts" className="mt-0">
            {!contracts || contracts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-card rounded-lg border">
                <PenTool className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-lg text-muted-foreground">
                  {currentLanguage === 'ar' ? 'لا توجد عقود بعد' : 'No contracts yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {contracts.map((contract: any) => {
                  const getContractStatusBadge = (status: string) => {
                    switch (status) {
                      case 'sent':
                        return <Badge className="bg-emerald-500 hover:bg-emerald-500">Sent</Badge>;
                      case 'viewed':
                        return <Badge className="bg-purple-500 hover:bg-purple-500">Viewed</Badge>;
                      case 'downloaded':
                        return <Badge className="bg-blue-500 hover:bg-blue-500">Downloaded</Badge>;
                      case 'changes_requested':
                        return <Badge className="bg-amber-500 hover:bg-amber-500">Changes Requested</Badge>;
                      case 'sent_for_signature':
                        return <Badge className="bg-orange-500 hover:bg-orange-500">Sent for Signature</Badge>;
                      case 'physically_signed':
                        return <Badge className="bg-emerald-600 hover:bg-emerald-600">Physically Signed</Badge>;
                      case 'active':
                        return <Badge className="bg-green-600 hover:bg-green-600">Active</Badge>;
                      default:
                        return <Badge variant="outline">{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
                    }
                  };

                  return (
                    <div key={contract.id} className="p-6 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <PenTool className="h-6 w-6 text-muted-foreground shrink-0" />
                          <h4 className="font-semibold text-lg truncate">
                            Contract #{contract.id.slice(0, 8)}
                          </h4>
                        </div>
                        {getContractStatusBadge(contract.status)}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(contract.created_at).toLocaleDateString()}
                        </span>
                        <span>•</span>
                        <span>ID: #{contract.id.slice(0, 8)}</span>
                      </div>

                      {contract.dhl_tracking_number && (
                        <p className="text-sm text-muted-foreground mb-4">
                          📦 DHL Tracking: {contract.dhl_tracking_number}
                        </p>
                      )}

                      <div className="flex justify-end gap-3">
                        <Button 
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadContract(contract);
                          }}
                          title="Download Contract PDF"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                        <Button 
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => {
                            setSelectedContract(contract);
                            setShowContractReview(true);
                          }}
                        >
                          View Contract
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      {selectedProposal && (
        <ProposalReviewDialog
          open={showProposalReview}
          onOpenChange={(open) => {
            setShowProposalReview(open);
            if (!open) setSelectedProposal(null);
          }}
          proposal={selectedProposal}
          onProposalUpdate={() => {
            refreshData();
          }}
        />
      )}

      {selectedContract && (
        <ContractReviewDialog
          isOpen={showContractReview}
          onClose={() => {
            setShowContractReview(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          caseInfo={{
            case_number: activeCase?.case_number || '',
            title: activeCase?.title || '',
            client_name: activeCase?.client_name
          }}
          lawyerName={activeCase?.assigned_lawyer ? 
            `${activeCase.assigned_lawyer.first_name} ${activeCase.assigned_lawyer.last_name}` : 
            'Lawyer'
          }
        />
      )}
    </div>
  );
};

export default ProposalsContracts;
