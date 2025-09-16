import { useState } from "react";
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
  Ban
} from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { LawyerRequestsManager } from "@/components/LawyerRequestsManager";
import { CaseDetailsDialog } from "@/components/CaseDetailsDialog";
import { ConversationDialog } from "@/components/ConversationDialog";
import { InviteLawyerDialog } from "@/components/InviteLawyerDialog";

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
                  <p className="text-3xl font-bold text-primary">{stats.pendingReviews}</p>
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
            <TabsTrigger value="lawyers">Lawyers</TabsTrigger>
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
                          {caseItem.status === 'submitted' && (
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

            <Card className="bg-gradient-card shadow-card">
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No lawyers registered</h3>
                <p className="text-muted-foreground">Approved lawyers will appear here</p>
              </CardContent>
            </Card>
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
              <Button variant="destructive" onClick={confirmDeleteIntake}>
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
              <Button variant="destructive" onClick={confirmDenyCase}>
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
              <Button variant="destructive" onClick={confirmDeleteCase}>
                Delete Permanently
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <InviteLawyerDialog
          open={showInviteLawyerDialog}
          onOpenChange={setShowInviteLawyerDialog}
          onSuccess={() => {
            console.log('Lawyer invitation sent successfully');
          }}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;