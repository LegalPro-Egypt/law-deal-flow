import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTwilioSession, TwilioSession } from "@/hooks/useTwilioSession";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Scale, 
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  Settings,
  PhoneCall,
  BarChart3,
  Phone,
  Video,
  MessageCircle,
  History
} from "lucide-react";
import { LawyerQAChatbot } from "@/components/LawyerQAChatbot";
import { CompleteVerificationForm } from "@/components/CompleteVerificationForm";
import { CaseDetailsDialog } from "@/components/CaseDetailsDialog";
import { CreateProposalDialog } from "@/components/CreateProposalDialog";
import { CommunicationInbox } from "@/components/CommunicationInbox";
import { getClientNameForRole } from "@/utils/clientPrivacy";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageToggle } from "@/components/LanguageToggle";
import { VerificationStatusBadge } from "@/components/VerificationStatusBadge";
import { IncomingCallNotification } from "@/components/IncomingCallNotification";

interface LawyerStats {
  activeCases: number;
  completedCases: number;
  pendingCases: number;
  totalEarnings: number;
}

interface Case {
  id: string;
  case_number: string;
  title: string;
  category: string;
  urgency: string;
  status: string;
  client_name: string;
  client_email: string;
  created_at: string;
  updated_at: string;
  consultation_paid: boolean;
  payment_status: string;
}

const LawyerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [stats, setStats] = useState<LawyerStats>({
    activeCases: 0,
    completedCases: 0,
    pendingCases: 0,
    totalEarnings: 0
  });
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [showVerificationForm, setShowVerificationForm] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [caseDetailsOpen, setCaseDetailsOpen] = useState(false);
  const [selectedCaseForProposal, setSelectedCaseForProposal] = useState<Case | null>(null);
  const [incomingCalls, setIncomingCalls] = useState<TwilioSession[]>([]);
  const { sessions, createAccessToken } = useTwilioSession();

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  // Listen for incoming communication sessions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('incoming-calls')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'communication_sessions',
          filter: `lawyer_id=eq.${user.id}`
        },
        (payload) => {
          const newSession = payload.new as TwilioSession;
          if (newSession.status === 'scheduled') {
            setIncomingCalls(prev => [...prev, newSession]);
            
            // Play notification sound or show system notification
            toast({
              title: 'Incoming Call',
              description: `${newSession.session_type} call from client`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'communication_sessions',
          filter: `lawyer_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Communication session updated:', payload);
          const updatedSession = payload.new as TwilioSession;
          console.log('Updated session status:', updatedSession.status, 'Session ID:', updatedSession.id);
          if (updatedSession.status !== 'scheduled') {
            console.log('Removing session from incoming calls:', updatedSession.id);
            setIncomingCalls(prev => {
              const filtered = prev.filter(call => call.id !== updatedSession.id);
              console.log('Remaining incoming calls:', filtered.length);
              return filtered;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch assigned cases with payment information
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('*, consultation_paid, payment_status')
        .eq('assigned_lawyer_id', user.id)
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      setCases(casesData || []);

      // Fetch existing scheduled communication sessions
      const { data: scheduledSessions, error: sessionsError } = await supabase
        .from('communication_sessions')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('status', 'scheduled');

      if (sessionsError) {
        console.error('Error fetching scheduled sessions:', sessionsError);
      } else {
        setIncomingCalls((scheduledSessions as TwilioSession[]) || []);
      }

      // Calculate stats with proper status mapping
      const pendingCases = casesData?.filter(c => 
        c.status === 'lawyer_assigned' || c.status === 'proposal_sent'
      ).length || 0;
      
      const activeCases = casesData?.filter(c => 
        c.status === 'accepted' || c.status === 'active' || c.status === 'in_progress'
      ).length || 0;
      
      const completedCases = casesData?.filter(c => 
        c.status === 'completed' || c.status === 'closed'
      ).length || 0;

      setStats({
        activeCases,
        completedCases,
        pendingCases,
        totalEarnings: 0 // TODO: Calculate earnings when payment system is implemented
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: t('common.error'),
        description: t('dashboard.error'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
        title: t('common.error'),
        description: "Failed to sign out: " + error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active': 
      case 'in_progress': 
        return 'default';
      case 'completed': 
        return 'secondary';
      case 'proposal_accepted':
        return 'default';
      case 'proposal_sent':
        return 'secondary';
      case 'lawyer_assigned':
        return 'outline';
      case 'pending': 
        return 'outline';
      default: 
        return 'outline';
    }
  };

  const getUrgencyVariant = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'default';
      default: return 'outline';
    }
  };

  const handleViewDetails = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCaseDetailsOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const handleAcceptCall = async (session: TwilioSession) => {
    try {
      // Create access token and redirect to communication interface
      const token = await createAccessToken(session.case_id, session.session_type);
      if (token) {
        // Remove from incoming calls
        setIncomingCalls(prev => prev.filter(call => call.id !== session.id));
        
        // Navigate to communication interface or open it in a dialog
        // For now, we'll show a success message
        toast({
          title: 'Call Accepted',
          description: 'Joining the communication session...',
        });
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      toast({
        title: 'Error',
        description: 'Failed to join the communication session',
        variant: 'destructive',
      });
    }
  };

  const handleDeclineCall = (session: TwilioSession) => {
    setIncomingCalls(prev => prev.filter(call => call.id !== session.id));
    toast({
      title: 'Call Declined',
      description: 'Communication request has been declined',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/?force=true" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <Scale className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">LegalConnect</span>
                <Badge variant="secondary" className="ml-2">Lawyer Portal</Badge>
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label={t('dashboard.signOut')}>
                <LogOut className={`h-4 w-4 ${isRTL() ? '' : 'mr-2'}`} />
                {!isRTL() && <span>{t('dashboard.signOut')}</span>}
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

  const getVerificationTitle = (status: string | null | undefined) => {
    switch (status) {
      case 'pending_basic': return t('dashboard.verification.pendingBasic');
      case 'pending_complete': return t('dashboard.verification.pendingComplete');
      case 'verified': return t('dashboard.verification.verified');
      default: return "";
    }
  };

  const getVerificationDescription = (status: string | null | undefined) => {
    switch (status) {
      case 'pending_basic': 
        return t('dashboard.verification.description');
      case 'pending_complete': 
        return t('dashboard.verification.waitingReview');
      case 'verified': 
        return t('dashboard.verification.approved');
      default: return "";
    }
  };

  // Render verification form if needed
  if (showVerificationForm) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/?force=true" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <Scale className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">LegalConnect</span>
                <Badge variant="secondary" className="ml-2">Lawyer Portal</Badge>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => setShowVerificationForm(false)}>
                {isRTL() ? 'العودة إلى لوحة التحكم' : 'Back to Dashboard'}
              </Button>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8">
          <CompleteVerificationForm 
            onComplete={() => {
              setShowVerificationForm(false);
              fetchDashboardData(); // Refresh profile data
            }}
          />
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
              <Scale className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Lawyer Dashboard</CardTitle>
            <CardDescription>
              {profile?.role !== 'lawyer' 
                ? t('dashboard.verification.notApproved')
                : t('dashboard.verification.inactive')
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {profile?.role !== 'lawyer' ? (
              <div className="space-y-4">
                <AlertCircle className="h-12 w-12 text-warning mx-auto" />
                <p className="text-muted-foreground">
                  {t('dashboard.verification.notApproved')}
                </p>
                <Button onClick={handleSignOut} variant="outline">
                  {t('dashboard.signOut')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Clock className="h-12 w-12 text-warning mx-auto" />
                <p className="text-muted-foreground">
                  {t('dashboard.verification.inactive')}
                </p>
                <Button onClick={handleSignOut} variant="outline">
                  {t('dashboard.signOut')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background rtl-safe-container ${isRTL() ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="rtl-safe-container mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`flex items-center justify-between h-16 ${isRTL() ? 'flex-row-reverse' : ''}`}>
            <Link to="/?force=true" className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${isRTL() ? 'flex-row-reverse' : ''}`}>
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalConnect</span>
              <Badge variant="secondary" className={`${isRTL() ? 'mr-2' : 'ml-2'}`}>Lawyer Portal</Badge>
            </Link>
            <div className={`flex items-center gap-4 ${isRTL() ? 'flex-row-reverse' : ''}`}>
              <LanguageToggle />
              <span className={`text-sm text-muted-foreground hidden sm:block ${isRTL() ? 'text-right' : ''}`}>
                {t('dashboard.welcome', { name: profile?.first_name || 'Lawyer' })}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label={t('dashboard.signOut')}>
                <LogOut className={`h-4 w-4 ${isRTL() ? 'ml-2' : 'mr-2'}`} />
                <span>{t('dashboard.signOut')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="rtl-mobile-container mx-auto py-8 rtl-container max-w-7xl">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Cases
              {cases.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {cases.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="communication" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              Communication
            </TabsTrigger>
            <TabsTrigger value="calls" className="flex items-center gap-2">
              <PhoneCall className="h-4 w-4" />
              Incoming Calls
              {incomingCalls.length > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {incomingCalls.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Verification Status Banner */}
            {profile?.verification_status !== 'verified' && (
              <Card className="border-warning bg-warning/5">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {profile?.verification_status === 'pending_basic' ? (
                        <AlertTriangle className="h-6 w-6 text-warning" />
                      ) : profile?.verification_status === 'pending_complete' ? (
                        <Clock className="h-6 w-6 text-primary" />
                      ) : (
                        <ShieldCheck className="h-6 w-6 text-success" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2 text-primary">
                        {getVerificationTitle(profile?.verification_status)}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {getVerificationDescription(profile?.verification_status)}
                      </p>
                      {profile?.verification_status === 'pending_basic' && (
                        <div className="flex gap-2">
                            <Button 
                              onClick={() => setShowVerificationForm(true)}
                              size="sm"
                              className="bg-primary hover:bg-primary/90"
                            >
                              <Settings className={`h-4 w-4 ${isRTL() ? 'ml-2' : 'mr-2'}`} />
                              Complete Verification
                            </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Statistics Cards */}
            <div className="grid md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg dark:bg-blue-900/20">
                      <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.activeCases')}</p>
                      <p className="text-2xl font-bold">{stats.activeCases}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-lg dark:bg-orange-900/20">
                      <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.pendingCases')}</p>
                      <p className="text-2xl font-bold">{stats.pendingCases}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-lg dark:bg-green-900/20">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.completedCases')}</p>
                      <p className="text-2xl font-bold">{stats.completedCases}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg dark:bg-purple-900/20">
                      <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.totalEarnings')}</p>
                      <p className="text-2xl font-bold">${stats.totalEarnings}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => setChatbotOpen(true)}
                  >
                    <MessageSquare className="h-6 w-6" />
                    <span>Open AI Assistant</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center gap-2"
                    onClick={() => setShowVerificationForm(true)}
                    disabled={profile?.verification_status === 'verified'}
                  >
                    <ShieldCheck className="h-6 w-6" />
                    <span>Update Profile</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto p-4 flex flex-col items-center gap-2"
                  >
                    <History className="h-6 w-6" />
                    <span>View History</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Assigned Cases
                    </CardTitle>
                    <CardDescription>
                      Manage your assigned legal cases
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {cases.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No cases assigned</h3>
                    <p className="text-muted-foreground">You don't have any assigned cases yet. New cases will appear here when assigned by the admin.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cases.map((case_) => (
                      <Card key={case_.id} className="border border-muted">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-3">
                                <h3 className="font-semibold text-foreground truncate">
                                  {case_.case_number}: {case_.title}
                                </h3>
                                <Badge variant={getStatusVariant(case_.status)}>
                                  {case_.status}
                                </Badge>
                                <Badge variant={getUrgencyVariant(case_.urgency)}>
                                  {case_.urgency}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  <span>Client: {getClientNameForRole(case_.client_name, 'lawyer')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  <span>Category: {case_.category}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  <span>Created: {formatDate(case_.created_at)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <MessageSquare className="h-4 w-4" />
                                  <span>Updated: {formatDate(case_.updated_at)}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(case_.id)}
                              >
                                View Details
                              </Button>
                              {(case_.status === 'lawyer_assigned' || case_.status === 'accepted') && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => setSelectedCaseForProposal(case_)}
                                >
                                  Create Proposal
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Communication Tab */}
          <TabsContent value="communication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Communication Hub
                </CardTitle>
                <CardDescription>
                  Manage client communications for all cases
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {cases.map((case_) => (
                    <Card key={case_.id} className="border border-muted">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{case_.case_number}: {case_.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              Client: {getClientNameForRole(case_.client_name, 'lawyer')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={getStatusVariant(case_.status)}>
                              {case_.status}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CommunicationInbox 
                          caseId={case_.id}
                          caseTitle={case_.title}
                          caseStatus={case_.status}
                          consultationPaid={case_.consultation_paid}
                          paymentStatus={case_.payment_status}
                          userRole="lawyer"
                        />
                      </CardContent>
                    </Card>
                  ))}
                  
                  {cases.length === 0 && (
                    <div className="text-center py-12">
                      <MessageCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No communication available</h3>
                      <p className="text-muted-foreground">Communication options will appear here when you have assigned cases.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incoming Calls Tab */}
          <TabsContent value="calls" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5" />
                  Incoming Calls
                </CardTitle>
                <CardDescription>
                  Manage incoming communication requests from clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                {incomingCalls.length > 0 ? (
                  <div className="space-y-4">
                    {incomingCalls.map((call) => (
                      <IncomingCallNotification
                        key={call.id}
                        session={call}
                        onAccept={handleAcceptCall}
                        onDecline={handleDeclineCall}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <PhoneCall className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No incoming calls</h3>
                    <p className="text-muted-foreground">Incoming calls from clients will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        {chatbotOpen && (
          <LawyerQAChatbot 
            isOpen={chatbotOpen}
            onToggle={() => setChatbotOpen(false)}
          />
        )}

        {caseDetailsOpen && (
          <CaseDetailsDialog
            caseId={selectedCaseId}
            isOpen={caseDetailsOpen}
            onClose={() => setCaseDetailsOpen(false)}
          />
        )}

        {selectedCaseForProposal && (
          <CreateProposalDialog
            open={!!selectedCaseForProposal}
            onOpenChange={(open) => !open && setSelectedCaseForProposal(null)}
            caseId={selectedCaseForProposal.id}
            caseTitle={selectedCaseForProposal.title}
            clientName={selectedCaseForProposal.client_name}
            onProposalSent={() => {
              setSelectedCaseForProposal(null);
              fetchDashboardData(); // Refresh data after proposal is sent
            }}
          />
        )}
      </div>
    </div>
  );
};

export default LawyerDashboard;