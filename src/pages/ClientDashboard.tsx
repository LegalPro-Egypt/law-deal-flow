import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatCaseStatus } from "@/utils/caseUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Scale, 
  MessageSquare, 
  FileText, 
  CreditCard, 
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
  Settings,
  LogOut
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { downloadPDF, getUserFriendlyDownloadMessage } from "@/utils/pdfDownload";

const ClientDashboard = () => {
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { 
    cases, 
    activeCase, 
    messages, 
    documents, 
    loading,
    fetchingCases,
    setActiveCase, 
    sendMessage,
    refreshData
  } = useClientData();


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
    if (!activeCase) return { step1: false, step2: false, step3: false, allComplete: false };
    
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
    
    return { step1: step1Complete, step2: step2Complete, step3: step3Complete, allComplete };
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
      pdf.text(`Status: ${formatCaseStatus(activeCase.status)}`, 20, 70);
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
          pdf.text(`${index + 1}. ${doc.file_name} (${doc.file_type})`, 20, yPos);
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

  const handleInboxClick = () => {
    setActiveTab("inbox");
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
                    <h1 className="text-lg sm:text-xl font-bold">LegalConnect</h1>
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
                    <h1 className="text-lg sm:text-xl font-bold">LegalConnect</h1>
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo and Title */}
            <Link to="/?force=true" className="flex items-center space-x-2 sm:space-x-4 hover:opacity-80 transition-opacity">
              <Scale className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <div className="flex items-center space-x-1 sm:space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-foreground hidden xs:block sm:block">
                  LegalConnect
                </h1>
                <Badge variant="secondary" className="text-xs hidden sm:block">
                  Client Portal
                </Badge>
              </div>
            </Link>

            {/* Case Selector - Mobile: Reduced width, Desktop: Normal */}
            {cases.length > 1 && (
              <div className="flex-1 max-w-[120px] sm:max-w-xs mx-2 sm:mx-4">
                <CaseSelector 
                  cases={cases}
                  activeCase={activeCase}
                  onCaseSelect={(caseId) => {
                    const selectedCase = cases.find(c => c.id === caseId);
                    if (selectedCase) setActiveCase(selectedCase);
                  }}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
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
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline sm:ml-2">Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-background border border-border shadow-lg z-50">
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

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Case Overview Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{activeCase.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{activeCase.case_number}</Badge>
                <Badge className="bg-primary">{activeCase.category}</Badge>
                {cases.length > 1 && (
                  <Badge variant="secondary" className="text-xs">
                    Active Case ({cases.findIndex(c => c.id === activeCase.id) + 1} of {cases.length})
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4 lg:mt-0">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(activeCase.status)}`} />
              <span className="font-medium capitalize">
                {formatCaseStatus(activeCase.status)}
              </span>
            </div>
          </div>

          {/* Communication Inbox Section */}
          <CommunicationInbox
            caseId={activeCase.id}
            caseTitle={activeCase.title}
            caseStatus={activeCase.status}
            consultationPaid={activeCase.consultation_paid || false}
            paymentStatus={activeCase.payment_status || 'pending'}
            userRole="client"
            lawyerAssigned={!!activeCase.assigned_lawyer_id}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide md:grid md:grid-cols-5 gap-1 pl-6 pr-2 h-12 justify-start">
            <TabsTrigger value="overview" className="flex-shrink-0 min-w-fit px-4 first:ml-2 last:mr-2">Overview</TabsTrigger>
            <TabsTrigger value="inbox" className="flex-shrink-0 min-w-fit px-4 first:ml-2 last:mr-2">Inbox</TabsTrigger>
            <TabsTrigger value="details" className="flex-shrink-0 min-w-fit px-4 first:ml-2 last:mr-2">Personal Details</TabsTrigger>
            <TabsTrigger value="messages" className="flex-shrink-0 min-w-fit px-4 first:ml-2 last:mr-2">Messages</TabsTrigger>
            <TabsTrigger value="documents" id="documents-tab" className="flex-shrink-0 min-w-fit px-4 first:ml-2 last:mr-2">Documents</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Case Timeline */}
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Case Timeline
                  </CardTitle>
                </CardHeader>
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
                            Current Status: {formatCaseStatus(activeCase.status)}
                          </span>
                          <span className="text-sm text-muted-foreground">{formatDate(activeCase.updated_at)}</span>
                        </div>
                      </div>
                      <Clock className="h-4 w-4 text-accent" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleInboxClick}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Inbox
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="outline"
                    onClick={handleDownloadCaseSummary}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Case Summary
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="w-full justify-start" variant="outline">
                        <Receipt className="h-4 w-4 mr-2" />
                        View Payments
                      </Button>
                    </DialogTrigger>
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
                  {/* Case setup actions - only show submit for intake status */}
                  {stepCompletion.allComplete && activeCase.status === 'intake' ? (
                    <Button 
                      className="w-full justify-start bg-gradient-primary" 
                      onClick={handleReviewCase}
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Review Case & Submit
                    </Button>
                  ) : !stepCompletion.allComplete ? (
                    <Button 
                      asChild 
                      className="w-full justify-start bg-gradient-primary"
                    >
                      <Link to={`/intake?case=${activeCase.id}`}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Continue Setup
                      </Link>
                    </Button>
                  ) : null}
                  
                  {/* Progress indicators */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-2">
                      {stepCompletion.step1 ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                      )}
                      <span>AI Chat Complete</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {stepCompletion.step2 ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                      )}
                      <span>Personal Details</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {stepCompletion.step3 ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <div className="h-3 w-3 rounded-full border border-muted-foreground" />
                      )}
                      <span>Required Documents</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Personal Details Tab */}
          <TabsContent value="details" className="space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>
                  View and manage your contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Full Name</Label>
                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                      {activeCase?.client_name || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                      {activeCase?.client_email || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                      {activeCase?.client_phone || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Language</Label>
                    <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                      {activeCase?.language === 'en' && 'English'}
                      {activeCase?.language === 'ar' && 'Arabic'}  
                      {activeCase?.language === 'de' && 'German'}
                      {!activeCase?.language && 'Not specified'}
                    </p>
                  </div>
                </div>
                
                <div className="pt-4 border-t">
                  <Button asChild variant="outline">
                    <Link to={`/intake?case=${activeCase.id}&edit=personal`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Edit Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inbox Tab */}
          <TabsContent value="inbox" className="space-y-6">
            <NotificationsInbox />
          </TabsContent>
          <TabsContent value="messages" className="space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Secure Communication</CardTitle>
                <CardDescription>
                  All messages are encrypted and monitored for compliance
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                          <span className="text-sm font-medium">{msg.name}</span>
                          <span className="text-xs opacity-70">{msg.time}</span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-8 w-8 mx-auto mb-2" />
                      <p>No messages yet. Start a conversation with your lawyer.</p>
                    </div>
                  )}
                </div>

                {/* Message Input */}
                <div className="flex space-x-2">
                  <Textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 min-h-[80px]"
                  />
                  <div className="flex flex-col space-y-2">
                    <Button 
                      size="sm" 
                      className="bg-gradient-primary"
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  All communication must remain on platform. External contact details will be automatically redacted.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Case Documents</CardTitle>
                <CardDescription>
                  Upload and manage all case-related documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Uploaded Documents List */}
                {documents.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium mb-4">Uploaded Documents</h4>
                    <div className="grid gap-4">
                      {documents.map((doc, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{doc.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {Math.round(doc.file_size / 1024)} KB • Uploaded {formatDate(doc.created_at)}
                                {doc.document_category && ` • ${doc.document_category}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {doc.file_type}
                            </Badge>
                            <Button size="sm" variant="ghost" asChild>
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4" />
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
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
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDashboard;
