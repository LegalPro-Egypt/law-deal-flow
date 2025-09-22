import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminData } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Scale, 
  Users, 
  FileText, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Eye,
  UserPlus,
  Search,
  Filter,
  UserCheck,
  Plus,
  LogOut,
  XCircle,
  Trash2,
  Ban,
  ChevronDown,
  ChevronUp,
  User,
  Briefcase,
  GraduationCap,
  FileImage,
  Mail,
  Phone,
  DollarSign,
  Award,
  Video,
  Globe
} from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { LawyerRequestsManager } from "@/components/LawyerRequestsManager";
import { CaseDetailsDialog } from "@/components/CaseDetailsDialog";
import { ConversationDialog } from "@/components/ConversationDialog";
import { InviteLawyerDialog } from "@/components/InviteLawyerDialog";
import { LawyerDetailsDialog } from "@/components/LawyerDetailsDialog";
import { AssignLawyerDialog } from "@/components/AssignLawyerDialog";
import { LawyerChatHistoryDialog } from "@/components/LawyerChatHistoryDialog";
import AnonymousQAManager from "@/components/AnonymousQAManager";
import { ProBonoApplicationsManager } from "@/components/ProBonoApplicationsManager";
import { AdminProposalReviewDialog } from "@/components/AdminProposalReviewDialog";
import { formatCaseStatus, getCaseCompletionStatus } from "@/utils/caseUtils";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { stats, pendingIntakes, cases, loading, createCaseFromIntake, deleteSelectedIntakes, denyCaseAndDelete, deleteCase, refreshData } = useAdminData();
  
  // State variables
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [intakeToDelete, setIntakeToDelete] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showInviteLawyerDialog, setShowInviteLawyerDialog] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [showCaseDeleteConfirm, setShowCaseDeleteConfirm] = useState(false);
  const [caseToDeny, setCaseToDeny] = useState<string | null>(null);
  const [showCaseDenyConfirm, setShowCaseDenyConfirm] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const [allLawyers, setAllLawyers] = useState<any[]>([]);
  const [selectedLawyerId, setSelectedLawyerId] = useState<string | null>(null);
  const [showLawyerDetails, setShowLawyerDetails] = useState(false);
  const [cardUrls, setCardUrls] = useState<Record<string, { front?: string; back?: string }>>({});
  const [expandedLawyers, setExpandedLawyers] = useState<Set<string>>(new Set());
  const [lawyerToDelete, setLawyerToDelete] = useState<string | null>(null);
  const [showLawyerDeleteConfirm, setShowLawyerDeleteConfirm] = useState(false);
  const [expandedImage, setExpandedImage] = useState<{url: string; title: string} | null>(null);
  const [showAssignLawyerDialog, setShowAssignLawyerDialog] = useState(false);
  const [caseToAssign, setCaseToAssign] = useState<{id: string, category?: string} | null>(null);
  const [allProposals, setAllProposals] = useState<any[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [showProposalReview, setShowProposalReview] = useState(false);
  const [proposalCaseDetails, setProposalCaseDetails] = useState<any>(null);
  const [proposalLawyerDetails, setProposalLawyerDetails] = useState<any>(null);
  const [proposalToDelete, setProposalToDelete] = useState<string | null>(null);
  const [showProposalDeleteConfirm, setShowProposalDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchAllLawyers();
    fetchAllProposals();
  }, []);

  const fetchAllLawyers = async () => {
    try {
      const { data: lawyers, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'lawyer')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllLawyers(lawyers || []);

      // Fetch signed URLs for lawyer cards for pending lawyers
      const pendingLawyers = lawyers?.filter(l => l.verification_status === 'pending_complete') || [];
      console.log('Fetching signed URLs for pending lawyers:', pendingLawyers.length);
      
      const urlPromises = pendingLawyers.map(async (lawyer) => {
        const urls: { front?: string; back?: string } = {};
        console.log(`Processing lawyer ${lawyer.id} - Front URL: ${lawyer.lawyer_card_front_url}, Back URL: ${lawyer.lawyer_card_back_url}`);

        if (lawyer.lawyer_card_front_url) {
          // Check if the URL is already a signed URL (contains 'storage/v1/object/sign')
          if (lawyer.lawyer_card_front_url.includes('storage/v1/object/sign')) {
            // Use the existing signed URL directly
            urls.front = lawyer.lawyer_card_front_url;
            console.log(`Using existing signed front URL for lawyer ${lawyer.id}`);
          } else {
            // Generate a new signed URL from the file path
            try {
              const { data: frontUrl, error: frontError } = await supabase.storage
                .from('lawyer-documents')
                .createSignedUrl(lawyer.lawyer_card_front_url, 60 * 60 * 24); // 24 hours
              
              if (frontError) {
                console.error(`Error fetching front card URL for lawyer ${lawyer.id}:`, frontError);
              }
              
              if (frontUrl?.signedUrl) {
                urls.front = frontUrl.signedUrl;
                console.log(`Successfully fetched front URL for lawyer ${lawyer.id}`);
              }
            } catch (error) {
              console.error(`Exception fetching front card URL for lawyer ${lawyer.id}:`, error);
            }
          }
        }

        if (lawyer.lawyer_card_back_url) {
          // Check if the URL is already a signed URL (contains 'storage/v1/object/sign')
          if (lawyer.lawyer_card_back_url.includes('storage/v1/object/sign')) {
            // Use the existing signed URL directly
            urls.back = lawyer.lawyer_card_back_url;
            console.log(`Using existing signed back URL for lawyer ${lawyer.id}`);
          } else {
            // Generate a new signed URL from the file path
            try {
              const { data: backUrl, error: backError } = await supabase.storage
                .from('lawyer-documents')
                .createSignedUrl(lawyer.lawyer_card_back_url, 60 * 60 * 24); // 24 hours
              
              if (backError) {
                console.error(`Error fetching back card URL for lawyer ${lawyer.id}:`, backError);
              }
              
              if (backUrl?.signedUrl) {
                urls.back = backUrl.signedUrl;
                console.log(`Successfully fetched back URL for lawyer ${lawyer.id}`);
              }
            } catch (error) {
              console.error(`Exception fetching back card URL for lawyer ${lawyer.id}:`, error);
            }
          }
        }

        return { id: lawyer.id, urls };
      });

      const urlResults = await Promise.all(urlPromises);
      const urlMap = urlResults.reduce((acc, { id, urls }) => {
        acc[id] = urls;
        return acc;
      }, {} as Record<string, { front?: string; back?: string }>);

      setCardUrls(urlMap);
    } catch (error: any) {
      console.error('Error fetching lawyers:', error);
    }
  };

  const fetchAllProposals = async () => {
    try {
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

      setAllProposals(proposalsWithDetails);
    } catch (error: any) {
      console.error('Error fetching proposals:', error);
    }
  };

  const handleViewProposal = async (proposal: any) => {
    setSelectedProposal(proposal);
    setProposalCaseDetails(proposal.cases);
    setProposalLawyerDetails(proposal.lawyer);
    setShowProposalReview(true);
  };

  const handleProposalUpdate = () => {
    fetchAllProposals();
    refreshData();
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
        .in('type', ['proposal_sent', 'proposal_approved', 'proposal_rejected']);

      if (notificationError) {
        console.warn('Failed to clean up notifications:', notificationError);
      }

      toast({
        title: "Proposal Deleted",
        description: "The proposal has been permanently deleted and case status reverted",
      });

      fetchAllProposals();
      refreshData();
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

  const handleApproveVerification = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'verified',
          is_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast({
        title: "Lawyer Approved",
        description: "The lawyer verification has been approved successfully",
      });
      
      await fetchAllLawyers();
      await refreshData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to approve lawyer: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectVerification = async (userId: string, reason: string = '') => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: 'pending_basic',
          is_verified: false,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
      
      toast({
        title: "Lawyer Verification Rejected",
        description: "The lawyer will need to resubmit their verification",
      });
      
      await fetchAllLawyers();
      await refreshData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to reject verification: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/?force=true');
      toast({
        title: "Signed out successfully",
        description: "You have been logged out",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to sign out: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateCase = async (conversationId: string) => {
    try {
      await createCaseFromIntake(conversationId);
      await refreshData();
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleViewConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setShowConversation(true);
  };

  const handleViewCaseDetails = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowCaseDetails(true);
  };

  const handleDeleteIntake = (intakeId: string) => {
    setIntakeToDelete(intakeId);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteIntake = async () => {
    if (!intakeToDelete) return;
    
    try {
      await deleteSelectedIntakes([intakeToDelete]);
      setShowDeleteConfirm(false);
      setIntakeToDelete(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleDenyCase = (caseId: string) => {
    setCaseToDeny(caseId);
    setShowCaseDenyConfirm(true);
  };

  const handleDeleteCase = (caseId: string) => {
    setCaseToDelete(caseId);
    setShowCaseDeleteConfirm(true);
  };

  const handleViewLawyerDetails = (lawyerId: string) => {
    setSelectedLawyerId(lawyerId);
    setShowLawyerDetails(true);
  };

  const toggleLawyerExpansion = (lawyerId: string) => {
    console.log('Toggling lawyer expansion for ID:', lawyerId);
    console.log('Current expanded lawyers:', Array.from(expandedLawyers));
    
    const newExpanded = new Set(expandedLawyers);
    if (newExpanded.has(lawyerId)) {
      newExpanded.delete(lawyerId);
      console.log('Collapsing lawyer details for:', lawyerId);
    } else {
      newExpanded.add(lawyerId);
      console.log('Expanding lawyer details for:', lawyerId);
    }
    
    setExpandedLawyers(newExpanded);
    console.log('New expanded lawyers:', Array.from(newExpanded));
  };

  const handleDeleteLawyer = (lawyerId: string) => {
    setLawyerToDelete(lawyerId);
    setShowLawyerDeleteConfirm(true);
  };

  const handleAssignLawyer = (caseId: string, category?: string) => {
    setCaseToAssign({ id: caseId, category });
    setShowAssignLawyerDialog(true);
  };

  const confirmDeleteLawyer = async () => {
    if (!lawyerToDelete) return;
    const id = lawyerToDelete;
    console.log('Confirming delete for lawyer id:', id);

    // Optimistic UI update
    setAllLawyers((prev) => prev.filter((l) => l.id !== id));

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Lawyer Deleted',
        description: 'The lawyer has been permanently deleted',
      });

      await fetchAllLawyers();
      await refreshData();
    } catch (error: any) {
      console.error('Failed to delete lawyer', error);
      toast({
        title: 'Error',
        description: 'Failed to delete lawyer: ' + error.message,
        variant: 'destructive',
      });
      // Re-sync data in case optimistic update was wrong
      await fetchAllLawyers();
    } finally {
      setShowLawyerDeleteConfirm(false);
      setLawyerToDelete(null);
    }
  };

  const confirmDenyCase = async () => {
    if (!caseToDeny) return;
    
    try {
      await denyCaseAndDelete(caseToDeny, denyReason);
      setShowCaseDenyConfirm(false);
      setCaseToDeny(null);
      setDenyReason("");
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const confirmDeleteCase = async () => {
    if (!caseToDelete) return;
    
    try {
      await deleteCase(caseToDelete);
      setShowCaseDeleteConfirm(false);
      setCaseToDelete(null);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-destructive';
      case 'medium': return 'bg-warning';
      case 'low': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/?force=true" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <Scale className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">LegalConnect</span>
                <Badge variant="destructive" className="ml-2">Admin Portal</Badge>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/?force=true" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalConnect</span>
              <Badge variant="destructive" className="ml-2">Admin Portal</Badge>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cases</p>
                  <p className="text-3xl font-bold">{stats.totalCases}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                  <p className="text-3xl font-bold">{stats.activeCases}</p>
                </div>
                <Clock className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Intakes</p>
                  <p className="text-3xl font-bold">{stats.pendingIntakes}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Lawyers</p>
                  <p className="text-3xl font-bold">{stats.totalLawyers}</p>
                </div>
                <Users className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-primary">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Reviews</p>
                  <p className="text-3xl font-bold text-primary">{stats.pendingReviews + stats.pendingVerifications}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.pendingReviews} cases • {stats.pendingVerifications} verifications
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="intakes" className="space-y-6">
          <div className="border-b">
            <div className="overflow-x-auto scrollbar-hide">
              <TabsList className="inline-flex w-max min-w-full">
                <TabsTrigger value="intakes" className="whitespace-nowrap flex-shrink-0">AI Intakes</TabsTrigger>
                <TabsTrigger value="cases" className="whitespace-nowrap flex-shrink-0">Cases</TabsTrigger>
                <TabsTrigger value="proposals" className="whitespace-nowrap flex-shrink-0">
                  Proposals {allProposals.length > 0 && (
                    <Badge variant="outline" className="ml-1 text-xs">
                      {allProposals.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="lawyers" className="whitespace-nowrap flex-shrink-0">
                  Lawyers {stats.pendingVerifications > 0 && (
                    <Badge variant="destructive" className="ml-1 text-xs">
                      {stats.pendingVerifications}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="probono" className="whitespace-nowrap flex-shrink-0">Pro Bono</TabsTrigger>
                <TabsTrigger value="requests" className="whitespace-nowrap flex-shrink-0">Lawyer Requests</TabsTrigger>
                <TabsTrigger value="anonymous-qa" className="whitespace-nowrap flex-shrink-0">Anonymous Q&A</TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* AI Intakes Tab */}
          <TabsContent value="intakes" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">AI Intake Conversations</h2>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    className="pl-10" 
                    placeholder="Search intakes..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {pendingIntakes.length === 0 ? (
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending intakes</h3>
                  <p className="text-muted-foreground">New AI intake conversations will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingIntakes.map((intake) => (
                  <Card key={intake.id} className="bg-gradient-card shadow-card relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteIntake(intake.id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                     <CardContent className="p-4">
                       <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* Intake Info */}
                        <div>
                          <div className="flex items-center justify-between mb-2 pr-8">
                            <Badge variant="outline">Session: {intake.session_id.slice(0, 8)}...</Badge>
                            <Badge variant="secondary">{intake.language.toUpperCase()}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Started: {formatDate(intake.created_at)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Status: {intake.status}
                          </p>
                          <div className="flex items-center mt-2">
                            <MessageSquare className="h-4 w-4 mr-1 text-muted-foreground" />
                            <span className="text-xs">{intake.messages?.length || 0} messages</span>
                          </div>
                        </div>

                         {/* Messages Preview */}
                         <div className="min-w-0">
                           <h4 className="font-medium mb-1 text-sm">Latest Messages</h4>
                           <div className="space-y-1 text-xs max-h-16 overflow-y-auto">
                             {intake.messages?.slice(-2).map((msg, idx) => (
                               <p key={idx} className="truncate text-xs">
                                 <span className="font-medium capitalize">{msg.role}:</span> {msg.content.slice(0, 60)}...
                               </p>
                             ))}
                           </div>
                         </div>

                         {/* Actions */}
                         <div className="flex flex-col space-y-1">
                           <Button 
                             size="sm" 
                             variant="outline" 
                             className="justify-start text-xs h-8"
                             onClick={() => handleViewConversation(intake.id)}
                           >
                             <Eye className="h-3 w-3 mr-1" />
                             View
                           </Button>
                           <Button 
                             size="sm" 
                             className="bg-gradient-primary justify-start text-xs h-8"
                             onClick={() => handleCreateCase(intake.id)}
                           >
                             <Plus className="h-3 w-3 mr-1" />
                             Create Case
                           </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Cases</h2>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="Search cases..." />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            {cases.length === 0 ? (
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No cases yet</h3>
                  <p className="text-muted-foreground">Cases created from AI intakes will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {cases
                  .sort((a, b) => {
                    // Priority: complete cases (ready for review) first, then incomplete by step progress
                    const aStatus = getCaseCompletionStatus(a);
                    const bStatus = getCaseCompletionStatus(b);
                    
                    if (aStatus.isComplete && !bStatus.isComplete) return -1;
                    if (!aStatus.isComplete && bStatus.isComplete) return 1;
                    
                    // Within each group, sort by creation date (newest first)
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  })
                  .map((caseItem) => {
                    const completionStatus = getCaseCompletionStatus(caseItem);
                    return (
                  <Card 
                    key={caseItem.id} 
                    className={`bg-gradient-card shadow-card ${
                      completionStatus.isComplete ? 'border-green-300 border-2' : 'border-orange-200 border'
                    }`}
                  >
                    <CardContent className="p-6">
                      <div className="mb-4">
                        <Badge className={completionStatus.className}>
                          {completionStatus.label}
                        </Badge>
                        {!completionStatus.isComplete && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {completionStatus.stepProgress}
                          </Badge>
                        )}
                      </div>
                      <div className="grid lg:grid-cols-3 gap-6">
                        {/* Case Info */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{caseItem.case_number}</Badge>
                            <Badge className={getUrgencyColor(caseItem.urgency)}>
                              {caseItem.urgency} Priority
                            </Badge>
                          </div>
                          <h3 className="font-semibold mb-1">{caseItem.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Client: {caseItem.client_name} • {caseItem.language.toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created: {formatDate(caseItem.created_at)}
                          </p>
                        </div>

                        {/* Case Details */}
                        <div>
                          <h4 className="font-medium mb-2 text-sm">Case Details</h4>
                          <div className="space-y-1 text-xs">
                            <p><span className="font-medium">Category:</span> {caseItem.category}</p>
                            <p><span className="font-medium">Status:</span> {formatCaseStatus(caseItem.status)}</p>
                            <p><span className="font-medium">Progress:</span> Step {caseItem.step || 1}/4</p>
                            <p><span className="font-medium">Email:</span> {caseItem.client_email}</p>
                          </div>
                          {caseItem.ai_summary && (
                            <Badge variant="secondary" className="mt-2 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              AI Summary Available
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col space-y-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => handleViewCaseDetails(caseItem.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => handleAssignLawyer(caseItem.id, caseItem.category)}
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Lawyer
                          </Button>
                          {/* Admin can deny/delete any case except completed ones */}
                          {caseItem.status !== 'completed' && caseItem.status !== 'closed' && (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="justify-start text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleDenyCase(caseItem.id)}
                              >
                                <Ban className="h-4 w-4 mr-2" />
                                Deny Case
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="justify-start text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => handleDeleteCase(caseItem.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Case
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Proposals</h2>
              <Badge variant="outline" className="text-sm">
                {allProposals.length} total proposals
              </Badge>
            </div>

            {allProposals.length === 0 ? (
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-8 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No proposals</h3>
                  <p className="text-muted-foreground">Lawyer proposals will appear here</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {allProposals.map((proposal) => {
                  const getStatusBadge = (status: string) => {
                    switch (status) {
                      case 'pending_admin_review':
                        return (
                          <Badge className="bg-orange-500 text-white">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Needs Admin Review
                          </Badge>
                        );
                      case 'approved':
                        return (
                          <Badge className="bg-green-500 text-white">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        );
                      case 'rejected':
                        return (
                          <Badge className="bg-red-500 text-white">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rejected
                          </Badge>
                        );
                      case 'sent':
                        return (
                          <Badge className="bg-blue-500 text-white">
                            <Clock className="h-3 w-3 mr-1" />
                            Awaiting Client Response
                          </Badge>
                        );
                      default:
                        return (
                          <Badge variant="outline">
                            {status}
                          </Badge>
                        );
                    }
                  };

                  return (
                  <Card key={proposal.id} className="bg-gradient-card shadow-card">
                    <CardContent className="p-6">
                      <div className="mb-4">
                        {getStatusBadge(proposal.status)}
                      </div>
                      <div className="grid lg:grid-cols-3 gap-6">
                        {/* Proposal Info */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">
                              ${proposal.total_fee?.toLocaleString() || '0'} Total
                            </Badge>
                            <Badge variant="secondary">
                              {new Date(proposal.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                          <h3 className="font-semibold mb-1">{proposal.cases?.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Case: {proposal.cases?.case_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Client: {proposal.cases?.client_name}
                          </p>
                        </div>

                        {/* Lawyer Info */}
                        <div>
                          <h4 className="font-medium mb-2 text-sm">Lawyer Details</h4>
                          <div className="space-y-1 text-xs">
                            <p><span className="font-medium">Name:</span> {proposal.lawyer?.first_name} {proposal.lawyer?.last_name}</p>
                            <p><span className="font-medium">Firm:</span> {proposal.lawyer?.law_firm || 'N/A'}</p>
                            <p><span className="font-medium">Experience:</span> {proposal.lawyer?.years_experience || 'N/A'} years</p>
                            <p><span className="font-medium">Timeline:</span> {proposal.timeline}</p>
                          </div>
                        </div>

                        {/* Fee Breakdown */}
                        <div>
                          <h4 className="font-medium mb-2 text-sm">Fee Structure</h4>
                          <div className="space-y-1 text-xs">
                            <p><span className="font-medium">Consultation:</span> ${proposal.consultation_fee?.toLocaleString() || '0'}</p>
                            <p><span className="font-medium">Remaining:</span> ${proposal.remaining_fee?.toLocaleString() || '0'}</p>
                            <p className="font-semibold text-primary">
                              <span className="font-medium">Total:</span> ${proposal.total_fee?.toLocaleString() || '0'}
                            </p>
                          </div>
                          
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              className="flex-1 bg-primary hover:bg-primary/90"
                              onClick={() => handleViewProposal(proposal)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              {proposal.status === 'pending_admin_review' ? 'Review' : 'View'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeleteProposal(proposal.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Lawyers Tab */}
          <TabsContent value="lawyers" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Lawyer Management</h2>
              <Button 
                className="bg-gradient-primary"
                onClick={() => setShowInviteLawyerDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Lawyer
              </Button>
            </div>

            {allLawyers.length === 0 ? (
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-8 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No lawyers found</h3>
                  <p className="text-muted-foreground">Lawyers will appear here once they register</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {allLawyers.map((lawyer) => (
                  <Card key={lawyer.id} className="bg-gradient-card shadow-card">
                    <CardContent className="p-6">
                      <div className="grid lg:grid-cols-3 gap-6">
                        {/* Lawyer Info */}
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            {lawyer.verification_status === 'verified' ? (
                              <Badge variant="default" className="bg-success">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            ) : lawyer.verification_status === 'pending_complete' ? (
                              <Badge variant="secondary" className="bg-warning text-warning-foreground">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending Review
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                Incomplete Profile
                              </Badge>
                            )}
                          </div>
                          <h3 className="font-semibold">{lawyer.first_name} {lawyer.last_name}</h3>
                          <p className="text-sm text-muted-foreground">{lawyer.email}</p>
                          {lawyer.law_firm && (
                            <p className="text-sm text-muted-foreground">{lawyer.law_firm}</p>
                          )}
                        </div>

                        {/* Professional Details */}
                        <div>
                          <h4 className="font-medium mb-2 text-sm">Professional Details</h4>
                          {lawyer.verification_status === 'pending_complete' ? (
                            <div className="space-y-1 text-xs">
                              <div className="flex flex-wrap gap-1">
                                {lawyer.specializations?.map((spec: string, index: number) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {spec}
                                  </Badge>
                                )) || <span className="text-muted-foreground">No specializations</span>}
                              </div>
                              {lawyer.years_experience && (
                                <p className="text-muted-foreground">{lawyer.years_experience} years experience</p>
                              )}
                              {lawyer.team_size && (
                                <p className="text-muted-foreground">Team size: {lawyer.team_size}</p>
                              )}
                              {lawyer.license_number && (
                                <p className="text-muted-foreground">License: {lawyer.license_number}</p>
                              )}
                            </div>
                          ) : lawyer.verification_status === 'verified' ? (
                            <div className="flex flex-wrap gap-1">
                              {lawyer.specializations?.map((spec: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {spec}
                                </Badge>
                              )) || <span className="text-xs text-muted-foreground">No specializations</span>}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">Profile incomplete - awaiting verification submission</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col space-y-2">
                          {lawyer.verification_status === 'pending_complete' ? (
                            <>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className={`justify-between transition-colors ${
                                  expandedLawyers.has(lawyer.id) ? 'bg-muted border-primary' : ''
                                }`}
                                onClick={() => toggleLawyerExpansion(lawyer.id)}
                              >
                                <span className="flex items-center">
                                  <FileText className="h-4 w-4 mr-2" />
                                  Review Questionnaire
                                </span>
                                {expandedLawyers.has(lawyer.id) ? 
                                  <ChevronUp className="h-4 w-4" /> : 
                                  <ChevronDown className="h-4 w-4" />
                                }
                              </Button>
                              <Button 
                                size="sm" 
                                className="bg-success justify-start"
                                onClick={() => handleApproveVerification(lawyer.user_id)}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve Verification
                              </Button>
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                className="justify-start"
                                onClick={() => handleRejectVerification(lawyer.user_id)}
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject Verification
                              </Button>
                            </>
                          ) : (
                            <LawyerChatHistoryDialog 
                              lawyerId={lawyer.user_id} 
                              lawyerName={`${lawyer.first_name} ${lawyer.last_name}`.trim() || lawyer.email}
                            >
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="justify-start w-full"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details & Q&A History
                              </Button>
                            </LawyerChatHistoryDialog>
                          )}
                          <Button 
                            type="button"
                            size="sm" 
                            variant="destructive" 
                            className="justify-start"
                            onClick={() => handleDeleteLawyer(lawyer.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Lawyer
                          </Button>
                          <div className="text-xs text-muted-foreground">
                            Joined: {formatDate(lawyer.created_at)}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Questionnaire Details for Pending Lawyers */}
                      {lawyer.verification_status === 'pending_complete' && expandedLawyers.has(lawyer.id) && (
                        <div className="mt-6 pt-6 border-t bg-muted/20 rounded-lg p-6 animate-in slide-in-from-top-2 duration-300">
                          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Lawyer Questionnaire Review
                          </h3>
                          
                          <div className="grid lg:grid-cols-2 gap-6">
                            {/* Left Column - Documents & Personal Info */}
                            <div className="space-y-6">
                              {/* Lawyer Card Documents */}
                              <div className="bg-background p-4 rounded-lg border">
                                <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                                  <FileImage className="h-4 w-4" />
                                  Lawyer Card Documents
                                </h4>
                                
                {/* Check if lawyer has card URLs in database first */}
                {lawyer.lawyer_card_front_url || lawyer.lawyer_card_back_url ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Front Card */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Front Side</p>
                      {lawyer.lawyer_card_front_url && cardUrls[lawyer.id]?.front ? (
                        <div className="relative group">
                           <img 
                             src={cardUrls[lawyer.id].front}
                             alt="Lawyer Card Front"
                             className="w-full h-24 object-cover rounded border shadow-sm transition-transform group-hover:scale-105 cursor-pointer"
                             onClick={() => setExpandedImage({url: cardUrls[lawyer.id].front!, title: `${lawyer.first_name} ${lawyer.last_name} - Lawyer Card (Front)`})}
                             onError={(e) => {
                               const target = e.target as HTMLImageElement;
                               target.style.display = 'none';
                               const fallback = target.nextElementSibling as HTMLElement;
                               if (fallback) fallback.style.display = 'flex';
                             }}
                           />
                          <div className="w-full h-24 bg-muted/50 rounded border flex items-center justify-center text-xs text-muted-foreground hidden">
                            <div className="text-center">
                              <FileImage className="h-4 w-4 mx-auto mb-1" />
                              <span>Failed to load</span>
                            </div>
                          </div>
                        </div>
                      ) : lawyer.lawyer_card_front_url ? (
                        <div className="w-full h-24 bg-amber-50 rounded border-2 border-amber-200 flex items-center justify-center text-xs text-amber-700">
                          <div className="text-center">
                            <FileImage className="h-4 w-4 mx-auto mb-1" />
                            <span>File uploaded, processing...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-24 bg-muted/30 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                          <div className="text-center">
                            <FileImage className="h-4 w-4 mx-auto mb-1" />
                            <span>Not uploaded</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Back Card */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Back Side</p>
                      {lawyer.lawyer_card_back_url && cardUrls[lawyer.id]?.back ? (
                        <div className="relative group">
                           <img 
                             src={cardUrls[lawyer.id].back}
                             alt="Lawyer Card Back"
                             className="w-full h-24 object-cover rounded border shadow-sm transition-transform group-hover:scale-105 cursor-pointer"
                             onClick={() => setExpandedImage({url: cardUrls[lawyer.id].back!, title: `${lawyer.first_name} ${lawyer.last_name} - Lawyer Card (Back)`})}
                             onError={(e) => {
                               const target = e.target as HTMLImageElement;
                               target.style.display = 'none';
                               const fallback = target.nextElementSibling as HTMLElement;
                               if (fallback) fallback.style.display = 'flex';
                             }}
                           />
                          <div className="w-full h-24 bg-muted/50 rounded border flex items-center justify-center text-xs text-muted-foreground hidden">
                            <div className="text-center">
                              <FileImage className="h-4 w-4 mx-auto mb-1" />
                              <span>Failed to load</span>
                            </div>
                          </div>
                        </div>
                      ) : lawyer.lawyer_card_back_url ? (
                        <div className="w-full h-24 bg-amber-50 rounded border-2 border-amber-200 flex items-center justify-center text-xs text-amber-700">
                          <div className="text-center">
                            <FileImage className="h-4 w-4 mx-auto mb-1" />
                            <span>File uploaded, processing...</span>
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-24 bg-muted/30 rounded border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-xs text-muted-foreground">
                          <div className="text-center">
                            <FileImage className="h-4 w-4 mx-auto mb-1" />
                            <span>Not uploaded</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground bg-red-50 rounded border-2 border-red-200">
                    <FileImage className="h-8 w-8 mx-auto mb-2 text-red-400" />
                    <p className="text-sm font-medium text-red-700">No lawyer card documents found</p>
                    <p className="text-xs mt-1 text-red-600">Lawyer has not uploaded their card documents yet</p>
                  </div>
                )}
                              </div>

              {/* Personal Information */}
              <div className="bg-background p-4 rounded-lg border">
                <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Personal Information
                </h4>
                <div className="space-y-4 text-sm">
                  {/* Profile Picture */}
                  <div className="flex items-center space-x-4">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Profile Picture</p>
                      {lawyer.profile_picture_url ? (
                        <div className="relative group">
                           <img 
                             src={lawyer.profile_picture_url}
                             alt="Profile Picture"
                             className="w-16 h-16 object-cover rounded-full border-2 border-border shadow-sm transition-transform group-hover:scale-105 cursor-pointer"
                             onClick={() => setExpandedImage({url: lawyer.profile_picture_url!, title: `${lawyer.first_name} ${lawyer.last_name} - Profile Picture`})}
                             onError={(e) => {
                               const target = e.target as HTMLImageElement;
                               target.style.display = 'none';
                               const fallback = target.nextElementSibling as HTMLElement;
                               if (fallback) fallback.style.display = 'flex';
                             }}
                           />
                          <div className="w-16 h-16 bg-muted/50 rounded-full border-2 border-border flex items-center justify-center text-xs text-muted-foreground hidden">
                            <User className="h-6 w-6" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-muted/30 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                          <User className="h-6 w-6 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Full Name</p>
                          <p>{lawyer.first_name || 'Not provided'} {lawyer.last_name || ''}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Email</p>
                          <p className="truncate">{lawyer.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {lawyer.private_phone && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Private Phone</p>
                        <p>{lawyer.private_phone}</p>
                      </div>
                    )}
                    {lawyer.office_phone && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Office Phone</p>
                        <p>{lawyer.office_phone}</p>
                      </div>
                    )}
                    {!lawyer.private_phone && !lawyer.office_phone && (
                      <div className="col-span-2">
                        <p className="text-xs font-medium text-muted-foreground">Phone Numbers</p>
                        <p className="text-xs text-muted-foreground">Not provided</p>
                      </div>
                    )}
                  </div>
                  
                  {lawyer.office_address ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Office Address</p>
                      <p>{lawyer.office_address}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Office Address</p>
                      <p className="text-xs text-muted-foreground">Not provided</p>
                    </div>
                  )}
                  
                  {lawyer.birth_date && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
                      <p>{new Date(lawyer.birth_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  
                  {lawyer.languages && lawyer.languages.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Languages</p>
                      <div className="flex flex-wrap gap-1">
                        {lawyer.languages.map((language: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {language}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Languages</p>
                      <p className="text-xs text-muted-foreground">Not specified</p>
                    </div>
                  )}
                                </div>
                              </div>

                              {/* Professional Bio */}
                              {lawyer.bio && (
                                <div className="bg-background p-4 rounded-lg border">
                                  <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    Professional Bio
                                  </h4>
                                  <p className="text-sm text-muted-foreground leading-relaxed">{lawyer.bio}</p>
                                </div>
                              )}
                            </div>

                            {/* Right Column - Professional Details */}
                            <div className="space-y-6">
              {/* Legal Practice */}
              <div className="bg-background p-4 rounded-lg border">
                <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                  <Scale className="h-4 w-4" />
                  Legal Practice
                </h4>
                <div className="space-y-4 text-sm">
                  {lawyer.law_firm ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Law Firm</p>
                      <p>{lawyer.law_firm}</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Law Firm</p>
                      <p className="text-xs text-muted-foreground">Not specified</p>
                    </div>
                  )}
                  
                  {lawyer.specializations && lawyer.specializations.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Specializations</p>
                      <div className="flex flex-wrap gap-1">
                        {lawyer.specializations.map((spec: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {spec}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Specializations</p>
                      <p className="text-xs text-muted-foreground">Not specified</p>
                    </div>
                  )}

                  {lawyer.jurisdictions && lawyer.jurisdictions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Jurisdictions</p>
                      <div className="flex flex-wrap gap-1">
                        {lawyer.jurisdictions.map((jurisdiction: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {jurisdiction}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-3">
                    {lawyer.years_experience ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Experience</p>
                        <p>{lawyer.years_experience} years</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Experience</p>
                        <p className="text-xs text-muted-foreground">Not specified</p>
                      </div>
                    )}
                    
                    {lawyer.license_number ? (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">License Number</p>
                        <p>{lawyer.license_number}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">License Number</p>
                        <p className="text-xs text-muted-foreground">Not provided</p>
                      </div>
                    )}
                  </div>
                  
                  {lawyer.bar_admissions && lawyer.bar_admissions.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Bar Admissions</p>
                      <div className="flex flex-wrap gap-1">
                        {lawyer.bar_admissions.map((admission: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {admission}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Bar Admissions</p>
                      <p className="text-xs text-muted-foreground">Not specified</p>
                    </div>
                  )}
                </div>
              </div>

                              {/* Team Structure */}
                              {(lawyer.team_size || lawyer.team_breakdown) && (
                                <div className="bg-background p-4 rounded-lg border">
                                  <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    Team Structure
                                  </h4>
                                  <div className="space-y-3 text-sm">
                                    {lawyer.team_size && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground">Total Team Size</p>
                                        <p>{lawyer.team_size} members</p>
                                      </div>
                                    )}
                                    {lawyer.team_breakdown && (
                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                        {lawyer.team_breakdown.partnersCount && (
                                          <div>
                                            <p className="font-medium">Partners</p>
                                            <p className="text-muted-foreground">{lawyer.team_breakdown.partnersCount}</p>
                                          </div>
                                        )}
                                        {lawyer.team_breakdown.associatesCount && (
                                          <div>
                                            <p className="font-medium">Associates</p>
                                            <p className="text-muted-foreground">{lawyer.team_breakdown.associatesCount}</p>
                                          </div>
                                        )}
                                        {lawyer.team_breakdown.paralegalsCount && (
                                          <div>
                                            <p className="font-medium">Paralegals</p>
                                            <p className="text-muted-foreground">{lawyer.team_breakdown.paralegalsCount}</p>
                                          </div>
                                        )}
                                        {lawyer.team_breakdown.supportStaffCount && (
                                          <div>
                                            <p className="font-medium">Support Staff</p>
                                            <p className="text-muted-foreground">{lawyer.team_breakdown.supportStaffCount}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Pricing & Services */}
                              {(lawyer.pricing_structure || lawyer.consultation_methods || lawyer.payment_structures) && (
                                <div className="bg-background p-4 rounded-lg border">
                                  <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Pricing & Services
                                  </h4>
                                  <div className="space-y-4 text-sm">
                                    {lawyer.consultation_methods && lawyer.consultation_methods.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Consultation Methods</p>
                                        <div className="flex flex-wrap gap-1">
                                          {lawyer.consultation_methods.map((method: string, index: number) => (
                                            <Badge key={index} variant="outline" className="text-xs">
                                              {method}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {lawyer.payment_structures && lawyer.payment_structures.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Payment Structures</p>
                                        <div className="flex flex-wrap gap-1">
                                          {lawyer.payment_structures.map((structure: string, index: number) => (
                                            <Badge key={index} variant="secondary" className="text-xs">
                                              {structure}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {lawyer.pricing_structure && (
                                      <div className="space-y-3">
                                        {lawyer.pricing_structure.consultation && (
                                          <div>
                                            <p className="text-xs font-medium text-muted-foreground">Consultation Rate</p>
                                            <p>{lawyer.pricing_structure.consultation.rate} EGP</p>
                                          </div>
                                        )}
                                        
                                        {lawyer.pricing_structure.services && Object.keys(lawyer.pricing_structure.services).length > 0 && (
                                          <div>
                                            <p className="text-xs font-medium text-muted-foreground mb-2">Service Rates</p>
                                            <div className="space-y-1 text-xs">
                                              {Object.entries(lawyer.pricing_structure.services).map(([key, service]: [string, any]) => (
                                                <div key={key} className="flex justify-between">
                                                  <span>{service.label}</span>
                                                  <span className="font-medium">{service.rate} EGP</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Professional Memberships & Achievements */}
                              {(lawyer.professional_memberships || lawyer.notable_achievements) && (
                                <div className="bg-background p-4 rounded-lg border">
                                  <h4 className="font-semibold text-sm mb-4 flex items-center gap-2">
                                    <Award className="h-4 w-4" />
                                    Professional Recognition
                                  </h4>
                                  <div className="space-y-4 text-sm">
                                    {lawyer.professional_memberships && lawyer.professional_memberships.length > 0 && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Professional Memberships</p>
                                        <div className="flex flex-wrap gap-1">
                                          {lawyer.professional_memberships.map((membership: string, index: number) => (
                                            <Badge key={index} variant="outline" className="text-xs">
                                              {membership}
                                            </Badge>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {lawyer.notable_achievements && (
                                      <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">Notable Achievements</p>
                                        <p className="text-muted-foreground leading-relaxed">{lawyer.notable_achievements}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>


          {/* Lawyer Requests Tab */}
          <TabsContent value="requests" className="space-y-6">
            <LawyerRequestsManager />
          </TabsContent>

          {/* Anonymous Q&A Tab */}
          <TabsContent value="anonymous-qa" className="space-y-6">
            <AnonymousQAManager />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <CaseDetailsDialog
          caseId={selectedCaseId}
          isOpen={showCaseDetails}
          onClose={() => {
            setShowCaseDetails(false);
            setSelectedCaseId(null);
          }}
        />

        <ConversationDialog
          conversationId={selectedConversationId}
          isOpen={showConversation}
          onClose={() => {
            setShowConversation(false);
            setSelectedConversationId(null);
          }}
          onCreateCase={handleCreateCase}
        />

        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Intake</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this intake conversation? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIntakeToDelete(null)}>
                No
              </AlertDialogCancel>
              <Button type="button" variant="destructive" onClick={confirmDeleteIntake}>
                Yes
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showCaseDenyConfirm} onOpenChange={setShowCaseDenyConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deny Case</AlertDialogTitle>
              <AlertDialogDescription>
                This will deny the case and remove it from the platform. The client will be notified.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="my-4">
              <label className="text-sm font-medium">Reason for denial (optional):</label>
              <Textarea
                value={denyReason}
                onChange={(e) => setDenyReason(e.target.value)}
                placeholder="Enter reason for denying this case..."
                className="mt-2"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setCaseToDeny(null);
                setDenyReason("");
              }}>
                Cancel
              </AlertDialogCancel>
              <Button type="button" variant="destructive" onClick={confirmDenyCase}>
                Deny Case
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showCaseDeleteConfirm} onOpenChange={setShowCaseDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Case Permanently</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the case from the platform. This action cannot be undone.
                Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCaseToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <Button type="button" variant="destructive" onClick={confirmDeleteCase}>
                Delete Permanently
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showLawyerDeleteConfirm} onOpenChange={setShowLawyerDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lawyer</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete this lawyer? This will remove all their data and cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLawyerToDelete(null)}>
                Cancel
              </AlertDialogCancel>
              <Button type="button" variant="destructive" onClick={confirmDeleteLawyer}>
                Delete Lawyer
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <InviteLawyerDialog
          open={showInviteLawyerDialog}
          onOpenChange={setShowInviteLawyerDialog}
          onSuccess={() => {
            console.log('Lawyer invitation sent successfully');
            fetchAllLawyers();
          }}
        />

        <LawyerDetailsDialog
          lawyerId={selectedLawyerId}
          isOpen={showLawyerDetails}
          onClose={() => {
            setShowLawyerDetails(false);
            setSelectedLawyerId(null);
          }}
        />

        <AssignLawyerDialog
          isOpen={showAssignLawyerDialog}
          onClose={() => {
            setShowAssignLawyerDialog(false);
            setCaseToAssign(null);
          }}
          caseId={caseToAssign?.id || ''}
          caseCategory={caseToAssign?.category}
          onAssign={() => {
            refreshData();
          }}
        />

        {/* Image Expansion Dialog */}
        <Dialog open={!!expandedImage} onOpenChange={() => setExpandedImage(null)}>
          <DialogContent className="max-w-4xl w-full p-6">
            <DialogHeader>
              <DialogTitle>{expandedImage?.title}</DialogTitle>
            </DialogHeader>
            <div className="flex justify-center">
              <img 
                src={expandedImage?.url}
                alt={expandedImage?.title}
                className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
              />
            </div>
          </DialogContent>
        </Dialog>

         <AdminProposalReviewDialog
           open={showProposalReview && selectedProposal !== null}
           onOpenChange={setShowProposalReview}
           proposal={selectedProposal}
           caseDetails={proposalCaseDetails}
           lawyerDetails={proposalLawyerDetails}
           onProposalUpdate={handleProposalUpdate}
         />

         {/* Proposal Delete Confirmation Dialog */}
         <AlertDialog open={showProposalDeleteConfirm} onOpenChange={setShowProposalDeleteConfirm}>
           <AlertDialogContent>
             <AlertDialogHeader>
               <AlertDialogTitle>Delete Proposal Permanently</AlertDialogTitle>
               <AlertDialogDescription>
                 This will permanently delete the proposal and revert the case status back to "lawyer_assigned". 
                 The lawyer will be able to create a new proposal. This action cannot be undone.
                 Are you sure you want to proceed?
               </AlertDialogDescription>
             </AlertDialogHeader>
             <AlertDialogFooter>
               <AlertDialogCancel onClick={() => setProposalToDelete(null)}>
                 Cancel
               </AlertDialogCancel>
               <Button type="button" variant="destructive" onClick={confirmDeleteProposal}>
                 Delete Permanently
               </Button>
             </AlertDialogFooter>
           </AlertDialogContent>
         </AlertDialog>
      </div>
    </div>
  );
};

export default AdminDashboard;