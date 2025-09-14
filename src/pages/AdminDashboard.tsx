import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Scale, 
  Users, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Eye,
  UserPlus,
  Search,
  Filter,
  ArrowRight,
  Settings
} from "lucide-react";

const AdminDashboard = () => {
  const [selectedCase, setSelectedCase] = useState("");

  // Mock data - would come from Supabase  
  const stats = {
    totalCases: 156,
    activeCases: 23,
    totalRevenue: "$84,200",
    monthlyGrowth: "+12.5%"
  };

  const pendingCases = [
    {
      id: "CASE-2024-004",
      client: "Alex Chen",
      title: "Immigration Visa Appeal",
      category: "Immigration", 
      urgency: "High",
      submittedAt: "2024-01-25 10:30 AM",
      language: "EN",
      documentsCount: 5,
      aiExtractedInfo: {
        jurisdiction: "Canada",
        caseType: "Visa Appeal",
        parties: ["Alex Chen", "Immigration Officer"],
        urgencyLevel: "High"
      }
    },
    {
      id: "CASE-2024-005", 
      client: "Fatima Al-Rashid",
      title: "Property Purchase Dispute",
      category: "Real Estate",
      urgency: "Medium",
      submittedAt: "2024-01-25 09:15 AM", 
      language: "AR",
      documentsCount: 8,
      aiExtractedInfo: {
        jurisdiction: "UAE", 
        caseType: "Property Dispute",
        parties: ["Fatima Al-Rashid", "ABC Property Co."],
        urgencyLevel: "Medium"
      }
    },
    {
      id: "CASE-2024-006",
      client: "Hans Mueller", 
      title: "Employment Contract Review",
      category: "Employment Law",
      urgency: "Low",
      submittedAt: "2024-01-24 04:45 PM",
      language: "DE", 
      documentsCount: 3,
      aiExtractedInfo: {
        jurisdiction: "Germany",
        caseType: "Contract Review", 
        parties: ["Hans Mueller", "TechCorp GmbH"],
        urgencyLevel: "Low"
      }
    }
  ];

  const lawyers = [
    { 
      id: "LAW-001",
      name: "Sarah Johnson", 
      specializations: ["Family Law", "Immigration"],
      languages: ["EN", "AR"],
      rating: 4.8,
      activeCases: 3,
      availability: "Available"
    },
    {
      id: "LAW-002", 
      name: "Ahmed Hassan",
      specializations: ["Real Estate", "Corporate Law"],
      languages: ["EN", "AR"], 
      rating: 4.6,
      activeCases: 2,
      availability: "Available"
    },
    {
      id: "LAW-003",
      name: "Maria Rodriguez", 
      specializations: ["Employment Law", "Immigration"],
      languages: ["EN", "ES"],
      rating: 4.9,
      activeCases: 4,
      availability: "Busy"
    }
  ];

  const caseFlowSteps = [
    { step: "AI Intake", description: "Client completes chatbot intake and uploads documents" },
    { step: "Admin Review", description: "Review case details and AI categorization" },
    { step: "Lawyer Assignment", description: "Assign specialist lawyer based on expertise and availability" },
    { step: "Proposal Creation", description: "Lawyer creates detailed proposal with pricing and timeline" },
    { step: "Client Approval", description: "Client reviews and accepts proposal, pays consultation fee" },
    { step: "Active Work", description: "Secure messaging and case progression with escrow protection" },
    { step: "Completion", description: "Case delivery and fund release (50% holdback until confirmed)" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalConnect</span>
              <Badge variant="destructive" className="ml-2">Admin Portal</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button variant="ghost" size="sm">Sign Out</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cases</p>
                  <p className="text-3xl font-bold">{stats.totalCases}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                  <p className="text-3xl font-bold">{stats.activeCases}</p>
                </div>
                <Clock className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold">{stats.totalRevenue}</p>
                </div>
                <DollarSign className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Growth</p>
                  <p className="text-3xl font-bold">{stats.monthlyGrowth}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Case Flow Diagram */}
        <Card className="bg-gradient-card shadow-card mb-8">
          <CardHeader>
            <CardTitle>Case Management Flow</CardTitle>
            <CardDescription>Overview of the legal services process</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-between">
              {caseFlowSteps.map((step, index) => (
                <div key={index} className="flex items-center mb-4">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mb-2">
                      {index + 1}
                    </div>
                    <h4 className="font-medium text-sm mb-1">{step.step}</h4>
                    <p className="text-xs text-muted-foreground max-w-[120px]">{step.description}</p>
                  </div>
                  {index < caseFlowSteps.length - 1 && (
                    <ArrowRight className="h-6 w-6 text-muted-foreground mx-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="cases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="cases">Case Inbox</TabsTrigger>
            <TabsTrigger value="lawyers">Lawyers</TabsTrigger>
            <TabsTrigger value="assignments">Assignments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Pending Cases</h2>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-10" placeholder="Search cases..." />
                </div>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </div>

            <div className="grid gap-4">
              {pendingCases.map((caseItem, index) => (
                <Card key={index} className="bg-gradient-card shadow-card">
                  <CardContent className="p-6">
                    <div className="grid lg:grid-cols-3 gap-6">
                      {/* Case Info */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{caseItem.id}</Badge>
                          <Badge className={
                            caseItem.urgency === 'High' ? 'bg-destructive' :
                            caseItem.urgency === 'Medium' ? 'bg-warning' : 'bg-success'
                          }>
                            {caseItem.urgency} Priority
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-1">{caseItem.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          Client: {caseItem.client} • {caseItem.language}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Submitted: {caseItem.submittedAt}
                        </p>
                        <div className="flex items-center mt-2">
                          <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
                          <span className="text-xs">{caseItem.documentsCount} documents</span>
                        </div>
                      </div>

                      {/* AI Extracted Info */}
                      <div>
                        <h4 className="font-medium mb-2 text-sm">AI Analysis</h4>
                        <div className="space-y-1 text-xs">
                          <p><span className="font-medium">Category:</span> {caseItem.category}</p>
                          <p><span className="font-medium">Jurisdiction:</span> {caseItem.aiExtractedInfo.jurisdiction}</p>
                          <p><span className="font-medium">Type:</span> {caseItem.aiExtractedInfo.caseType}</p>
                          <p><span className="font-medium">Parties:</span> {caseItem.aiExtractedInfo.parties.join(", ")}</p>
                        </div>
                        <Badge variant="secondary" className="mt-2 text-xs">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          AI Verified
                        </Badge>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2">
                        <Button size="sm" variant="outline" className="justify-start">
                          <Eye className="h-4 w-4 mr-2" />
                          Review Details
                        </Button>
                        <Button size="sm" variant="outline" className="justify-start">
                          <FileText className="h-4 w-4 mr-2" />
                          View Documents
                        </Button>
                        <Button size="sm" className="bg-gradient-primary justify-start">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Assign Lawyer
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Lawyers Tab */}
          <TabsContent value="lawyers" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Lawyer Management</h2>
              <Button className="bg-gradient-primary">
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Lawyer
              </Button>
            </div>

            <div className="grid gap-4">
              {lawyers.map((lawyer, index) => (
                <Card key={index} className="bg-gradient-card shadow-card">
                  <CardContent className="p-6">
                    <div className="grid lg:grid-cols-4 gap-4 items-center">
                      <div>
                        <h3 className="font-semibold mb-1">{lawyer.name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {lawyer.id}</p>
                        <div className="flex items-center mt-2">
                          <span className="text-sm">⭐ {lawyer.rating}/5.0</span>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-1">Specializations</p>
                        <div className="flex flex-wrap gap-1">
                          {lawyer.specializations.map((spec, specIndex) => (
                            <Badge key={specIndex} variant="outline" className="text-xs">
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="text-center">
                        <p className="text-sm font-medium">Active Cases</p>
                        <p className="text-2xl font-bold">{lawyer.activeCases}</p>
                        <Badge className={lawyer.availability === 'Available' ? 'bg-success' : 'bg-warning'}>
                          {lawyer.availability}
                        </Badge>
                      </div>

                      <div className="flex space-x-2 justify-end">
                        <Button size="sm" variant="outline">View Profile</Button>
                        <Button size="sm" className="bg-gradient-primary">Assign Case</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Assignments Tab */}
          <TabsContent value="assignments" className="space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Create Assignment</CardTitle>
                <CardDescription>Assign a case to a specialist lawyer</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="case-select">Select Case</Label>
                    <Select value={selectedCase} onValueChange={setSelectedCase}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a case to assign" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingCases.map((caseItem) => (
                          <SelectItem key={caseItem.id} value={caseItem.id}>
                            {caseItem.id} - {caseItem.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="lawyer-select">Select Lawyer</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a lawyer" />
                      </SelectTrigger>
                      <SelectContent>
                        {lawyers.map((lawyer) => (
                          <SelectItem key={lawyer.id} value={lawyer.id}>
                            {lawyer.name} - {lawyer.specializations.join(", ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Assignment Summary</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Case: {selectedCase || "No case selected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This will send a case brief to the selected lawyer and request a proposal.
                  </p>
                </div>

                <Button className="w-full bg-gradient-primary">
                  Create Assignment & Request Proposal
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Total Clients</p>
                  <p className="text-2xl font-bold">1,247</p>
                  <p className="text-xs text-success">+15% this month</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <Scale className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Active Lawyers</p>
                  <p className="text-2xl font-bold">23</p>
                  <p className="text-xs text-success">+2 this month</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto text-success mb-2" />
                  <p className="text-sm text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">94.2%</p>
                  <p className="text-xs text-success">+1.2% this month</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <Clock className="h-8 w-8 mx-auto text-accent mb-2" />
                  <p className="text-sm text-muted-foreground">Avg. Assignment Time</p>
                  <p className="text-2xl font-bold">3.2h</p>
                  <p className="text-xs text-success">-0.8h this month</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-success mb-2" />
                  <p className="text-sm text-muted-foreground">Platform Revenue</p>
                  <p className="text-2xl font-bold">$8.4K</p>
                  <p className="text-xs text-success">+12.5% this month</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <FileText className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Cases This Month</p>
                  <p className="text-2xl font-bold">45</p>
                  <p className="text-xs text-success">+18% vs last month</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Platform Configuration</CardTitle>
                <CardDescription>Configure global platform settings and policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="holdback">Holdback Percentage (%)</Label>
                    <Input id="holdback" defaultValue="50" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Percentage held until case completion
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="platform-fee">Platform Fee (%)</Label>
                    <Input id="platform-fee" defaultValue="10" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="supported-langs">Supported Languages</Label>
                  <Input id="supported-langs" defaultValue="EN,AR,DE" />
                </div>

                <div>
                  <Label htmlFor="jurisdictions">Default Jurisdictions</Label>
                  <Input id="jurisdictions" defaultValue="Egypt, UAE, Saudi Arabia, Canada, USA, Germany" />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="file-limit">File Size Limit (MB)</Label>
                    <Input id="file-limit" defaultValue="25" />
                  </div>
                  <div>
                    <Label htmlFor="admin-email">Admin Email</Label>
                    <Input id="admin-email" defaultValue="admin@legalconnect.com" />
                  </div>
                </div>

                <Button className="bg-gradient-primary">Save Configuration</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;