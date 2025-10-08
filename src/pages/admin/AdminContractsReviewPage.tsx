import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileSearch, Eye, Search, FileSignature } from "lucide-react";
import { AdminContractReviewDialog } from "@/components/AdminContractReviewDialog";

interface Contract {
  id: string;
  proposal_id: string;
  case_id: string;
  lawyer_id: string;
  client_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  content_en?: string;
  content_ar?: string;
  payment_structure?: string;
  consultation_fee?: number;
  remaining_fee?: number;
  timeline?: string;
  cases: {
    id: string;
    title: string;
    category: string;
    client_name: string;
    case_number: string;
  };
  lawyer: {
    first_name: string;
    last_name: string;
    law_firm?: string;
    email: string;
  };
}

export default function AdminContractsReviewPage() {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showContractReview, setShowContractReview] = useState(false);
  const [contractCaseDetails, setContractCaseDetails] = useState<any>(null);
  const [contractLawyerName, setContractLawyerName] = useState<string>("");

  useEffect(() => {
    fetchPendingContracts();
  }, []);

  const fetchPendingContracts = async () => {
    try {
      setLoading(true);
      // Fetch contracts with draft or pending_admin_review status
      const { data: contractsData, error } = await supabase
        .from('contracts')
        .select('*')
        .in('status', ['draft', 'pending_admin_review'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch case and lawyer details for each contract
      const contractsWithDetails = await Promise.all(
        (contractsData || []).map(async (contract) => {
          // Fetch case details
          const { data: caseData, error: caseError } = await supabase
            .from('cases')
            .select('id, title, category, client_name, case_number')
            .eq('id', contract.case_id)
            .single();

          // Fetch lawyer details
          const { data: lawyer, error: lawyerError } = await supabase
            .from('profiles')
            .select('first_name, last_name, law_firm, email')
            .eq('user_id', contract.lawyer_id)
            .single();

          return {
            ...contract,
            cases: caseData || {},
            lawyer: lawyer || {}
          };
        })
      );

      setContracts(contractsWithDetails as any);
    } catch (error: any) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contracts for review",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewContract = async (contract: Contract) => {
    setSelectedContract(contract);
    setContractCaseDetails(contract.cases);
    setContractLawyerName(`${contract.lawyer.first_name} ${contract.lawyer.last_name}`);
    setShowContractReview(true);
  };

  const handleContractUpdate = () => {
    fetchPendingContracts();
  };

  const filteredContracts = contracts.filter(contract => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contract.cases?.title?.toLowerCase().includes(searchLower) ||
      contract.cases?.client_name?.toLowerCase().includes(searchLower) ||
      contract.cases?.case_number?.toLowerCase().includes(searchLower) ||
      contract.lawyer?.first_name?.toLowerCase().includes(searchLower) ||
      contract.lawyer?.last_name?.toLowerCase().includes(searchLower) ||
      contract.status?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'secondary';
      case 'pending_admin_review':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return 'Draft';
      case 'pending_admin_review':
        return 'Pending Review';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">Contracts for Review</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve contracts submitted by lawyers
          </p>
        </div>
        <Button onClick={fetchPendingContracts} variant="outline" size="sm" className="self-start sm:self-auto">
          Refresh Data
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
        <div className="relative flex-1 max-w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contracts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
        <Badge variant="secondary" className="self-start sm:self-auto">
          {filteredContracts.length} contract{filteredContracts.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Contracts Found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? "No contracts match your search criteria." : "No contracts pending review at this time."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredContracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <FileSignature className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <CardTitle className="text-base sm:text-lg truncate">Contract for {contract.cases.title}</CardTitle>
                      <Badge variant={getStatusColor(contract.status)} className="text-xs">
                        {getStatusLabel(contract.status)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{contract.cases.category}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewContract(contract)}
                      className="text-xs px-2 py-1 self-start sm:self-auto"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
                <CardDescription className="space-y-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1 text-xs">
                    <span className="truncate">Case: {contract.cases.case_number}</span>
                    <span className="truncate">Client: {contract.cases.client_name}</span>
                    <span className="truncate">Lawyer: {contract.lawyer.first_name} {contract.lawyer.last_name}</span>
                    <span className="truncate">Created: {new Date(contract.created_at).toLocaleDateString()}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    {contract.payment_structure && (
                      <Badge variant="outline" className="text-xs self-start">
                        {contract.payment_structure.replace('_', ' ')}
                      </Badge>
                    )}
                    {contract.consultation_fee && (
                      <span className="text-xs sm:text-sm">
                        Consultation: ${contract.consultation_fee}
                      </span>
                    )}
                    {contract.timeline && (
                      <span className="text-xs text-muted-foreground">
                        Timeline: {contract.timeline}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {contract.lawyer.law_firm && (
                      <span>{contract.lawyer.law_firm}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Contract Review Dialog */}
      {selectedContract && (
        <AdminContractReviewDialog
          contract={selectedContract}
          caseInfo={contractCaseDetails}
          lawyerName={contractLawyerName}
          isOpen={showContractReview}
          onClose={() => {
            setShowContractReview(false);
            setSelectedContract(null);
            setContractCaseDetails(null);
            setContractLawyerName("");
          }}
          onUpdate={handleContractUpdate}
        />
      )}
    </div>
  );
}
