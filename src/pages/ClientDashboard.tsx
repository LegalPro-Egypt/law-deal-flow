import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatCaseStatus } from "@/utils/caseUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CallManager } from "@/components/calls/CallManager";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Scale, 
  User,
  MessageSquare, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Download,
  Upload,
  Send,
  ArrowRight,
  Mail,
  Receipt,
  Plus,
  AlignJustify,
  LogOut,
  ChevronDown,
  ChevronRight,
  UserCircle,
  Bot,
  HelpCircle,
  Calendar as CalendarIcon,
  Pencil,
  Check,
  X,
  LayoutGrid,
  LayoutList,
  Eye,
  PenTool,
  CreditCard
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from 'jspdf';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientData } from "@/hooks/useClientData";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentUpload from "@/components/DocumentUpload";
import CaseSelector from "@/components/CaseSelector";
import { CommunicationInbox } from "@/components/CommunicationInbox";
import { NotificationsInbox } from "@/components/NotificationsInbox";
import { CaseWorkProgress } from "@/components/CaseWorkProgress";
import { CaseTimeline } from "@/components/CaseTimeline";
import { CaseCalendar } from "@/components/CaseCalendar";
import { NotificationMenu } from "@/components/NotificationMenu";
import { useNotifications } from "@/hooks/useNotifications";
import { useChatNotifications } from "@/hooks/useChatNotifications";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { downloadPDF, getUserFriendlyDownloadMessage } from "@/utils/pdfDownload";
import { DocumentThumbnail } from "@/components/DocumentThumbnail";
import { DocumentPreview } from "@/components/DocumentPreview";
import { ContractReviewDialog } from "@/components/ContractReviewDialog";
import { useContracts } from "@/hooks/useContracts";
import { useLanguage } from "@/hooks/useLanguage";
import { ProposalReviewDialog } from "@/components/ProposalReviewDialog";

interface ClientDashboardProps {
  viewAsUserId?: string;
}

