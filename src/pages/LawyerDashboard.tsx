import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  DollarSign, 
  FileText, 
  MoreHorizontal,
  MessageSquare,
  User,
  LogOut,
  Settings,
  Phone,
  Video,
  ChevronDown,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  TrendingUp,
  MessageCircle,
  Globe,
  Receipt
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { CompleteVerificationForm } from '@/components/CompleteVerificationForm';
import { CaseDetailsDialog } from '@/components/CaseDetailsDialog';
import { CreateProposalDialog } from '@/components/CreateProposalDialog';
import { CommunicationInbox } from '@/components/CommunicationInbox';
import { CaseWorkProgress } from '@/components/CaseWorkProgress';
import { IncomingCallNotification } from '@/components/IncomingCallNotification';
import { LanguageToggle } from '@/components/LanguageToggle';
import { LawyerQAChatbot } from '@/components/LawyerQAChatbot';
import { FeeRequestsManager } from '@/components/FeeRequestsManager';
import { formatDistanceToNow } from 'date-fns';
import { useLawyerData } from '@/hooks/useLawyerData';
import { useCaseWorkData } from '@/hooks/useCaseWorkData';
import { getCaseStatusVariant, getCaseUrgencyVariant, formatCaseStatus } from '@/utils/caseUtils';

interface LawyerStats {
  activeCases: number;
  completedCases: number;
  pendingCases: number;
  totalEarnings: number;
}

