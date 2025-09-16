import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Scale, ArrowLeft, MessageSquare, Upload, FileText, CheckCircle, Clock, User } from "lucide-react";
import { Link } from "react-router-dom";
import { LegalChatbot } from "@/components/LegalChatbot";
import { AuthenticationPrompt } from "@/components/AuthenticationPrompt";
import { PersonalDetailsForm, PersonalDetailsData } from "@/components/PersonalDetailsForm";
import DocumentUpload from "@/components/DocumentUpload";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Intake = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [personalData, setPersonalData] = useState<PersonalDetailsData | null>(null);
  const [extractedCaseData, setExtractedCaseData] = useState<any>(null);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showPersonalForm, setShowPersonalForm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const [caseId, setCaseId] = useState<string | null>(null);

  const handleCaseDataExtracted = (data: any) => {
    setExtractedCaseData(data);
    
    // Check if AI needs personal details and we don't have them yet
    if (data.needsPersonalDetails && !personalData) {
      setShowPersonalForm(true);
    }
  };

  const handlePersonalDetailsSubmit = async (data: PersonalDetailsData) => {
    setPersonalData(data);
    setShowPersonalForm(false);
    // Advance to document upload step
    setCurrentStep(3);
    
    // Save personal data to case
    // This will be handled by the LegalChatbot component's saveCaseStep function
  };

  // Load existing draft case on mount
  useEffect(() => {
    const loadDraftCase = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Look for existing draft cases
        const { data: draftCases } = await supabase
          .from('cases')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'draft')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (draftCases && draftCases.length > 0) {
          const draftCase = draftCases[0];
          const draftData = (draftCase.draft_data as any) || {};
          
          // Restore state from draft case
          setCurrentStep(draftCase.step || 1);
          if (draftData.extractedData) {
            setExtractedCaseData(draftData.extractedData);
          }
          if (draftData.personalData) {
            setPersonalData(draftData.personalData as PersonalDetailsData);
          }
        }
      } catch (error) {
        console.error('Error loading draft case:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadDraftCase();
  }, [user]);

  const handleBackFromPersonalForm = () => {
    setShowPersonalForm(false);
  };

  const handleContinueToDocuments = () => {
    // Check if personal details are needed first
    if (!personalData) {
      setShowPersonalForm(true);
      return;
    }
    
    // Show authentication prompt when users want to proceed
    if (!currentUser) {
      setShowAuthPrompt(true);
    } else {
      setCurrentStep(3);
    }
  };

  const handleAuthenticated = (user: any) => {
    setCurrentUser(user);
    setShowAuthPrompt(false);
    setCurrentStep(3);
  };

  const handleContinueAsGuest = () => {
    setShowAuthPrompt(false);
    setCurrentStep(3);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your case...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Scale className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <span className="text-lg sm:text-xl font-bold">LegalPro</span>
            </Link>
            <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
        {/* Progress Header */}
        <div className="mb-4 sm:mb-8">
          {/* Mobile Progress Steps */}
          <div className="block sm:hidden mb-4">
            <div className="flex items-center justify-between px-2">
              {[
                { number: 1, label: 'Chat', icon: MessageSquare },
                { number: 2, label: 'Details', icon: User },
                { number: 3, label: 'Docs', icon: Upload },
                { number: 4, label: 'Review', icon: FileText }
              ].map((step, index) => (
                <div key={step.number} className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium relative ${
                    (currentStep > step.number) || 
                    (currentStep === step.number && !showPersonalForm) ||
                    (step.number === 2 && personalData) ||
                    (step.number === 1 && showPersonalForm)
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {((currentStep > step.number) || (step.number === 2 && personalData)) ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <step.icon className="h-4 w-4" />
                    )}
                  </div>
                  <span className="text-xs mt-1 text-center">{step.label}</span>
                  {index < 3 && (
                    <div className={`absolute top-4 left-1/2 w-16 h-0.5 ${
                      (currentStep > step.number) || (step.number === 1 && personalData)
                        ? 'bg-primary' : 'bg-muted'
                    }`} style={{ transform: 'translateX(50%)' }} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Progress Steps */}
          <div className="hidden sm:flex items-center justify-center space-x-4 mb-6">
            {[
              { number: 1, label: 'AI Chat', icon: MessageSquare },
              { number: 2, label: 'Personal Details', icon: User },
              { number: 3, label: 'Documents', icon: Upload },
              { number: 4, label: 'Review', icon: FileText }
            ].map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium relative ${
                  (currentStep > step.number) || 
                  (currentStep === step.number && !showPersonalForm) ||
                  (step.number === 2 && personalData) ||
                  (step.number === 1 && showPersonalForm)
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {((currentStep > step.number) || (step.number === 2 && personalData)) ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                {index < 3 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    (currentStep > step.number) || (step.number === 1 && personalData)
                      ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <h1 className="text-xl sm:text-3xl font-bold mb-2">Case Intake Process</h1>
            <p className="text-sm sm:text-base text-muted-foreground px-2">
              {(currentStep === 1 && !showPersonalForm) && "Chat with Lexa to understand your legal needs"}
              {showPersonalForm && "Provide your contact information"}
              {currentStep === 3 && "Document collection and case categorization"}
              {currentStep === 4 && "Review and submit your case for lawyer matching"}
            </p>
          </div>
        </div>

        {/* Personal Details Form */}
        {showPersonalForm && (
          <PersonalDetailsForm
            initialData={personalData || undefined}
            onSubmit={handlePersonalDetailsSubmit}
            onBack={handleBackFromPersonalForm}
            className="mb-8"
          />
        )}

        {/* Step 1: AI Chat Interface */}
        {currentStep === 1 && !showPersonalForm && (
          <div className="flex flex-col h-[calc(100vh-280px)] sm:h-[calc(100vh-320px)] min-h-[400px] max-h-[600px]">
            <LegalChatbot 
              mode="intake"
              userId={user?.id}
              onCaseDataExtracted={handleCaseDataExtracted}
              onCaseCreated={(id) => setCaseId(id)}
              className="flex-1"
            />
            
            <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mt-4 p-3 bg-background border-t">
              <div className="text-sm text-muted-foreground">
                {extractedCaseData && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">Case detected</Badge>
                    {extractedCaseData.category && (
                      <Badge variant="secondary" className="text-xs">{extractedCaseData.category}</Badge>
                    )}
                  </div>
                )}
              </div>
              <Button onClick={handleContinueToDocuments} className="bg-gradient-primary w-full sm:w-auto">
                {personalData ? 'Continue to Documents' : 'Continue'}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Document Upload */}
        {currentStep === 3 && (
          <Card className="bg-gradient-card shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Document Collection
              </CardTitle>
              <CardDescription>
                Upload relevant documents to support your case
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <DocumentUpload 
                caseId={caseId}
                onFilesUploaded={(files) => {
                  console.log('Files uploaded:', files);
                  // You can add additional logic here if needed
                }}
              />

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back to Chat
                </Button>
                <Button onClick={() => setCurrentStep(4)} className="bg-gradient-primary">
                  Review Case
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Case Summary */}
        {currentStep === 4 && (
          <Card className="bg-gradient-card shadow-elevated">
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Case Summary
              </CardTitle>
              <CardDescription>
                Review your case details before submission
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Case Overview */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-4">Case Information</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Category</Label>
                      <p className="text-sm text-muted-foreground">Family Law / Marriage & Divorce</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Jurisdiction</Label>
                      <p className="text-sm text-muted-foreground">Egypt</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-4">Contact Information</h4>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Name</Label>
                      <p className="text-sm text-muted-foreground">
                        {personalData?.fullName || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-muted-foreground">
                        {personalData?.email || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Phone</Label>
                      <p className="text-sm text-muted-foreground">
                        {personalData?.phone || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Language</Label>
                      <p className="text-sm text-muted-foreground">
                        {personalData?.preferredLanguage === 'en' && 'English'}
                        {personalData?.preferredLanguage === 'ar' && 'Arabic'}
                        {personalData?.preferredLanguage === 'de' && 'German'}
                        {!personalData?.preferredLanguage && 'Not provided'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Case Description */}
              <div>
                <h4 className="font-medium mb-4">Case Description</h4>
                <Card className="p-4 bg-muted">
                  <p className="text-sm">
                    Based on our conversation, you're seeking legal assistance with divorce proceedings. 
                    The AI has identified key aspects including asset division, child custody considerations, 
                    and timeline requirements. Your case has been categorized as Family Law with medium urgency.
                  </p>
                </Card>
              </div>

              {/* Uploaded Documents */}
              <div>
                <h4 className="font-medium mb-4">Uploaded Documents</h4>
                <div className="space-y-2">
                  {["Marriage Certificate.pdf", "Financial Statement.pdf", "ID Card.jpg"].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{doc}</span>
                      <Badge variant="outline">Uploaded</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Next Steps */}
              <Card className="p-4 bg-primary/10 border-primary/20">
                <h4 className="font-medium mb-2 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  What Happens Next?
                </h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Admin will review your case within 2-4 hours</li>
                  <li>• You'll be matched with a specialist lawyer</li>
                  <li>• Lawyer will prepare a detailed proposal</li>
                  <li>• You can accept and pay consultation fee to begin</li>
                </ul>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(3)}>
                  Back to Documents
                </Button>
                <Button className="bg-gradient-primary">
                  Submit Case for Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Authentication Prompt */}
      {showAuthPrompt && (
        <AuthenticationPrompt
          trigger="case_submission"
          onAuthenticated={handleAuthenticated}
          onContinueAsGuest={handleContinueAsGuest}
        />
      )}
    </div>
  );
};

export default Intake;