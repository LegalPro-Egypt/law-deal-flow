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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { LawyerRequestsManager } from "@/components/LawyerRequestsManager";
import { CaseDetailsDialog } from "@/components/CaseDetailsDialog";
import { ConversationDialog } from "@/components/ConversationDialog";
import { InviteLawyerDialog } from "@/components/InviteLawyerDialog";
import { LawyerDetailsDialog } from "@/components/LawyerDetailsDialog";
import { LawyerChatHistoryDialog } from "@/components/LawyerChatHistoryDialog";

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

  useEffect(() => {
    fetchAllLawyers();
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
      const urlPromises = pendingLawyers.map(async (lawyer) => {
        const urls: { front?: string; back?: string } = {};

        if (lawyer.lawyer_card_front_url) {
          try {
            const { data: frontUrl } = await supabase.storage
              .from('lawyer-documents')
              .createSignedUrl(lawyer.lawyer_card_front_url, 60 * 60 * 24); // 24 hours
            if (frontUrl?.signedUrl) urls.front = frontUrl.signedUrl;
          } catch (error) {
            console.error('Error fetching front card URL:', error);
          }
        }

        if (lawyer.lawyer_card_back_url) {
          try {
            const { data: backUrl } = await supabase.storage
              .from('lawyer-documents')
              .createSignedUrl(lawyer.lawyer_card_back_url, 60 * 60 * 24); // 24 hours
            if (backUrl?.signedUrl) urls.back = backUrl.signedUrl;
          } catch (error) {
            console.error('Error fetching back card URL:', error);
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
    const newExpanded = new Set(expandedLawyers);
    if (newExpanded.has(lawyerId)) {
      newExpanded.delete(lawyerId);
    } else {
      newExpanded.add(lawyerId);
    }
    setExpandedLawyers(newExpanded);
  };

  const handleDeleteLawyer = (lawyerId: string) => {
    setLawyerToDelete(lawyerId);
    setShowLawyerDeleteConfirm(true);
  };

  const confirmDeleteLawyer = async () => {
    if (!lawyerToDelete) return;
    const id = lawyerToDelete;
    const lawyer = allLawyers.find(l => l.id === id);
    
    if (!lawyer) {
      toast({
        title: 'Error',
        description: 'Lawyer not found',
        variant: 'destructive',
      });
      return;
    }

    console.log('Confirming complete deletion for lawyer:', lawyer.email);

    // Optimistic UI update
    setAllLawyers((prev) => prev.filter((l) => l.id !== id));

    try {
      const { error } = await supabase.functions.invoke('delete-lawyer-complete', {
        body: {
          lawyerId: id,
          email: lawyer.email
        }
      });

      if (error) throw error;

      toast({
        title: 'Lawyer Deleted',
        description: 'The lawyer and all associated data have been permanently removed',
      });

      await fetchAllLawyers();
      await refreshData();
    } catch (error: any) {
      console.error('Failed to delete lawyer completely:', error);
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="intakes">AI Intakes</TabsTrigger>
            <TabsTrigger value="cases">Cases</TabsTrigger>
            <TabsTrigger value="lawyers">
              Lawyers {stats.pendingVerifications > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {stats.pendingVerifications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests">Lawyer Requests</TabsTrigger>
          </TabsList>

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
                    <CardContent className="p-6">
                      <div className="grid lg:grid-cols-3 gap-6">
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
                        <div>
                          <h4 className="font-medium mb-2 text-sm">Latest Messages</h4>
                          <div className="space-y-1 text-xs max-h-20 overflow-y-auto">
                            {intake.messages?.slice(-2).map((msg, idx) => (
                              <p key={idx} className="truncate">
                                <span className="font-medium capitalize">{msg.role}:</span> {msg.content.slice(0, 80)}...
                              </p>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col space-y-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => handleViewConversation(intake.id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Conversation
                          </Button>
                          <Button 
                            size="sm" 
                            className="bg-gradient-primary justify-start"
                            onClick={() => handleCreateCase(intake.id)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
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
                    // Priority: submitted cases (pending review) first
                    if (a.status === 'submitted' && b.status !== 'submitted') return -1;
                    if (a.status !== 'submitted' && b.status === 'submitted') return 1;
                    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                  })
                  .map((caseItem) => (
                  <Card 
                    key={caseItem.id} 
                    className={`bg-gradient-card shadow-card ${
                      caseItem.status === 'submitted' ? 'border-primary border-2' : ''
                    }`}
                  >
                    <CardContent className="p-6">
                      {caseItem.status === 'submitted' && (
                        <div className="mb-4">
                          <Badge className="bg-primary text-primary-foreground">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Needs Review
                          </Badge>
                        </div>
                      )}
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
                            <p><span className="font-medium">Status:</span> {
                              caseItem.status === 'submitted' ? 'Under Review' : caseItem.status.replace('_', ' ')
                            }</p>
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
                          <Button size="sm" variant="outline" className="justify-start">
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
                ))}
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
                                className="justify-between"
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
                        <div className="mt-6 pt-6 border-t">
                          <div className="space-y-6">
                            {/* Lawyer Cards */}
                            {(cardUrls[lawyer.id]?.front || cardUrls[lawyer.id]?.back) && (
                              <div>
                                <h4 className="font-medium flex items-center gap-2 mb-3">
                                  <FileImage className="h-4 w-4" />
                                  Lawyer Card Documents
                                </h4>
                                <div className="grid grid-cols-2 gap-4">
                                  {cardUrls[lawyer.id]?.front && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2">Front</p>
                                      <img 
                                        src={cardUrls[lawyer.id].front}
                                        alt="Lawyer Card Front"
                                        className="w-full h-32 object-cover rounded border"
                                      />
                                    </div>
                                  )}
                                  {cardUrls[lawyer.id]?.back && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-2">Back</p>
                                      <img 
                                        src={cardUrls[lawyer.id].back}
                                        alt="Lawyer Card Back"
                                        className="w-full h-32 object-cover rounded border"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Team Structure */}
                            {(lawyer.team_size || lawyer.team_breakdown) && (
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <h4 className="font-medium flex items-center gap-2 mb-3">
                                  <Users className="h-4 w-4" />
                                  Team Structure
                                </h4>
                                <div className="space-y-2 text-sm">
                                  {lawyer.team_size && (
                                    <p><strong>Total Team Size:</strong> {lawyer.team_size} members</p>
                                  )}
                                  {lawyer.team_breakdown && (
                                    <div className="grid grid-cols-2 gap-2">
                                      {lawyer.team_breakdown.partnersCount && (
                                        <p><strong>Partners:</strong> {lawyer.team_breakdown.partnersCount}</p>
                                      )}
                                      {lawyer.team_breakdown.associatesCount && (
                                        <p><strong>Associates:</strong> {lawyer.team_breakdown.associatesCount}</p>
                                      )}
                                      {lawyer.team_breakdown.paralegalsCount && (
                                        <p><strong>Paralegals:</strong> {lawyer.team_breakdown.paralegalsCount}</p>
                                      )}
                                      {lawyer.team_breakdown.supportStaffCount && (
                                        <p><strong>Support Staff:</strong> {lawyer.team_breakdown.supportStaffCount}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Pricing & Consultation */}
                            {(lawyer.pricing_structure || lawyer.consultation_methods) && (
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <h4 className="font-medium flex items-center gap-2 mb-3">
                                  <DollarSign className="h-4 w-4" />
                                  Pricing & Consultation
                                </h4>
                                <div className="space-y-3 text-sm">
                                  {lawyer.consultation_methods && (
                                    <div>
                                      <p className="font-medium mb-1">Consultation Methods:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {lawyer.consultation_methods.map((method: string, index: number) => (
                                          <Badge key={index} variant="outline" className="text-xs">
                                            {method}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {lawyer.payment_structures && (
                                    <div>
                                      <p className="font-medium mb-1">Payment Structures:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {lawyer.payment_structures.map((structure: string, index: number) => (
                                          <Badge key={index} variant="outline" className="text-xs">
                                            {structure}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {lawyer.pricing_structure && (
                                    <div>
                                      {lawyer.pricing_structure.consultationRate && (
                                        <p><strong>Consultation Rate:</strong> {lawyer.pricing_structure.consultationRate} EGP</p>
                                      )}
                                      
                                      {/* Legal Service Rates */}
                                      <div className="mt-2">
                                        <p className="font-medium mb-1">Legal Service Rates:</p>
                                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                                          {lawyer.pricing_structure.familyLawRate && (
                                            <p>Family Law: {lawyer.pricing_structure.familyLawRate} EGP</p>
                                          )}
                                          {lawyer.pricing_structure.criminalLawRate && (
                                            <p>Criminal Law: {lawyer.pricing_structure.criminalLawRate} EGP</p>
                                          )}
                                          {lawyer.pricing_structure.corporateLawRate && (
                                            <p>Corporate Law: {lawyer.pricing_structure.corporateLawRate} EGP</p>
                                          )}
                                          {lawyer.pricing_structure.realEstateLawRate && (
                                            <p>Real Estate Law: {lawyer.pricing_structure.realEstateLawRate} EGP</p>
                                          )}
                                          {lawyer.pricing_structure.immigrationLawRate && (
                                            <p>Immigration Law: {lawyer.pricing_structure.immigrationLawRate} EGP</p>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Professional Memberships & Achievements */}
                            {(lawyer.professional_memberships || lawyer.notable_achievements) && (
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <h4 className="font-medium flex items-center gap-2 mb-3">
                                  <Award className="h-4 w-4" />
                                  Professional Memberships & Achievements
                                </h4>
                                <div className="space-y-3 text-sm">
                                  {lawyer.professional_memberships && lawyer.professional_memberships.length > 0 && (
                                    <div>
                                      <p className="font-medium mb-2">Professional Memberships:</p>
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
                                      <p className="font-medium mb-2">Notable Achievements:</p>
                                      <p className="text-muted-foreground">{lawyer.notable_achievements}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {lawyer.bio && (
                              <div className="bg-muted/30 p-4 rounded-lg">
                                <h4 className="font-medium mb-2">Professional Bio</h4>
                                <p className="text-sm text-muted-foreground">{lawyer.bio}</p>
                              </div>
                            )}
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
      </div>
    </div>
  );
};

export default AdminDashboard;