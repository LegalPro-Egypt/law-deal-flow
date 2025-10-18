import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Eye, Download } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useContracts } from '@/hooks/useContracts';
import { ProposalReviewDialog } from '@/components/ProposalReviewDialog';
import { ContractReviewDialog } from '@/components/ContractReviewDialog';

interface MobileProposalsContractsViewProps {
  caseId: string;
  onBack: () => void;
}

export const MobileProposalsContractsView: React.FC<MobileProposalsContractsViewProps> = ({
  caseId,
  onBack,
}) => {
  const { proposals } = useNotifications();
  const { contracts } = useContracts(caseId);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [selectedContract, setSelectedContract] = useState<any>(null);

  // Filter proposals by current case
  const caseProposals = proposals.filter((p: any) => p.case_id === caseId);

  const handleDownloadContract = async (contract: any) => {
    // Simple download implementation
    window.open(contract.file_url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Proposals & Contracts</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        <Tabs defaultValue="proposals">
          <TabsList className="w-full">
            <TabsTrigger value="proposals" className="flex-1">
              Proposals ({caseProposals.length})
            </TabsTrigger>
            <TabsTrigger value="contracts" className="flex-1">
              Contracts ({contracts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proposals" className="mt-4 space-y-3">
            {caseProposals.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No proposals yet</p>
              </Card>
            ) : (
              caseProposals.map((proposal: any) => (
                <Card key={proposal.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{proposal.title || 'Proposal'}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {proposal.description || 'Review this proposal'}
                      </p>
                    </div>
                    <Badge variant={proposal.status === 'pending' ? 'default' : 'secondary'}>
                      {proposal.status}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => setSelectedProposal(proposal)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Review
                  </Button>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="contracts" className="mt-4 space-y-3">
            {contracts.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">No contracts yet</p>
              </Card>
            ) : (
              contracts.map((contract: any) => (
                <Card key={contract.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{contract.title || 'Contract'}</h3>
                      <p className="text-xs text-muted-foreground">
                        Version {contract.version} • {new Date(contract.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={contract.client_signed ? 'default' : 'secondary'}>
                      {contract.client_signed ? 'Signed' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setSelectedContract(contract)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleDownloadContract(contract)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {selectedProposal && (
        <ProposalReviewDialog
          proposal={selectedProposal}
          open={!!selectedProposal}
          onOpenChange={(open) => !open && setSelectedProposal(null)}
          onProposalUpdate={() => {}}
        />
      )}

      {selectedContract && (
        <ContractReviewDialog
          contract={selectedContract}
          isOpen={!!selectedContract}
          onClose={() => setSelectedContract(null)}
        />
      )}
    </div>
  );
};