const ClientDashboard = ({ viewAsUserId }: ClientDashboardProps = {}) => {
  const [newMessage, setNewMessage] = useState("");
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [intakeConversationOpen, setIntakeConversationOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocName, setEditingDocName] = useState<string>("");
  const [documentViewMode, setDocumentViewMode] = useState<'list' | 'grid'>(() => {
    return (localStorage.getItem('documentsViewMode') as 'list' | 'grid') || 'list';
  });
  const [previewDocument, setPreviewDocument] = useState<{
    file_name: string;
    file_type: string;
    file_url: string;
  } | null>(null);
  const [collapsedCards, setCollapsedCards] = useState({
    timeline: true,
    progress: true,
    personal: true,
    intake: true,
    documents: true,
    communication: true,
    calendar: true
  });
  const { signOut, user, role } = useAuth();
  const navigate = useNavigate();
  const effectiveUserId = viewAsUserId || user?.id;
  
  // When viewing as another user, use custom data fetching
  // Otherwise use the standard hook
  const clientData = useClientData(effectiveUserId);
  const { 
    cases, 
    activeCase, 
    messages, 
    documents, 
    loading,
    fetchingCases,
    setActiveCase, 
    sendMessage,
    renameDocument,
    refreshData
  } = clientData;
  
  const { unreadCount, proposals, proposalsWithCases, needsPayment } = useNotifications();
  const { totalUnreadCount } = useChatNotifications();
  const { contracts, isLoading: contractsLoading } = useContracts(activeCase?.id, effectiveUserId);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [showContractReview, setShowContractReview] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [showProposalReview, setShowProposalReview] = useState(false);
  const { currentLanguage } = useLanguage();


  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeCase) return;

    // Get conversation ID for this case
    const conversationId = `conv_${activeCase.id}`;
    await sendMessage(newMessage, conversationId);
    setNewMessage("");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const toggleViewMode = () => {
    const newMode = documentViewMode === 'list' ? 'grid' : 'list';
    setDocumentViewMode(newMode);
    localStorage.setItem('documentsViewMode', newMode);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'in_progress':
        return 'bg-accent';
      case 'completed':
        return 'bg-success';
      case 'intake':
        return 'bg-info';
      case 'submitted':
        return 'bg-primary';
      case 'lawyer_assigned':
        return 'bg-accent';
      default:
        return 'bg-muted';
    }
  };

  // Compute completion status from actual data
  const getStepCompletion = () => {
    if (!activeCase) return { step1: false, step2: false, step3: false, allComplete: false, isSubmittedCase: false };
    
    // Check if case is already submitted or beyond intake phase
    const isSubmittedCase = activeCase.status !== 'intake' && activeCase.status !== 'draft';
    
    // If case is already submitted, don't show setup steps
    if (isSubmittedCase) {
      return { step1: true, step2: true, step3: true, allComplete: true, isSubmittedCase: true };
    }
    
    // Step 1: Case data exists (AI summary)
    const step1Complete = !!(activeCase.ai_summary);
    
    // Step 2: Personal details are filled
    const step2Complete = !!(activeCase.client_name && activeCase.client_email && activeCase.client_phone);
    
    // Step 3: All required documents are uploaded
    const requiredCategories = ['identity', 'case']; // Based on DocumentUpload component
    const uploadedCategories = new Set(
      documents
        .filter(doc => doc.document_category)
        .map(doc => doc.document_category)
    );
    const step3Complete = requiredCategories.every(cat => uploadedCategories.has(cat));
    
    const allComplete = step1Complete && step2Complete && step3Complete;
    
    return { step1: step1Complete, step2: step2Complete, step3: step3Complete, allComplete, isSubmittedCase: false };
  };

  const stepCompletion = getStepCompletion();

  const handleDownloadCaseSummary = () => {
    if (!activeCase) return;

    try {
      const pdf = new jsPDF();
      
      // Title
      pdf.setFontSize(20);
      pdf.text('Case Summary', 20, 20);
      
      // Case Information
      pdf.setFontSize(12);
      pdf.text(`Case Number: ${activeCase.case_number}`, 20, 40);
      pdf.text(`Title: ${activeCase.title}`, 20, 50);
      pdf.text(`Category: ${activeCase.category}`, 20, 60);
      pdf.text(`Status: ${formatCaseStatus(activeCase.status, activeCase.consultation_paid, activeCase.payment_status)}`, 20, 70);
      pdf.text(`Created: ${formatDate(activeCase.created_at)}`, 20, 80);
      
      // Client Information
      if (activeCase.client_name || activeCase.client_email || activeCase.client_phone) {
        pdf.setFontSize(14);
        pdf.text('Client Information', 20, 100);
        pdf.setFontSize(12);
        let yPos = 110;
        
        if (activeCase.client_name) {
          pdf.text(`Name: ${activeCase.client_name}`, 20, yPos);
          yPos += 10;
        }
        if (activeCase.client_email) {
          pdf.text(`Email: ${activeCase.client_email}`, 20, yPos);
          yPos += 10;
        }
        if (activeCase.client_phone) {
          pdf.text(`Phone: ${activeCase.client_phone}`, 20, yPos);
          yPos += 10;
        }
      }
      
      // AI Summary
      if (activeCase.ai_summary) {
        pdf.setFontSize(14);
        pdf.text('Case Summary', 20, 140);
        pdf.setFontSize(10);
        const summaryLines = pdf.splitTextToSize(activeCase.ai_summary, 170);
        pdf.text(summaryLines, 20, 150);
      }
      
      // Documents Summary
      if (documents.length > 0) {
        pdf.addPage();
        pdf.setFontSize(14);
        pdf.text('Documents', 20, 20);
        pdf.setFontSize(10);
        let yPos = 30;
        
        documents.forEach((doc, index) => {
          const displayName = doc.display_name || doc.file_name.replace(/^\d+_/, '');
          pdf.text(`${index + 1}. ${displayName} (${doc.file_type})`, 20, yPos);
          pdf.text(`   Uploaded: ${formatDate(doc.created_at)}`, 20, yPos + 5);
          yPos += 15;
        });
      }
      
      downloadPDF(pdf, `Case_Summary_${activeCase.case_number}.pdf`);
      
      toast({
        title: "Case Summary Downloaded",
        description: getUserFriendlyDownloadMessage(),
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate case summary. Please try again.",
        variant: "destructive",
      });
    }
  };


  const handleReviewCase = async () => {
    if (!activeCase) return;
    
    const completion = getStepCompletion();
    if (!completion.allComplete) {
      const missingSteps = [];
      if (!completion.step1) missingSteps.push("complete the AI chat");
      if (!completion.step2) missingSteps.push("provide personal details");
      if (!completion.step3) missingSteps.push("upload required documents");
      
      toast({
        title: "Cannot Proceed to Review",
        description: `Please ${missingSteps.join(", ")} before continuing.`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('cases')
        .update({ step: 4 })
        .eq('id', activeCase.id);

      if (error) throw error;

      toast({
        title: "Proceeding to Review",
        description: "Your case is ready for review and submission.",
      });

      // Navigate to intake with the specific case ID for review
      navigate(`/intake?case=${activeCase.id}`);
    } catch (error) {
      console.error('Error updating case step:', error);
      toast({
        title: "Error",
        description: "Failed to proceed to review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleCard = (cardName: keyof typeof collapsedCards) => {
    setCollapsedCards(prev => ({
      ...prev,
      [cardName]: !prev[cardName]
    }));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Signed out", description: "You have been logged out." });
      // Use a query parameter to bypass auto-redirect on Landing page
      navigate('/?force=true');
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to sign out.", variant: "destructive" });
    }
  };

  // Twilio code removed

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link to="/?force=true" className="flex items-center space-x-2 sm:space-x-4 hover:opacity-80 transition-opacity">
                  <Scale className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <h1 className="text-lg sm:text-xl font-bold">LegalPro</h1>
                    <Badge variant="secondary" className="text-xs hidden sm:block">Client Portal</Badge>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!activeCase) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex items-center justify-between h-14 sm:h-16">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link to="/?force=true" className="flex items-center space-x-2 sm:space-x-4 hover:opacity-80 transition-opacity">
                  <Scale className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <h1 className="text-lg sm:text-xl font-bold">LegalPro</h1>
                    <Badge variant="secondary" className="text-xs hidden sm:block">Client Portal</Badge>
                  </div>
                </Link>
              </div>
              <div className="flex items-center space-x-1 sm:space-x-2">
                <Button asChild className="h-9 sm:h-10" size="sm">
                  <Link to="/intake?new=1">
                    <Plus className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Start New Case</span>
                  </Link>
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut} className="h-9 w-9 sm:h-10 sm:w-auto sm:px-4">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline sm:ml-2">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 text-center">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Active Cases</h2>
              <p className="text-muted-foreground mb-4">
                You don't have any active legal cases yet.
              </p>
              <div className="space-y-2">
                <Button asChild>
                  <Link to="/intake?new=1">Start New Case</Link>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={refreshData}
                  disabled={fetchingCases}
                  className="w-full"
                >
                  {fetchingCases ? "Refreshing..." : "Refresh Cases"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <CallManager />

      {/* Admin View Banner */}
      {viewAsUserId && (
        <div className="bg-blue-600 text-white py-2 px-4 text-center text-sm font-medium">
          🔍 Admin View - Viewing client's dashboard (Data is read-only in this view)
        </div>
      )}

      {/* Header */}
      <header className="backdrop-blur-md bg-background/80 border-b border-border/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo and Title */}
            <Link to="/?force=true" className="flex items-center space-x-2 sm:space-x-4 hover:opacity-80 transition-opacity">
              <Scale className="h-8 w-8 text-primary" />
              <div className="flex items-center space-x-1 sm:space-x-2">
                <h1 className="text-xl font-bold font-futura text-foreground">
                  LegalPro
                </h1>
                <Badge variant="secondary" className="text-xs hidden sm:block">
                  Client Portal
                </Badge>
              </div>
            </Link>

            {/* Case Selector with Details */}
            <div className="flex-1 max-w-[160px] sm:max-w-sm mx-2 sm:mx-4">
              <CaseSelector 
                cases={cases}
                activeCase={activeCase}
                onCaseSelect={(caseId) => {
                  const selectedCase = cases.find(c => c.id === caseId);
                  if (selectedCase) setActiveCase(selectedCase);
                }}
                showCaseDetails={true}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
              <NotificationMenu />
              <Button
                asChild
                className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 sm:h-10"
                size="sm"
              >
                <Link to="/intake?new=1">
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Start New Case</span>
                </Link>
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-9 sm:h-10 sm:w-auto sm:px-4">
                    <AlignJustify className="h-4 w-4" />
                    <span className="hidden sm:inline sm:ml-2">More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border border-border shadow-lg z-50 w-48">
                  <DropdownMenuItem onClick={() => setIntakeConversationOpen(true)}>
                    <Bot className="h-4 w-4 mr-2" />
                    AI Intake Conversation
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/help')}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Contact Support
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleDownloadCaseSummary}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Summary
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPaymentHistoryOpen(true)}>
                    <Receipt className="h-4 w-4 mr-2" />
                    Payment History
                  </DropdownMenuItem>
                  {activeCase.status === 'proposal_accepted' && !activeCase.consultation_paid && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => {
                          navigate('/payment', {
                            state: {
                              paymentData: {
                                caseId: activeCase.id,
                                consultationFee: activeCase.consultation_fee || 0,
                                remainingFee: activeCase.remaining_fee || 0,
                                totalFee: activeCase.total_fee || 0,
                                lawyerName: 'Your Lawyer',
                                caseTitle: activeCase.title,
                                type: 'consultation'
                              }
                            }
                          });
                        }}
                        className="text-primary font-medium"
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Complete Payment
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive hover:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-4">
        {/* Payment Required Card */}
        {activeCase.status === 'proposal_accepted' && !activeCase.consultation_paid && (
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-background border-2 border-primary shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <AlertCircle className="h-6 w-6 mr-2" />
                Payment Required
              </CardTitle>
              <CardDescription>
                Complete the payment to proceed to your consultation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-background/50 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Consultation Fee</div>
                    <div className="text-2xl font-bold text-primary">
                      ${activeCase.consultation_fee?.toLocaleString() || '0'}
                    </div>
                  </div>
                  <div className="p-4 bg-background/50 rounded-lg border">
                    <div className="text-sm text-muted-foreground mb-1">Remaining Fee</div>
                    <div className="text-2xl font-bold">
                      ${activeCase.remaining_fee?.toLocaleString() || '0'}
                    </div>
                  </div>
                  <div className="p-4 bg-primary/10 rounded-lg border-2 border-primary">
                    <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                    <div className="text-2xl font-bold text-primary">
                      ${activeCase.total_fee?.toLocaleString() || '0'}
                    </div>
                  </div>
                </div>
                
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto"
                  onClick={() => {
                    navigate('/payment', {
                      state: {
                        paymentData: {
                          caseId: activeCase.id,
                          consultationFee: activeCase.consultation_fee || 0,
                          remainingFee: activeCase.remaining_fee || 0,
                          totalFee: activeCase.total_fee || 0,
                          lawyerName: 'Your Lawyer',
                          caseTitle: activeCase.title,
                          type: 'consultation'
                        }
                      }
                    });
                  }}
                >
                  <Receipt className="h-5 w-5 mr-2" />
                  Proceed to Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Case Timeline Card */}
        <Collapsible open={!collapsedCards.timeline} onOpenChange={() => toggleCard('timeline')}>
          <Card className="bg-gradient-card shadow-card border-2 border-primary/20 hover:border-primary/40 transition-colors">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Clock className="h-5 w-5 mr-2" />
                      Case Timeline
                    </CardTitle>
                    {collapsedCards.timeline && (
                      <CardDescription>
                        Current Status: {formatCaseStatus(activeCase.status, activeCase.consultation_paid, activeCase.payment_status)}
                      </CardDescription>
                    )}
                  </div>
                  {collapsedCards.timeline ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-success" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Case Created</span>
                        <span className="text-sm text-muted-foreground">{formatDate(activeCase.created_at)}</span>
                      </div>
                    </div>
                    <CheckCircle className="h-4 w-4 text-success" />
                  </div>
                  
                  {activeCase.assigned_lawyer_id && (
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 rounded-full bg-success" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Case Approved</span>
                          <span className="text-sm text-muted-foreground">{formatDate(activeCase.updated_at)}</span>
                        </div>
                      </div>
                      <CheckCircle className="h-4 w-4 text-success" />
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(activeCase.status)}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          Current Status: {formatCaseStatus(activeCase.status, activeCase.consultation_paid, activeCase.payment_status)}
                        </span>
                        <span className="text-sm text-muted-foreground">{formatDate(activeCase.updated_at)}</span>
                      </div>
                    </div>
                    <Clock className="h-4 w-4 text-accent" />
                  </div>
                  
                  {/* Case Work Progress */}
                  {(activeCase.status === 'work_in_progress' || activeCase.status === 'pending_client_confirmation' || activeCase.status === 'completed') && (
                    <div className="mt-4">
                      <CaseWorkProgress caseData={{
                        id: activeCase.id,
                        case_number: activeCase.case_number,
                        status: activeCase.status,
                        assigned_lawyer_id: activeCase.assigned_lawyer_id
                      }} />
                    </div>
                  )}
                  
                  {/* Case Milestones */}
                  {activeCase.assigned_lawyer_id && (
                    <div className="mt-4">
                      <CaseTimeline caseId={activeCase.id} caseData={activeCase} userRole={role} />
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Case Setup Progress Card */}
        {!stepCompletion.allComplete && (
          <Collapsible open={!collapsedCards.progress} onOpenChange={() => toggleCard('progress')}>
            <Card className="bg-gradient-card shadow-card">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Case Setup Progress</CardTitle>
                      <CardDescription>
                        Complete these steps to proceed with your case
                      </CardDescription>
                    </div>
                    {collapsedCards.progress ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      {stepCompletion.step1 ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className={stepCompletion.step1 ? "text-success font-medium" : ""}>
                        AI Chat Complete
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {stepCompletion.step2 ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className={stepCompletion.step2 ? "text-success font-medium" : ""}>
                        Personal Details Provided
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {stepCompletion.step3 ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                      )}
                      <span className={stepCompletion.step3 ? "text-success font-medium" : ""}>
                        Required Documents Uploaded
                      </span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    {stepCompletion.allComplete && activeCase.status === 'intake' ? (
                      <Button 
                        className="w-full justify-start bg-gradient-primary" 
                        onClick={handleReviewCase}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Review Case & Submit
                      </Button>
                    ) : !stepCompletion.allComplete && !stepCompletion.isSubmittedCase && (activeCase.status === 'intake' || activeCase.status === 'draft') ? (
                      <Button 
                        asChild 
                        className="w-full justify-start bg-gradient-primary"
                      >
                        <Link to={`/intake?case=${activeCase.id}`}>
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Continue Setup
                        </Link>
                      </Button>
                    ) : stepCompletion.isSubmittedCase ? (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        Case has been submitted and is being processed
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* Proposals & Contracts Card */}
        <Card className="bg-gradient-card shadow-card border-2 border-accent/20 hover:border-accent/40 transition-colors" id="inbox-section">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Proposals & Contracts</span>
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              View proposals, contracts, and updates from your legal team
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="proposals" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="proposals" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Proposals
                  {proposals && proposals.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{proposals.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="contracts" className="flex items-center gap-2">
                  <PenTool className="h-4 w-4" />
                  Contracts
                  {contracts && contracts.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{contracts.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="proposals" className="mt-0">
                {!proposals || proposals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {currentLanguage === 'ar' ? 'لا توجد عروض بعد' : 'No proposals yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {proposalsWithCases.filter(p => !activeCase?.id || p.case?.id === activeCase.id).map((proposalWithCase) => {
                      const getProposalStatusBadge = (status: string) => {
                        switch (status) {
                          case 'pending':
                            return <Badge className="bg-emerald-500 hover:bg-emerald-500">New</Badge>;
                          case 'viewed':
                            return <Badge className="bg-purple-500 hover:bg-purple-500">Viewed</Badge>;
                          case 'accepted':
                            return <Badge className="bg-blue-500 hover:bg-blue-500">Accepted</Badge>;
                          case 'rejected':
                            return <Badge className="bg-red-500 hover:bg-red-500">Rejected</Badge>;
                          default:
                            return <Badge variant="outline">{status}</Badge>;
                        }
                      };

                      return (
                        <div key={proposalWithCase.id} className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                              <h4 className="font-semibold text-base truncate">
                                New Legal Proposal Received
                              </h4>
                            </div>
                            {getProposalStatusBadge(proposalWithCase.status)}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(proposalWithCase.created_at).toLocaleDateString()}
                            </span>
                            {proposalWithCase.case && (
                              <>
                                <span>•</span>
                                <span className="truncate">{proposalWithCase.case.title}</span>
                              </>
                            )}
                          </div>

                          {proposalWithCase.consultation_fee && (
                            <p className="text-sm text-muted-foreground mb-4">
                              Consultation Fee: ${proposalWithCase.consultation_fee}
                            </p>
                          )}

                          <div className="flex justify-end gap-2">
                            {needsPayment(proposalWithCase) && (
                              <Button 
                                size="sm" 
                                variant="default"
                                className="bg-primary hover:bg-primary/90"
                                onClick={() => {
                                  const isGracePeriodPayment = proposalWithCase.case?.status === 'active' && proposalWithCase.case?.consultation_completed_at;
                                  const remainingFee = proposalWithCase.remaining_fee || 0;
                                  const paymentType = isGracePeriodPayment ? 'remaining' : 'consultation';
                                  
                                  navigate('/payment', {
                                    state: {
                                      paymentData: {
                                        type: paymentType,
                                        caseId: proposalWithCase.case?.id,
                                        proposalId: proposalWithCase.id,
                                        consultationFee: proposalWithCase.consultation_fee,
                                        remainingFee: remainingFee,
                                        totalFee: proposalWithCase.final_total_fee || proposalWithCase.total_fee,
                                        lawyerName: proposalWithCase.case?.assigned_lawyer_name || 'Your Lawyer',
                                        caseTitle: proposalWithCase.case?.title
                                      }
                                    }
                                  });
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Complete Payment
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => {
                                setSelectedProposal(proposalWithCase);
                                setShowProposalReview(true);
                              }}
                            >
                              View Proposal
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="contracts" className="mt-0">
                {!contracts || contracts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <PenTool className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">
                      {currentLanguage === 'ar' ? 'لا توجد عقود بعد' : 'No contracts yet'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {contracts.map((contract) => {
                      const getContractStatusBadge = (status: string) => {
                        switch (status) {
                          case 'sent':
                            return <Badge className="bg-emerald-500 hover:bg-emerald-500">Sent</Badge>;
                          case 'viewed':
                            return <Badge className="bg-purple-500 hover:bg-purple-500">Viewed</Badge>;
                          case 'downloaded':
                            return <Badge className="bg-blue-500 hover:bg-blue-500">Downloaded</Badge>;
                          case 'sent_for_signature':
                            return <Badge className="bg-orange-500 hover:bg-orange-500">Sent for Signature</Badge>;
                          case 'physically_signed':
                            return <Badge className="bg-emerald-600 hover:bg-emerald-600">Physically Signed</Badge>;
                          case 'active':
                            return <Badge className="bg-green-600 hover:bg-green-600">Active</Badge>;
                          default:
                            return <Badge variant="outline">{status.replace(/_/g, ' ').toUpperCase()}</Badge>;
                        }
                      };

                      return (
                        <div key={contract.id} className="p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <PenTool className="h-5 w-5 text-muted-foreground shrink-0" />
                              <h4 className="font-semibold text-base truncate">
                                Contract #{contract.id.slice(0, 8)}
                              </h4>
                            </div>
                            {getContractStatusBadge(contract.status)}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(contract.created_at).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span>ID: #{contract.id.slice(0, 8)}</span>
                          </div>

                          {contract.dhl_tracking_number && (
                            <p className="text-sm text-muted-foreground mb-4">
                              📦 DHL Tracking: {contract.dhl_tracking_number}
                            </p>
                          )}

                          <div className="flex justify-end">
                            <Button 
                              size="sm" 
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => {
                                setSelectedContract(contract);
                                setShowContractReview(true);
                              }}
                            >
                              View Contract
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Communication Center */}
        <Collapsible open={!collapsedCards.communication} onOpenChange={() => toggleCard('communication')}>
          <Card className="bg-gradient-card shadow-card border-2 border-success/20 hover:border-success/40 transition-colors">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Communication Center
                      {totalUnreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2">
                          {totalUnreadCount}
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="flex items-center justify-between">
                      <span>Direct communication with your legal team</span>
                      {cases.length > 1 && (
                        <div className="flex items-center gap-2 ml-4">
                          <span className="text-xs">Case:</span>
                          <select 
                            value={activeCase.id} 
                            onChange={(e) => {
                              const selectedCase = cases.find(c => c.id === e.target.value);
                              if (selectedCase) setActiveCase(selectedCase);
                            }}
                            className="text-xs bg-background border border-border rounded px-2 py-1"
                          >
                            {cases.map((caseItem) => (
                              <option key={caseItem.id} value={caseItem.id}>
                                {caseItem.case_number} - {caseItem.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  {collapsedCards.communication ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <CommunicationInbox
                  cases={cases}
                  userRole="client"
                  caseId={activeCase.id}
                  caseTitle={activeCase.title}
                  caseStatus={activeCase.status}
                  consultationPaid={activeCase.consultation_paid || false}
                  paymentStatus={activeCase.payment_status || 'pending'}
                  lawyerAssigned={!!activeCase.assigned_lawyer_id}
                />
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  All communication must remain on platform. External contact details will be automatically redacted.
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Calendar Card */}
        <Collapsible open={!collapsedCards.calendar} onOpenChange={() => toggleCard('calendar')}>
          <Card className="bg-gradient-card shadow-card border-2 border-info/20 hover:border-info/40 transition-colors">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <CalendarIcon className="h-5 w-5 mr-2" />
                      Calendar & Appointments
                    </CardTitle>
                    <CardDescription>
                      View scheduled meetings and appointments
                    </CardDescription>
                  </div>
                  {collapsedCards.calendar ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <CaseCalendar
                  caseId={activeCase.id}
                  isLawyer={false}
                  clientId={user?.id}
                  lawyerId={activeCase.assigned_lawyer_id}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Case Documents Card */}
        <Collapsible open={!collapsedCards.documents} onOpenChange={() => toggleCard('documents')}>
          <Card className="bg-gradient-card shadow-card border-2 border-warning/20 hover:border-warning/40 transition-colors">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Case Documents
                    </CardTitle>
                    <CardDescription>
                      Upload and manage all case-related documents
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleViewMode();
                      }}
                      title={`Switch to ${documentViewMode === 'list' ? 'grid' : 'list'} view`}
                    >
                      {documentViewMode === 'list' ? (
                        <LayoutGrid className="h-4 w-4" />
                      ) : (
                        <LayoutList className="h-4 w-4" />
                      )}
                    </Button>
                    {collapsedCards.documents ? (
                      <ChevronRight className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {/* Uploaded Documents */}
                {documents.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-4">Uploaded Documents</h4>
                    
                    {documentViewMode === 'list' ? (
                      <div className="grid gap-4">
                        {documents.map((doc, index) => {
                          const displayName = doc.display_name || doc.file_name.replace(/^\d+_/, '');
                          const isEditing = editingDocId === doc.id;
                          
                          return (
                            <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 overflow-hidden">
                              <div className="flex items-center space-x-3 flex-1 min-w-0 overflow-hidden">
                                <DocumentThumbnail
                                  fileUrl={doc.file_url}
                                  fileName={doc.file_name}
                                  fileType={doc.file_type}
                                  size="small"
                                  onClick={() => setPreviewDocument(doc)}
                                />
                                <div className="flex-1 min-w-0 overflow-hidden">
                                {isEditing ? (
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={editingDocName}
                                      onChange={(e) => setEditingDocName(e.target.value)}
                                      className="h-8 text-sm"
                                      autoFocus
                                      onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                          const success = await renameDocument(doc.id, editingDocName);
                                          if (success) {
                                            setEditingDocId(null);
                                            setEditingDocName('');
                                          }
                                        } else if (e.key === 'Escape') {
                                          setEditingDocId(null);
                                          setEditingDocName('');
                                        }
                                      }}
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={async () => {
                                        const success = await renameDocument(doc.id, editingDocName);
                                        if (success) {
                                          setEditingDocId(null);
                                          setEditingDocName('');
                                        }
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingDocId(null);
                                        setEditingDocName('');
                                      }}
                                      className="h-8 w-8 p-0"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <p className="font-medium truncate w-full">{displayName}</p>
                                    <p className="text-sm text-muted-foreground truncate w-full">
                                      {Math.round(doc.file_size / 1024)} KB • Uploaded {formatDate(doc.created_at)}
                                      {doc.document_category && ` • ${doc.document_category}`}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                              {!isEditing && (
                                <div className="flex items-center space-x-2 flex-shrink-0">
                                  <Badge variant="secondary" className="hidden sm:inline-flex">
                                    {doc.file_type.split('/')[1] || 'file'}
                                  </Badge>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => setPreviewDocument(doc)}
                                    title="Preview document"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingDocId(doc.id);
                                      setEditingDocName(displayName);
                                    }}
                                    title="Rename document"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" asChild>
                                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {documents.map((doc, index) => {
                          const displayName = doc.display_name || doc.file_name.replace(/^\d+_/, '');
                          const isEditing = editingDocId === doc.id;
                          
                          return (
                            <div key={index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors group overflow-hidden">
                              <div className="flex flex-col items-center space-y-2">
                                <DocumentThumbnail
                                  fileUrl={doc.file_url}
                                  fileName={doc.file_name}
                                  fileType={doc.file_type}
                                  size="medium"
                                  onClick={() => setPreviewDocument(doc)}
                                />
                                {isEditing ? (
                                  <div className="w-full space-y-2">
                                    <Input
                                      value={editingDocName}
                                      onChange={(e) => setEditingDocName(e.target.value)}
                                      className="h-8 text-sm"
                                      autoFocus
                                      onKeyDown={async (e) => {
                                        if (e.key === 'Enter') {
                                          const success = await renameDocument(doc.id, editingDocName);
                                          if (success) {
                                            setEditingDocId(null);
                                            setEditingDocName('');
                                          }
                                        } else if (e.key === 'Escape') {
                                          setEditingDocId(null);
                                          setEditingDocName('');
                                        }
                                      }}
                                    />
                                    <div className="flex justify-center gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={async () => {
                                          const success = await renameDocument(doc.id, editingDocName);
                                          if (success) {
                                            setEditingDocId(null);
                                            setEditingDocName('');
                                          }
                                        }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingDocId(null);
                                          setEditingDocName('');
                                        }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="w-full overflow-hidden px-1">
                                      <p className="text-sm font-medium text-center truncate" title={displayName}>
                                        {displayName}
                                      </p>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {Math.round(doc.file_size / 1024)} KB
                                    </p>
                                    <div className="flex justify-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                      <Button
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => setPreviewDocument(doc)}
                                        className="h-7 w-7 p-0"
                                        title="Preview"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost"
                                        onClick={() => {
                                          setEditingDocId(doc.id);
                                          setEditingDocName(displayName);
                                        }}
                                        className="h-7 w-7 p-0"
                                        title="Rename"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="ghost" 
                                        asChild
                                        className="h-7 w-7 p-0"
                                      >
                                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download title="Download">
                                          <Download className="h-3 w-3" />
                                        </a>
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Document Upload Component */}
                <DocumentUpload 
                  caseId={activeCase?.id}
                  existingDocuments={documents}
                  onFilesUploaded={(files) => {
                    console.log('Files uploaded:', files);
                    // Documents will be refreshed via realtime subscription
                  }}
                  onRefreshRequested={refreshData}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* AI Intake Conversation Dialog */}
        <Dialog open={intakeConversationOpen} onOpenChange={setIntakeConversationOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>AI Intake Conversation</DialogTitle>
              <DialogDescription>
                Your conversation history with our AI legal assistant during case intake
              </DialogDescription>
            </DialogHeader>
            <div>
              {/* Messages */}
              <div className="h-96 border rounded-lg p-4 overflow-y-auto mb-4 bg-background space-y-4">
                {messages.length > 0 ? messages.map((msg, index) => (
                  <div key={index} className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${
                      msg.sender === 'client' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    } rounded-lg p-3`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs opacity-75">
                          {msg.sender === 'client' ? 'You' : 'AI Assistant'}
                        </span>
                        <span className="text-xs opacity-75">
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No conversation history available</p>
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment History Dialog */}
        <Dialog open={paymentHistoryOpen} onOpenChange={setPaymentHistoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Payment History</DialogTitle>
              <DialogDescription>
                View your payment history and status for this case.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6 text-center">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Payments Yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                No payments have been made for this case yet. Payment requirements will be communicated when your case progresses.
              </p>
              <div className="bg-muted p-3 rounded text-sm">
                <p className="font-medium mb-1">Need Help?</p>
                <p className="text-muted-foreground">
                  Contact our billing department for payment questions or assistance.
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Document Preview Dialog */}
        <DocumentPreview
          isOpen={!!previewDocument}
          onClose={() => setPreviewDocument(null)}
          document={previewDocument}
        />

        {/* Proposal Review Dialog */}
        {selectedProposal && (
          <ProposalReviewDialog
            open={showProposalReview}
            onOpenChange={(open) => {
              setShowProposalReview(open);
              if (!open) setSelectedProposal(null);
            }}
            proposal={selectedProposal}
            onProposalUpdate={() => {
              refreshData();
            }}
          />
        )}

        {/* Contract Review Dialog */}
        {selectedContract && (
          <ContractReviewDialog
            isOpen={showContractReview}
            onClose={() => {
              setShowContractReview(false);
              setSelectedContract(null);
            }}
            contract={selectedContract}
            caseInfo={{
              case_number: activeCase?.case_number || '',
              title: activeCase?.title || '',
              client_name: activeCase?.client_name || ''
            }}
            lawyerName="Lawyer"
          />
        )}
      </div>
    </div>
  );
};

export default ClientDashboard;
