import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Settings
} from "lucide-react";
import { LawyerQAChatbot } from "@/components/LawyerQAChatbot";
import { CompleteVerificationForm } from "@/components/CompleteVerificationForm";

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
}

const LawyerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, loading: authLoading } = useAuth();
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

  useEffect(() => {
    if (!authLoading && user) {
      fetchDashboardData();
    }
  }, [user, authLoading]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch assigned cases
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select('*')
        .eq('assigned_lawyer_id', user.id)
        .order('created_at', { ascending: false });

      if (casesError) throw casesError;

      setCases(casesData || []);

      // Calculate stats
      const activeCases = casesData?.filter(c => c.status === 'active').length || 0;
      const completedCases = casesData?.filter(c => c.status === 'completed').length || 0;
      const pendingCases = casesData?.filter(c => c.status === 'pending').length || 0;

      setStats({
        activeCases,
        completedCases,
        pendingCases,
        totalEarnings: 0 // TODO: Calculate earnings when payment system is implemented
      });

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data. Please try refreshing the page.",
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
        title: "Error",
        description: "Failed to sign out: " + error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'completed': return 'bg-primary';
      case 'pending': return 'bg-warning';
      default: return 'bg-muted';
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
    return new Date(dateString).toLocaleDateString();
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
                <Badge variant="secondary" className="ml-2">Lawyer Portal</Badge>
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

  const getVerificationTitle = (status: string | null | undefined) => {
    switch (status) {
      case 'pending_basic': return "Complete Your Verification";
      case 'pending_complete': return "Verification Under Review";
      case 'verified': return "Fully Verified";
      default: return "";
    }
  };

  const getVerificationDescription = (status: string | null | undefined) => {
    switch (status) {
      case 'pending_basic': 
        return "To start receiving client cases, you need to complete the verification process with additional professional details.";
      case 'pending_complete': 
        return "Thank you for completing your verification! Our admin team is reviewing your submission and will notify you once approved.";
      case 'verified': 
        return "Your profile is fully verified. You can now receive client cases and access all lawyer features.";
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
                <Badge variant="secondary" className="ml-2">Lawyer Portal</Badge>
              </Link>
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
                ? "You don't have lawyer permissions."
                : "Your lawyer account is pending approval."
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {profile?.role !== 'lawyer' ? (
              <div className="space-y-4">
                <AlertCircle className="h-12 w-12 text-warning mx-auto" />
                <p className="text-muted-foreground">
                  This dashboard is only available for approved lawyers. Please contact admin if this is an error.
                </p>
                <Button onClick={handleSignOut} variant="outline">
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Clock className="h-12 w-12 text-warning mx-auto" />
                <p className="text-muted-foreground">
                  Your lawyer profile is currently under review. You'll receive an email notification once it's approved.
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/?force=true" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalPro</span>
              <Badge variant="secondary" className="ml-2">Lawyer Portal</Badge>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {profile?.first_name || 'Lawyer'}
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
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
                        <Settings className="h-4 w-4 mr-2" />
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
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Pending Cases</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Completed Cases</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                  <p className="text-3xl font-bold">Coming Soon</p>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cases Section */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Cases
            </CardTitle>
            <CardDescription>
              Cases assigned to you for legal assistance
            </CardDescription>
          </CardHeader>
          <CardContent>
            {cases.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No cases assigned yet</h3>
                <p className="text-muted-foreground">
                  New cases will appear here when they're assigned to you by the admin.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {cases.map((caseItem) => (
                  <div key={caseItem.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline">{caseItem.case_number}</Badge>
                          <Badge className={getStatusColor(caseItem.status)}>
                            {caseItem.status}
                          </Badge>
                          <Badge className={getUrgencyColor(caseItem.urgency)}>
                            {caseItem.urgency} Priority
                          </Badge>
                        </div>
                        <h3 className="font-semibold">{caseItem.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          Client: {caseItem.client_name} • {caseItem.category}
                        </p>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Created: {formatDate(caseItem.created_at)}</p>
                        <p>Updated: {formatDate(caseItem.updated_at)}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                      <Button size="sm">
                        Send Message
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lawyer QA Chatbot */}
      <LawyerQAChatbot 
        isOpen={chatbotOpen} 
        onToggle={() => setChatbotOpen(!chatbotOpen)} 
      />
    </div>
  );
};

export default LawyerDashboard;