import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Eye, FileSignature } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminContractReviewDialog } from "@/components/AdminContractReviewDialog";
import { Contract } from "@/hooks/useContracts";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ContractWithDetails extends Contract {
  cases?: {
    case_number: string;
    title: string;
    category: string;
  };
  lawyer_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
  client_profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function AdminContractsPage() {
  const [contracts, setContracts] = useState<ContractWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedContract, setSelectedContract] = useState<ContractWithDetails | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const { toast } = useToast();

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          cases (
            case_number,
            title,
            category
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch lawyer and client profiles separately
      const enrichedData = await Promise.all((data || []).map(async (contract) => {
        const [lawyerProfile, clientProfile] = await Promise.all([
          supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', contract.lawyer_id)
            .single(),
          supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('user_id', contract.client_id)
            .single()
        ]);

        return {
          ...contract,
          lawyer_profile: lawyerProfile.data,
          client_profile: clientProfile.data
        };
      }));

      setContracts(enrichedData);
    } catch (error: any) {
      console.error('Error fetching contracts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch contracts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();

    // Real-time subscription
    const channel = supabase
      .channel('contracts-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'contracts' 
      }, () => {
        fetchContracts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleViewContract = (contract: ContractWithDetails) => {
    setSelectedContract(contract);
    setShowReviewDialog(true);
  };

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.cases?.case_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.cases?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.lawyer_profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.lawyer_profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client_profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client_profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || contract.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'draft':
      case 'pending_admin_review':
        return 'secondary';
      case 'changes_requested':
        return 'destructive';
      case 'sent':
        return 'default';
      case 'viewed':
        return 'secondary';
      case 'client_accepted':
        return 'default';
      case 'downloaded':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isViewOnlyMode = (status: string) => {
    return !['draft', 'pending_admin_review'].includes(status);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">All Contracts</h1>
            <p className="text-muted-foreground">
              View and manage all contracts in the system
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FileSignature className="h-8 w-8 text-primary" />
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {contracts.length} Total
            </Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by case number, title, lawyer, or client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending_admin_review">Pending Review</SelectItem>
              <SelectItem value="changes_requested">Changes Requested</SelectItem>
              <SelectItem value="sent">Sent to Client</SelectItem>
              <SelectItem value="viewed">Viewed by Client</SelectItem>
              <SelectItem value="client_accepted">Client Accepted</SelectItem>
              <SelectItem value="downloaded">Downloaded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredContracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSignature className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No contracts found</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm || statusFilter !== "all" 
                ? "Try adjusting your filters" 
                : "Contracts will appear here once created"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredContracts.map((contract) => (
            <Card key={contract.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">
                        {contract.cases?.case_number || 'Unknown Case'}
                      </CardTitle>
                      <Badge variant={getStatusColor(contract.status)}>
                        {getStatusLabel(contract.status)}
                      </Badge>
                      {contract.version > 1 && (
                        <Badge variant="outline">
                          v{contract.version}
                        </Badge>
                      )}
                    </div>
                    <CardDescription>
                      {contract.cases?.title || 'No title available'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Category:</span>{" "}
                    <span className="text-muted-foreground">
                      {contract.cases?.category || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Lawyer:</span>{" "}
                    <span className="text-muted-foreground">
                      {contract.lawyer_profile?.first_name} {contract.lawyer_profile?.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Client:</span>{" "}
                    <span className="text-muted-foreground">
                      {contract.client_profile?.first_name} {contract.client_profile?.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>{" "}
                    <span className="text-muted-foreground">
                      {formatDate(contract.created_at)}
                    </span>
                  </div>
                  {contract.sent_at && (
                    <div>
                      <span className="font-medium">Sent to Client:</span>{" "}
                      <span className="text-muted-foreground">
                        {formatDate(contract.sent_at)}
                      </span>
                    </div>
                  )}
                  {contract.client_accepted_at && (
                    <div>
                      <span className="font-medium">Accepted:</span>{" "}
                      <span className="text-muted-foreground">
                        {formatDate(contract.client_accepted_at)}
                      </span>
                    </div>
                  )}
                </div>

                {contract.admin_notes && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">Admin Notes:</p>
                    <p className="text-sm text-muted-foreground">{contract.admin_notes}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewContract(contract)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {isViewOnlyMode(contract.status) ? 'View Details' : 'Review Contract'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedContract && (
        <AdminContractReviewDialog
          isOpen={showReviewDialog}
          onClose={() => {
            setShowReviewDialog(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          caseInfo={selectedContract.cases}
          lawyerName={`${selectedContract.lawyer_profile?.first_name} ${selectedContract.lawyer_profile?.last_name}`}
          onUpdate={fetchContracts}
          viewMode={isViewOnlyMode(selectedContract.status)}
        />
      )}
    </div>
  );
}