const LawyerDashboard = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { assignedCases, stats, loading: dataLoading, refreshData } = useLawyerData();
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  const [showCreateProposal, setShowCreateProposal] = useState(false);
  const [incomingSession, setIncomingSession] = useState<any>(null);
  const [showIncomingCall, setShowIncomingCall] = useState(false);
  const [activeTab, setActiveTab] = useState('cases');

  const selectedCase = assignedCases.find(c => c.id === selectedCaseId);

  useEffect(() => {
    if (assignedCases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(assignedCases[0].id);
    }
  }, [assignedCases, selectedCaseId]);

  // Listen for incoming communication sessions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('incoming-sessions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication_sessions',
          filter: `lawyer_id=eq.${user.id}`,
        },
        (payload) => {
          const session = payload.new as any;
          if (session.status === 'scheduled' && session.initiated_by !== user.id) {
            setIncomingSession(session);
            setShowIncomingCall(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
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

  const handleAcceptCall = async (session: any) => {
    setShowIncomingCall(false);
    setIncomingSession(null);
    // Handle call acceptance logic
  };

  const handleDeclineCall = async (session: any) => {
    setShowIncomingCall(false);
    setIncomingSession(null);
    // Handle call decline logic
  };

  if (authLoading || dataLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <Briefcase className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">LegalPro</span>
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  // Check if lawyer profile is approved
  if (profile?.role !== 'lawyer' || profile?.is_active === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Briefcase className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Lawyer Dashboard</CardTitle>
            <CardDescription>
              {profile?.role !== 'lawyer' 
                ? "Your account is not approved as a lawyer yet."
                : "Your lawyer account is currently inactive."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {profile?.role !== 'lawyer' ? (
              <div className="space-y-4">
                <AlertTriangle className="h-12 w-12 text-warning mx-auto" />
                <p className="text-muted-foreground">
                  Please wait for admin approval or contact support.
                </p>
                <Button onClick={handleSignOut} variant="outline">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Clock className="h-12 w-12 text-warning mx-auto" />
                <p className="text-muted-foreground">
                  Your account is currently inactive. Please contact support.
                </p>
                <Button onClick={handleSignOut} variant="outline">
                  Sign Out
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render verification form if needed
  if (showVerificationForm) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <Briefcase className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">LegalPro</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowVerificationForm(false)}>
                Back to Dashboard
              </Button>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <CompleteVerificationForm 
            onComplete={() => {
              setShowVerificationForm(false);
              refreshData();
            }}
          />
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
            <div className="flex items-center space-x-2">
              <Briefcase className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalPro</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageToggle />
              <span className="text-sm text-muted-foreground hidden sm:block">
                Welcome, {profile?.first_name || 'Lawyer'}
              </span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setActiveTab('requests')}>
                    <Receipt className="mr-2 h-4 w-4" />
                    Fee Requests
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowVerificationForm(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Verification Status Banner */}
        {profile?.verification_status !== 'verified' && (
          <Card className="mb-6 border-warning bg-warning/5">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-6 w-6 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold mb-2 text-warning">
                    Verification Required
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please complete your profile verification to access all features.
                  </p>
                  <Button 
                    onClick={() => setShowVerificationForm(true)}
                    size="sm"
                    variant="outline"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Complete Verification
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                  <p className="text-3xl font-bold">{stats.activeCases}</p>
                </div>
                <Briefcase className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Cases</p>
                  <p className="text-3xl font-bold">{stats.pendingPayouts}</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completed Cases</p>
                  <p className="text-3xl font-bold">{stats.activeCases}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                  <p className="text-3xl font-bold">${stats.monthlyEarnings.toFixed(0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incoming Call Notifications */}
        {showIncomingCall && incomingSession && (
          <div className="mb-6">
            <IncomingCallNotification
              session={incomingSession}
              onAccept={handleAcceptCall}
              onDecline={handleDeclineCall}
            />
          </div>
        )}

        {assignedCases.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Cases Assigned</h3>
              <p className="text-muted-foreground">
                New cases will appear here when they're assigned to you by the admin.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Main Dashboard Content */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-8">
                <TabsTrigger value="cases" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  Active Cases
                </TabsTrigger>
                <TabsTrigger value="requests" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Fee Requests
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cases" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column - Case Selection and Details */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Case Selection */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5" />
                            Select a Case
                          </span>
                          <Badge variant="outline">{assignedCases.length} Active</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a case to view details..." />
                          </SelectTrigger>
                          <SelectContent>
                            {assignedCases.map((case_) => (
                              <SelectItem key={case_.id} value={case_.id}>
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{case_.case_number}</span>
                                    <span className="text-sm text-muted-foreground">{case_.title}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getCaseUrgencyVariant(case_.urgency)} className="text-xs">
                                      {case_.urgency}
                                    </Badge>
                                    <Badge variant={getCaseStatusVariant(case_.status)} className="text-xs">
                                      {formatCaseStatus(case_.status)}
                                    </Badge>
                                  </div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>

                    {/* Selected Case Details */}
                    {selectedCase && (
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                {selectedCase.case_number}
                              </CardTitle>
                              <CardDescription>{selectedCase.title}</CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={getCaseUrgencyVariant(selectedCase.urgency)}>
                                {selectedCase.urgency}
                              </Badge>
                              <Badge variant={getCaseStatusVariant(selectedCase.status)}>
                                {formatCaseStatus(selectedCase.status)}
                              </Badge>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Client</p>
                              <p className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {selectedCase.client_name || 'Anonymous Client'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Created</p>
                              <p className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {formatDistanceToNow(new Date(selectedCase.created_at))} ago
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Category</p>
                              <p>{selectedCase.category}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Jurisdiction</p>
                              <p className="flex items-center gap-2">
                                <Globe className="h-4 w-4" />
                                Egypt
                              </p>
                            </div>
                          </div>

                          {selectedCase.title && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                              <p className="text-sm bg-muted p-3 rounded-md">{selectedCase.title}</p>
                            </div>
                          )}

                          <Separator />

                          <div className="flex flex-wrap gap-2">
                            <Button 
                              size="sm" 
                              onClick={() => setShowCaseDetails(true)}
                              className="flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              View Details
                            </Button>
                            
                            {!selectedCase.proposal && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => setShowCreateProposal(true)}
                                className="flex items-center gap-2"
                              >
                                <DollarSign className="h-4 w-4" />
                                Create Proposal
                              </Button>
                            )}
                          </div>

                          {/* Case Work Progress Component */}
                          <CaseWorkProgress caseData={selectedCase} />
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right Column - Communication */}
                  <div className="space-y-6">
                    <CommunicationInbox
                      cases={assignedCases}
                      userRole="lawyer"
                      lawyerAssigned={true}
                      chatNotificationCount={0}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="requests" className="space-y-6">
                <FeeRequestsManager activeCases={assignedCases} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* Lawyer QA Chatbot */}
      <LawyerQAChatbot isOpen={false} onToggle={() => {}} />

      {/* Case Details Dialog */}
      {showCaseDetails && selectedCase && (
        <CaseDetailsDialog
          caseId={selectedCase.id}
          isOpen={showCaseDetails}
          onClose={() => setShowCaseDetails(false)}
        />
      )}

      {/* Create Proposal Dialog */}
      {showCreateProposal && selectedCase && (
        <CreateProposalDialog
          open={showCreateProposal}
          onOpenChange={setShowCreateProposal}
          caseId={selectedCase.id}
          caseTitle={selectedCase.title}
          clientName={selectedCase.client_name || ''}
          existingProposal={selectedCase.proposal}
          onProposalSent={() => {
            refreshData();
            setShowCreateProposal(false);
          }}
        />
      )}
    </div>
  );
};

export default LawyerDashboard;