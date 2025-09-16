import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ArrowRight
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useClientData } from "@/hooks/useClientData";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import DocumentUpload from "@/components/DocumentUpload";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link, useNavigate } from "react-router-dom";

const ClientDashboard = () => {
  const [newMessage, setNewMessage] = useState("");
  const [deletingCase, setDeletingCase] = useState(false);
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { 
    cases, 
    activeCase, 
    messages, 
    documents, 
    loading, 
    setActiveCase, 
    sendMessage,
    refreshData: fetchCases
  } = useClientData();

  const handleDeleteDraftCase = async () => {
    if (!activeCase || activeCase.status !== 'draft') return;
    
    setDeletingCase(true);
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', activeCase.id);

      if (error) throw error;

      toast({
        title: "Draft Case Deleted",
        description: "Your draft case has been deleted successfully.",
      });

      // Refresh the cases list
      await fetchCases();
    } catch (error) {
      console.error('Error deleting case:', error);
      toast({
        title: "Error",
        description: "Failed to delete the draft case. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingCase(false);
    }
  };

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
      case 'draft':
        return 'bg-warning';
      default:
        return 'bg-muted';
    }
  };

  // Compute completion status from actual data
  const getStepCompletion = () => {
    if (!activeCase) return { step1: false, step2: false, step3: false, allComplete: false };
    
    // Step 1: Case data exists (either extracted data or AI summary)
    const step1Complete = !!(activeCase.ai_summary || activeCase.draft_data);
    
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

      navigate('/intake');
    } catch (error) {
      console.error('Error updating case step:', error);
      toast({
        title: "Error",
        description: "Failed to proceed to review. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <Scale className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">LegalConnect</span>
                <Badge variant="secondary" className="ml-2">Client Portal</Badge>
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
        <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-2">
                <Scale className="h-8 w-8 text-primary" />
                <span className="text-xl font-bold">LegalConnect</span>
                <Badge variant="secondary" className="ml-2">Client Portal</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
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
              <Button asChild>
                <Link to="/intake">Start New Case</Link>
              </Button>
            </CardContent>
          </Card>
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
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalConnect</span>
              <Badge variant="secondary" className="ml-2">Client Portal</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">Settings</Button>
              <Button variant="ghost" size="sm">Sign Out</Button>
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
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4 lg:mt-0">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(activeCase.status)}`} />
              <span className="font-medium capitalize">{activeCase.status.replace('_', ' ')}</span>
            </div>
          </div>

          {/* Lawyer Info Card */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold">
                    {activeCase.assigned_lawyer_id ? 'AL' : 'UN'}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {activeCase.assigned_lawyer_id 
                      ? 'Your Assigned Lawyer'
                      : 'Lawyer Not Assigned Yet'
                    }
                  </CardTitle>
                  <CardDescription>
                    {activeCase.assigned_lawyer_id 
                      ? 'Legal Representation' 
                      : 'Waiting for assignment'
                    }
                  </CardDescription>
                </div>
                <div className="ml-auto">
                  <Button size="sm" className="bg-gradient-primary">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Personal Details</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="documents" id="documents-tab">Documents</TabsTrigger>
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
                            <span className="font-medium">Lawyer Assigned</span>
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
                          <span className="font-medium">Current Status: {activeCase.status.replace('_', ' ')}</span>
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
                    onClick={() => document.getElementById('documents-tab')?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Documents
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message to Lawyer
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Download Case Summary
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <CreditCard className="h-4 w-4 mr-2" />
                    View Payment History
                  </Button>
                  {activeCase.status === 'draft' && (
                    <>
                      {stepCompletion.allComplete ? (
                        <Button 
                          className="w-full justify-start bg-gradient-primary" 
                          onClick={handleReviewCase}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Review Case & Submit
                        </Button>
                      ) : (
                        <Button asChild className="w-full justify-start" variant="outline">
                          <Link to={`/intake?case=${activeCase.id}`}>
                            <FileText className="h-4 w-4 mr-2" />
                            Continue Case Setup
                          </Link>
                        </Button>
                      )}
                      
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
                      
                      <Button 
                        className="w-full justify-start" 
                        variant="destructive"
                        onClick={handleDeleteDraftCase}
                        disabled={deletingCase}
                      >
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Delete Draft Case
                      </Button>
                    </>
                  )}
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
                
                {activeCase?.status === 'draft' && (
                <div className="pt-4 border-t">
                  <Button asChild variant="outline">
                    <Link to={`/intake?case=${activeCase.id}`}>
                      <FileText className="h-4 w-4 mr-2" />
                      Edit Details
                    </Link>
                  </Button>
                </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Messages Tab */}
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