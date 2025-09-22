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
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";
import { downloadPDF, getUserFriendlyDownloadMessage } from "@/utils/pdfDownload";
import ProposalReviewDialog from "@/components/ProposalReviewDialog";

const ClientDashboard = () => {
  const [newMessage, setNewMessage] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [showProposalDialog, setShowProposalDialog] = useState(false);
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

    await sendMessage(newMessage, activeCase.id);
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
    setActiveTab("messages");
  };

  const handleReviewCase = async () => {
    if (!activeCase) return;

    if (!stepCompletion.allComplete) {
      toast({
        title: "Case Review Not Available",
        description: "Please complete all intake steps before requesting case review.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('cases')
        .update({ 
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', activeCase.id);

      if (error) throw error;

      toast({
        title: "Case Submitted for Review",
        description: "Your case has been submitted and will be reviewed by our legal team.",
      });

      refreshData();
    } catch (error) {
      console.error('Error submitting case:', error);
      toast({
        title: "Error",
        description: "Failed to submit case for review. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/auth');
    } catch (error: any) {
      console.error('Sign out error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <div className="container mx-auto px-4 py-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-10 w-32" />
              </div>
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!activeCase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Scale className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
                Client Dashboard
              </h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Card className="bg-gradient-card shadow-card max-w-2xl mx-auto text-center">
            <CardContent className="py-12">
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
              <h2 className="text-2xl font-bold mb-4">No Cases Available</h2>
              <p className="text-muted-foreground mb-6">
                You don't have any cases yet. To get started, please submit a new case through our intake process.
              </p>
              <Button asChild>
                <Link to="/intake">
                  <Plus className="mr-2 h-4 w-4" />
                  Start New Case
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const completion = getStepCompletion();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Scale className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-foreground bg-clip-text text-transparent">
              Client Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {cases.length > 1 && (
              <CaseSelector
                cases={cases}
                activeCase={activeCase}
                onCaseSelect={(caseId) => {
                  const selectedCase = cases.find(c => c.id === caseId);
                  if (selectedCase) {
                    setActiveCase(selectedCase);
                  }
                }}
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        
        <Card className="mb-8 bg-gradient-card shadow-card border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold mb-2">{activeCase.title}</h2>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className={getStatusColor(activeCase.status)}>
                    {formatCaseStatus(activeCase.status)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Case #{activeCase.case_number}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {activeCase.category}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                {cases.length > 1 && (
                <CaseSelector
                  cases={cases}
                  activeCase={activeCase}
                  onCaseSelect={(caseId) => {
                    const selectedCase = cases.find(c => c.id === caseId);
                    if (selectedCase) {
                      setActiveCase(selectedCase);
                    }
                  }}
                />
                )}
                <Button onClick={handleDownloadCaseSummary} variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download Summary
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-muted/30 backdrop-blur-sm">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle>Case Timeline</CardTitle>
                  <CardDescription>Track your case progress</CardDescription>
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

              
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle>Case Summary</CardTitle>
                  <CardDescription>AI-generated case analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  {activeCase.ai_summary ? (
                    <p className="text-sm leading-relaxed">{activeCase.ai_summary}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Case summary will be generated after initial review
                    </p>
                  )}
                </CardContent>
              </Card>

              
              <Card className="bg-gradient-card shadow-card lg:col-span-2">
                <CardHeader>
                  <CardTitle>Intake Progress</CardTitle>
                  <CardDescription>Complete all steps to submit your case for review</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {stepCompletion.allComplete && activeCase.status === 'intake' ? (
                      <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-5 w-5 text-success" />
                          <span className="font-medium text-success">All intake steps completed!</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Your case is ready for review. Click below to submit it to our legal team.
                        </p>
                        <Button
                          onClick={handleReviewCase}
                          className="mt-3 bg-success hover:bg-success/90 text-success-foreground"
                          size="sm"
                        >
                          Submit for Review
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-3">
                        {stepCompletion.step1 ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-sm">Case Information</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {stepCompletion.step2 ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-sm">Personal Details</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        {stepCompletion.step3 ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <span className="text-sm">Required Documents</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          
          <TabsContent value="messages" className="space-y-6">
            <CommunicationInbox
              caseId={activeCase.id}
              caseTitle={activeCase.title}
              caseStatus={activeCase.status}
              consultationPaid={false}
              paymentStatus="unpaid"
              userRole="client"
            />
          </TabsContent>

          
          <TabsContent value="documents" className="space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Case Documents</CardTitle>
                <CardDescription>
                  Upload and manage all case-related documents
                </CardDescription>
              </CardHeader>
              <CardContent>
                
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

                
                <DocumentUpload 
                  caseId={activeCase?.id}
                  existingDocuments={documents}
                  onFilesUploaded={(files) => {
                    console.log('Files uploaded:', files);
                  }}
                  onRefreshRequested={refreshData}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      
      {activeCase && (
        <ProposalReviewDialog
          open={showProposalDialog}
          onOpenChange={setShowProposalDialog}
          caseId={activeCase.id}
          caseTitle={activeCase.title}
          proposal={messages.find(m => m.message_type === 'proposal') || null}
          onProposalAction={() => {
            refreshData();
            setActiveTab("overview");
          }}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
