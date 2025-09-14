import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Scale, ArrowLeft, MessageSquare, Upload, FileText, CheckCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { LegalChatbot } from "@/components/LegalChatbot";

const Intake = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    language: "EN",
    caseDescription: "",
    urgency: "medium",
    category: ""
  });
  const [extractedCaseData, setExtractedCaseData] = useState<any>(null);

  const handleCaseDataExtracted = (data: any) => {
    setExtractedCaseData(data);
    
    // Auto-fill form data from extracted case information
    if (data.category) {
      setFormData(prev => ({
        ...prev,
        category: data.category,
        urgency: data.urgency || 'medium'
      }));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center space-x-2">
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalConnect</span>
            </Link>
            <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {currentStep > step ? <CheckCircle className="h-4 w-4" /> : step}
                </div>
                {step < 3 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    currentStep > step ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Case Intake Process</h1>
            <p className="text-muted-foreground">
              {currentStep === 1 && "AI-powered consultation to understand your legal needs"}
              {currentStep === 2 && "Document collection and case categorization"}
              {currentStep === 3 && "Review and submit your case for lawyer matching"}
            </p>
          </div>
        </div>

        {/* Step 1: AI Chat Interface */}
        {currentStep === 1 && (
          <div className="h-[600px]">
            <LegalChatbot 
              mode="intake"
              onCaseDataExtracted={handleCaseDataExtracted}
              className="h-full"
            />
            
            <div className="flex justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                {extractedCaseData && (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">Case detected</Badge>
                    {extractedCaseData.category && (
                      <Badge variant="secondary">{extractedCaseData.category}</Badge>
                    )}
                    {extractedCaseData.urgency && (
                      <Badge variant={extractedCaseData.urgency === 'high' || extractedCaseData.urgency === 'urgent' ? 'destructive' : 'default'}>
                        {extractedCaseData.urgency} priority
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <Button onClick={() => setCurrentStep(2)} className="bg-gradient-primary">
                Continue to Documents
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Document Upload */}
        {currentStep === 2 && (
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
              {/* Document Categories */}
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: "Identity Documents", required: true, files: ["ID Card", "Passport"] },
                  { title: "Case Related Documents", required: true, files: ["Contracts", "Correspondence"] },
                  { title: "Financial Documents", required: false, files: ["Bank Statements", "Invoices"] },
                  { title: "Legal Documents", required: false, files: ["Previous Court Orders", "Legal Notices"] }
                ].map((category, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">{category.title}</h4>
                      <Badge variant={category.required ? "default" : "secondary"}>
                        {category.required ? "Required" : "Optional"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {category.files.map((file, fileIndex) => (
                        <div key={fileIndex} className="flex items-center justify-between p-2 bg-muted rounded">
                          <span className="text-sm">{file}</span>
                          <Button size="sm" variant="ghost">
                            <Upload className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Drop files here or click to upload</h3>
                <p className="text-muted-foreground mb-4">
                  Supported: PDF, DOCX, JPG, PNG (Max 25MB each)
                </p>
                <Button variant="outline">Choose Files</Button>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back to Chat
                </Button>
                <Button onClick={() => setCurrentStep(3)} className="bg-gradient-primary">
                  Review Case
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Case Summary */}
        {currentStep === 3 && (
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
                      <Label className="text-sm font-medium">Urgency</Label>
                      <Badge className="ml-2">Medium Priority</Badge>
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
                      <p className="text-sm text-muted-foreground">John Smith</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Email</Label>
                      <p className="text-sm text-muted-foreground">john@example.com</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Language</Label>
                      <p className="text-sm text-muted-foreground">English</p>
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
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
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
    </div>
  );
};

export default Intake;