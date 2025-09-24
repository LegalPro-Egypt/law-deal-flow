import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTwilioSession, TwilioSession } from "@/hooks/useTwilioSession";
import { useLawyerChatNotifications } from "@/hooks/useLawyerChatNotifications";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationBadge } from "@/components/ui/notification-badge";
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
  Menu
} from "lucide-react";
import { LawyerQAChatbot } from "@/components/LawyerQAChatbot";
import { CompleteVerificationForm } from "@/components/CompleteVerificationForm";
import { CaseDetailsDialog } from "@/components/CaseDetailsDialog";
import { CreateProposalDialog } from "@/components/CreateProposalDialog";
import { CommunicationInbox } from "@/components/CommunicationInbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  proposal?: any;
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

  // Get the currently selected case or default to the first case
  const currentCase = cases.find(c => c.id === selectedCaseId) || cases[0];

  const { unreadCounts, getTotalUnreadCount } = useLawyerChatNotifications();

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
          // Only show as incoming call if lawyer didn't initiate it
          if (newSession.status === 'scheduled' && newSession.initiated_by !== user.id) {
            setIncomingCalls(prev => [...prev, newSession]);
            
            // Play notification sound or show system notification
            const fromText = !newSession.initiated_by
              ? 'client'
              : (newSession.initiated_by === newSession.client_id ? 'client' : 'lawyer');
            toast({
              title: 'Incoming Call',
              description: `${newSession.session_type} call from ${fromText}`,
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

      // Fetch existing scheduled communication sessions (only those not initiated by current lawyer)
      const { data: scheduledSessions, error: sessionsError } = await supabase
        .from('communication_sessions')
        .select('*')
        .eq('lawyer_id', user.id)
        .eq('status', 'scheduled')
        .neq('initiated_by', user.id); // Only show calls not initiated by this lawyer

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
      const token = await createAccessToken(session.case_id, session.session_type, session.id);
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
                <span className="text-xl font-bold">LegalPro</span>
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
                <span className="text-xl font-bold">LegalPro</span>
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
              <span className="text-xl font-bold">LegalPro</span>
            </Link>
            <div className={`flex items-center gap-4 ${isRTL() ? 'flex-row-reverse' : ''}`}>
              {cases.length > 0 && (
                <div className="flex items-center gap-2">
                   <Select value={selectedCaseId || cases[0]?.id} onValueChange={setSelectedCaseId}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue>
                        Cases
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {cases.map((caseItem) => (
                        <SelectItem key={caseItem.id} value={caseItem.id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {caseItem.case_number}
                            </Badge>
                            <span className="truncate">{caseItem.title}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <span className={`text-sm text-muted-foreground hidden sm:block ${isRTL() ? 'text-right' : ''}`}>
                {t('dashboard.welcome', { name: profile?.first_name || 'Lawyer' })}
              </span>
              
              {/* Header Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-background border shadow-lg z-50">
                  <DropdownMenuItem asChild>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm font-medium">Language</span>
                      <LanguageToggle />
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className={`h-4 w-4 ${isRTL() ? 'ml-2' : 'mr-2'}`} />
                    <span>{t('dashboard.signOut')}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="rtl-mobile-container mx-auto py-8 rtl-container">
        {/* Verification Status Banner */}
        {profile?.verification_status !== 'verified' && (
          <Card className="mb-6 border-warning bg-warning/5">
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
                  {profile?.verification_status === 'pending_complete' && (
                    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-medium text-primary">Approval Pending</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your verification documents have been submitted and are currently under review by our admin team. 
                        You will be notified via email once the review is complete.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Expected review time: 1-3 business days
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.activeCases')}</p>
                  <p className="text-3xl font-bold">{stats.activeCases}</p>
                </div>
                <FileText className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.pendingCases')}</p>
                  <p className="text-3xl font-bold">{stats.pendingCases}</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.completedCases')}</p>
                  <p className="text-3xl font-bold">{stats.completedCases}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{t('dashboard.stats.totalEarnings')}</p>
                  <p className="text-3xl font-bold">Coming Soon</p>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Incoming Call Notifications */}
        {incomingCalls.length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <PhoneCall className="h-5 w-5 text-primary" />
              Incoming Calls ({incomingCalls.length})
            </h2>
            {incomingCalls.map((call) => (
              <IncomingCallNotification
                key={call.id}
                session={call}
                onAccept={handleAcceptCall}
                onDecline={handleDeclineCall}
              />
            ))}
          </div>
        )}

        {/* Current Selected Case */}
        {cases.length === 0 ? (
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('dashboard.cases.noCases')}</h3>
              <p className="text-muted-foreground">
                New cases will appear here when they're assigned to you by the admin.
              </p>
            </CardContent>
          </Card>
        ) : currentCase ? (
          <Card className="bg-gradient-card shadow-card hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={getUrgencyVariant(currentCase.urgency)}>
                    {t(`dashboard.cases.urgency.${currentCase.urgency}`)} {isRTL() ? 'أولوية' : 'Priority'}
                  </Badge>
                </div>
                <div className={`text-xs text-muted-foreground flex-shrink-0 ${isRTL() ? 'text-left' : 'text-right'}`}>
                  <div>Created: {formatDate(currentCase.created_at)}</div>
                  <div>Updated: {formatDate(currentCase.updated_at)}</div>
                </div>
              </div>
              <CardTitle className="text-lg">{currentCase.title}</CardTitle>
              <CardDescription>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4" />
                  Client: {getClientNameForRole(currentCase.client_name, profile?.role)}
                </div>
                <div className="flex items-center gap-2 text-sm mt-1">
                  <FileText className="h-4 w-4" />
                  Category: {currentCase.category}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="flex gap-2 flex-wrap">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleViewDetails(currentCase.id)}
                  className="flex-shrink-0"
                >
                  {t('dashboard.cases.viewDetails')}
                </Button>
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 flex-shrink-0"
                  onClick={() => setSelectedCaseForProposal(currentCase)}
                >
                  <FileText className={`h-4 w-4 ${isRTL() ? 'ml-2' : 'mr-2'}`} />
                  {currentCase.proposal ? t('dashboard.cases.editProposal') : t('dashboard.cases.createProposal')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Communication Section */}
        <div className="mt-8">
          <CommunicationInbox
            cases={cases}
            userRole="lawyer"
            lawyerAssigned={true}
            chatNotificationCount={getTotalUnreadCount()}
          />
        </div>
      </div>

      {/* Lawyer QA Chatbot */}
      <LawyerQAChatbot 
        isOpen={chatbotOpen} 
        onToggle={() => setChatbotOpen(!chatbotOpen)} 
      />

      {/* Case Details Dialog */}
      <CaseDetailsDialog
        caseId={selectedCaseId}
        isOpen={caseDetailsOpen}
        onClose={() => setCaseDetailsOpen(false)}
      />

      {/* Create Proposal Dialog */}
      <CreateProposalDialog
        open={!!selectedCaseForProposal}
        onOpenChange={(open) => !open && setSelectedCaseForProposal(null)}
        caseId={selectedCaseForProposal?.id || ''}
        caseTitle={selectedCaseForProposal?.title || ''}
        clientName={selectedCaseForProposal?.client_name || ''}
        existingProposal={selectedCaseForProposal?.proposal}
        onProposalSent={() => {
          fetchDashboardData();
          setSelectedCaseForProposal(null);
        }}
      />

    </div>
  );
};

export default LawyerDashboard;