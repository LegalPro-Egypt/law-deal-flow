import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileSearch, 
  Eye, 
  Search, 
  Trash2, 
  CheckCircle,
  XCircle,
  DollarSign
} from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AdminProposalReviewDialog } from "@/components/AdminProposalReviewDialog";

interface Proposal {
  id: string;
  case_id: string;
  lawyer_id: string;
  client_id: string;
  status: string;
  proposal_title: string;
  consultation_fee: number;
  total_fee: number;
  estimated_timeline: string;
  terms_conditions: string;
  created_at: string;
  cases: {
    id: string;
    title: string;
    category: string;
    client_name: string;
    case_number: string;
    client_email: string;
  };
  lawyer: {
    first_name: string;
    last_name: string;
    law_firm: string;
    years_experience: number;
    email: string;
  };
}

export default function AdminProposalsReviewPage() {
  const { toast } = useToast();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [showProposalReview, setShowProposalReview] = useState(false);
  const [proposalCaseDetails, setProposalCaseDetails] = useState<any>(null);
  const [proposalLawyerDetails, setProposalLawyerDetails] = useState<any>(null);
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);
  const [showProposalDeleteConfirm, setShowProposalDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchAllProposals();
  }, []);

  const fetchAllProposals = async () => {
    try {
      setLoading(true);
      // Fetch all proposals regardless of status
      const { data: proposals, error } = await supabase
        .from('proposals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch case and lawyer details separately for each proposal
      const proposalsWithDetails = await Promise.all(
        (proposals || []).map(async (proposal) => {
          // Fetch case details
          const { data: caseData, error: caseError } = await supabase
            .from('cases')
            .select('id, title, category, client_name, case_number, client_email')
            .eq('id', proposal.case_id)
            .single();

          // Fetch lawyer details
          const { data: lawyer, error: lawyerError } = await supabase
            .from('profiles')
            .select('first_name, last_name, law_firm, years_experience, email')
            .eq('user_id', proposal.lawyer_id)
            .single();

          return {
            ...proposal,
            cases: caseData || {},
            lawyer: lawyer || {}
          };
        })
      );

      setProposals(proposalsWithDetails as any);
    } catch (error: any) {
      console.error('Error fetching proposals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch proposals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewProposal = async (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setProposalCaseDetails(proposal.cases);
    setProposalLawyerDetails(proposal.lawyer);
    setShowProposalReview(true);
  };

  const handleProposalUpdate = () => {
    fetchAllProposals();
  };

  const handleDeleteProposal = (proposalId: string) => {
    setProposalToDelete(proposalId);
    setShowProposalDeleteConfirm(true);
  };

  const confirmDeleteProposal = async () => {
    if (!proposalToDelete) return;
    
    try {
      // Get proposal details first to update case status
      const { data: proposal, error: fetchError } = await supabase
        .from('proposals')
        .select('case_id, lawyer_id, client_id')
        .eq('id', proposalToDelete)
        .single();

      if (fetchError) throw fetchError;

      // Delete the proposal
      const { error: deleteError } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposalToDelete);

      if (deleteError) throw deleteError;

      // Revert case status back to lawyer_assigned
      const { error: caseError } = await supabase
        .from('cases')
        .update({
          status: 'lawyer_assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', proposal.case_id);

      if (caseError) throw caseError;

      // Clean up any related notifications
      const { error: notificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('case_id', proposal.case_id)
        .in('type', ['proposal_sent', 'proposal_received', 'proposal_approved', 'proposal_rejected']);

      if (notificationError) {
        console.warn('Failed to clean up notifications:', notificationError);
      }

      toast({
        title: "Proposal Deleted",
        description: "The proposal has been permanently deleted and case status reverted",
      });

      fetchAllProposals();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete proposal: " + error.message,
        variant: "destructive",
      });
    } finally {
      setShowProposalDeleteConfirm(false);
      setProposalToDelete(null);
    }
  };

  const filteredProposals = proposals.filter(proposal => {
    const searchLower = searchTerm.toLowerCase();
    return (
      proposal.proposal_title?.toLowerCase().includes(searchLower) ||
      proposal.cases?.title?.toLowerCase().includes(searchLower) ||
      proposal.cases?.client_name?.toLowerCase().includes(searchLower) ||
      proposal.lawyer?.first_name?.toLowerCase().includes(searchLower) ||
      proposal.lawyer?.last_name?.toLowerCase().includes(searchLower) ||
      proposal.status?.toLowerCase().includes(searchLower)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'default';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'sent':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proposals for Review</h1>
          <p className="text-muted-foreground">
            Review and manage lawyer proposals submitted to clients
          </p>
        </div>
        <Button onClick={fetchAllProposals} variant="outline">
          Refresh Data
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search proposals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {filteredProposals.length} proposal{filteredProposals.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {filteredProposals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileSearch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Proposals Found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? "No proposals match your search criteria." : "No lawyer proposals have been submitted yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProposals.map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{proposal.proposal_title}</CardTitle>
                    <Badge variant={getStatusColor(proposal.status)}>
                      {proposal.status}
                    </Badge>
                    <Badge variant="outline">{proposal.cases.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewProposal(proposal)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    <AlertDialog open={showProposalDeleteConfirm && proposalToDelete === proposal.id} onOpenChange={setShowProposalDeleteConfirm}>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteProposal(proposal.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to permanently delete this proposal? This will revert the case status and cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <Button variant="destructive" onClick={confirmDeleteProposal}>
                            Delete
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Case: {proposal.cases.title}</span>
                    <span>Client: {proposal.cases.client_name}</span>
                    <span>Lawyer: {proposal.lawyer.first_name} {proposal.lawyer.last_name}</span>
                    <span>Created: {new Date(proposal.created_at).toLocaleDateString()}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">
                        Consultation: ${proposal.consultation_fee}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">
                        Total: ${proposal.total_fee}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {proposal.estimated_timeline}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {proposal.lawyer.law_firm && (
                      <span>{proposal.lawyer.law_firm} • </span>
                    )}
                    {proposal.lawyer.years_experience} years exp.
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Proposal Review Dialog */}
      {selectedProposal && (
        <AdminProposalReviewDialog
          proposal={selectedProposal}
          caseDetails={proposalCaseDetails}
          lawyerDetails={proposalLawyerDetails}
          open={showProposalReview}
          onOpenChange={(open) => {
            setShowProposalReview(open);
            if (!open) {
              setSelectedProposal(null);
              setProposalCaseDetails(null);
              setProposalLawyerDetails(null);
            }
          }}
          onProposalUpdate={handleProposalUpdate}
        />
      )}
    </div>
  );
}