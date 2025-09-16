import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Scale, 
  MessageSquare, 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Send,
  Plus,
  TrendingUp
} from "lucide-react";
import { useLawyerData } from "@/hooks/useLawyerData";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

const LawyerDashboard = () => {
  const [proposalData, setProposalData] = useState({
    consultationFee: "500",
    remainingFee: "2000", 
    timeline: "2-3 weeks",
    scope: ""
  });
  
  const { signOut } = useAuth();
  const { 
    assignedCases, 
    stats, 
    loading, 
    sendProposal, 
    sendMessage 
  } = useLawyerData();

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
      case 'proposal_sent':
        return 'bg-primary';
      default:
        return 'bg-muted';
    }
  };

  const handleSendProposal = async (caseId: string) => {
    await sendProposal(caseId, {
      consultation_fee: parseInt(proposalData.consultationFee),
      remaining_fee: parseInt(proposalData.remainingFee),
      timeline: proposalData.timeline,
      scope: proposalData.scope
    });
    
    // Reset form
    setProposalData({
      consultationFee: "500",
      remainingFee: "2000",
      timeline: "2-3 weeks", 
      scope: ""
    });
  };

  if (loading) {
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
            </div>
          </div>
        </header>
        <div className="container mx-auto px-4 py-8 space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            {Array.from({length: 4}).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
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
            <Link to="/?force=true" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <Scale className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">LegalConnect</span>
              <Badge variant="secondary" className="ml-2">Lawyer Portal</Badge>
            </Link>
            <div className="flex items-center space-x-4">
              <Badge className="bg-success">⭐ Verified Lawyer</Badge>
              <Button variant="ghost" size="sm">Settings</Button>
              <Button variant="ghost" size="sm" onClick={signOut}>Sign Out</Button>
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
                  <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                  <p className="text-3xl font-bold">{stats.activeCases}</p>
                </div>
                <FileText className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pending Payouts</p>
                  <p className="text-3xl font-bold">${(stats.pendingPayouts || 0).toLocaleString()}</p>
                </div>
                <DollarSign className="h-8 w-8 text-accent" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Month</p>
                  <p className="text-3xl font-bold">${(stats.monthlyEarnings || 0).toLocaleString()}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg. Response</p>
                  <p className="text-3xl font-bold">{stats.avgResponseTime}</p>
                </div>
                <Clock className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="cases" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cases">My Cases</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
            <TabsTrigger value="payouts">Payouts</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          {/* Cases Tab */}
          <TabsContent value="cases" className="space-y-6">
            <div className="grid gap-4">
              {assignedCases.length > 0 ? assignedCases.map((caseItem, index) => (
                <Card key={index} className="bg-gradient-card shadow-card">
                  <CardContent className="p-6">
                    <div className="grid lg:grid-cols-4 gap-4 items-center">
                      <div>
                        <h3 className="font-semibold mb-1">{caseItem.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">Client: {caseItem.client_name}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{caseItem.case_number}</Badge>
                          <Badge className="text-xs">{caseItem.category}</Badge>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm font-medium mb-1">{caseItem.status.replace('_', ' ')}</p>
                        <div className={`w-3 h-3 rounded-full mx-auto ${getStatusColor(caseItem.status)}`} />
                      </div>

                      <div className="text-center">
                        <p className="text-lg font-bold">
                          {caseItem.consultation_fee ? `$${caseItem.consultation_fee}` : 'Not Set'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          + {caseItem.remaining_fee ? `$${caseItem.remaining_fee}` : 'Not Set'}
                        </p>
                        <Badge variant="secondary" className="text-xs capitalize">{caseItem.urgency}</Badge>
                      </div>

                      <div className="flex space-x-2 justify-end">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-gradient-primary"
                          onClick={() => sendMessage(caseItem.id, "Hello, I wanted to check in on your case.")}
                        >
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )) : (
                <Card className="bg-gradient-card shadow-card">
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No Cases Assigned</h3>
                    <p className="text-muted-foreground">
                      You don't have any assigned cases yet. Cases will appear here once assigned by an admin.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Create New Proposal</CardTitle>
                <CardDescription>
                  {assignedCases.length > 0 
                    ? `Create a proposal for: ${assignedCases.find(c => c.status === 'draft')?.case_number || 'Select a case'}`
                    : 'No cases available for proposals'
                  }
                </CardDescription>
              </CardHeader>
              
              {assignedCases.some(c => c.status === 'draft') ? (
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="consultation-fee">Consultation Fee ($)</Label>
                      <Input
                        id="consultation-fee"
                        value={proposalData.consultationFee}
                        onChange={(e) => setProposalData({...proposalData, consultationFee: e.target.value})}
                        placeholder="500"
                      />
                    </div>
                    <div>
                      <Label htmlFor="remaining-fee">Remaining Fee ($)</Label>
                      <Input
                        id="remaining-fee" 
                        value={proposalData.remainingFee}
                        onChange={(e) => setProposalData({...proposalData, remainingFee: e.target.value})}
                        placeholder="2000"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="timeline">Expected Timeline</Label>
                    <Input
                      id="timeline"
                      value={proposalData.timeline}
                      onChange={(e) => setProposalData({...proposalData, timeline: e.target.value})}
                      placeholder="2-3 weeks"
                    />
                  </div>

                  <div>
                    <Label htmlFor="scope">Scope of Work</Label>
                    <Textarea
                      id="scope"
                      value={proposalData.scope}
                      onChange={(e) => setProposalData({...proposalData, scope: e.target.value})}
                      placeholder="Describe the scope of work, deliverables, and milestones..."
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="p-4 bg-muted/50 rounded-lg">
                    <h4 className="font-medium mb-2">Proposal Summary</h4>
                    <div className="text-sm space-y-1">
                      <p>Consultation Fee: ${proposalData.consultationFee}</p>
                      <p>Remaining Fee: ${proposalData.remainingFee}</p>
                      <p>Total Fee: ${(parseInt(proposalData.consultationFee || "0") + parseInt(proposalData.remainingFee || "0")).toLocaleString()}</p>
                      <p>Platform Fee (10%): ${Math.round((parseInt(proposalData.consultationFee || "0") + parseInt(proposalData.remainingFee || "0")) * 0.1)}</p>
                      <p className="font-medium">Your Net Earnings: ${Math.round((parseInt(proposalData.consultationFee || "0") + parseInt(proposalData.remainingFee || "0")) * 0.9)}</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      className="flex-1 bg-gradient-primary"
                      onClick={() => {
                        const draftCase = assignedCases.find(c => c.status === 'draft');
                        if (draftCase) handleSendProposal(draftCase.id);
                      }}
                      disabled={!proposalData.scope.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Proposal
                    </Button>
                    <Button variant="outline">Save Draft</Button>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Cases Need Proposals</h3>
                  <p className="text-muted-foreground">
                    All your assigned cases either already have proposals or are in different stages.
                  </p>
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-success mb-2" />
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold">${(stats.monthlyEarnings * 3 || 0).toLocaleString()}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <Clock className="h-8 w-8 mx-auto text-accent mb-2" />
                  <p className="text-sm text-muted-foreground">Pending Release</p>
                  <p className="text-2xl font-bold">${(stats.pendingPayouts || 0).toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Available Now</p>
                  <p className="text-2xl font-bold">${((stats.monthlyEarnings || 0) * 0.6).toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>Track your earnings and payment releases</CardDescription>
              </CardHeader>
              <CardContent>
                {assignedCases.length > 0 ? (
                  <div className="space-y-3">
                    {assignedCases
                      .filter(c => c.consultation_fee || c.remaining_fee)
                      .map((caseItem, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{caseItem.title}</p>
                            <p className="text-sm text-muted-foreground">{caseItem.case_number} • {formatDate(caseItem.updated_at)}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">
                              ${((caseItem.consultation_fee || 0) + (caseItem.remaining_fee || 0)) * 0.9}
                            </p>
                            <Badge variant={
                              caseItem.status === 'completed' ? 'default' :
                              caseItem.status === 'active' ? 'secondary' : 'outline'
                            }>
                              {caseItem.status === 'completed' ? 'Released' : 
                               caseItem.status === 'active' ? 'Pending' : 'Held in Escrow'}
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <DollarSign className="h-8 w-8 mx-auto mb-2" />
                    <p>No earnings history yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Lawyer Profile</CardTitle>
                <CardDescription>Manage your professional information and specializations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" defaultValue="Sarah Johnson" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" defaultValue="sarah@example.com" disabled />
                  </div>
                </div>

                <div>
                  <Label htmlFor="specializations">Specializations</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Family Law", "Immigration", "Real Estate", "Corporate Law"].map((spec, index) => (
                      <Badge key={index} variant="outline" className="cursor-pointer">
                        {spec} ✓
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    defaultValue="Experienced family law attorney with over 10 years of practice. Specializing in divorce proceedings, child custody, and prenuptial agreements."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="languages">Languages</Label>
                    <Input id="languages" defaultValue="English, Arabic" />
                  </div>
                  <div>
                    <Label htmlFor="availability">Availability</Label>
                    <Input id="availability" defaultValue="Mon-Fri, 9 AM - 6 PM EST" />
                  </div>
                </div>

                <Button className="bg-gradient-primary">Update Profile</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default LawyerDashboard;