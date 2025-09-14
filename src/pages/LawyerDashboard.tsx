import { useState } from "react";
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

const LawyerDashboard = () => {
  const [proposalData, setProposalData] = useState({
    consultationFee: "500",
    remainingFee: "2000", 
    timeline: "2-3 weeks",
    scope: ""
  });

  // Mock data - would come from Supabase
  const cases = [
    {
      id: "CASE-2024-001",
      client: "John Smith",
      title: "Divorce Proceedings",
      category: "Family Law",
      status: "In Progress",
      urgency: "Medium",
      lastMessage: "2 hours ago",
      consultationFee: "$500",
      remainingFee: "$2,000",
      stage: "Document Review"
    },
    {
      id: "CASE-2024-002", 
      client: "Maria Garcia",
      title: "Visa Application Appeal",
      category: "Immigration",
      status: "Proposal Pending",
      urgency: "High",
      lastMessage: "1 day ago",
      consultationFee: "$300",
      remainingFee: "$1,500",
      stage: "Awaiting Client Response"
    },
    {
      id: "CASE-2024-003",
      client: "Ahmed Hassan", 
      title: "Property Purchase Contract",
      category: "Real Estate",
      status: "Completed",
      urgency: "Low",
      lastMessage: "1 week ago",
      consultationFee: "$400",
      remainingFee: "$1,200",
      stage: "Case Closed"
    }
  ];

  const payouts = [
    { date: "2024-01-15", amount: "$600", case: "CASE-2024-003", status: "Released", type: "Consultation Fee" },
    { date: "2024-01-20", amount: "$1,200", case: "CASE-2024-003", status: "Released", type: "Remaining Fee" },
    { date: "2024-01-22", amount: "$500", case: "CASE-2024-001", status: "Pending", type: "Consultation Fee" },
    { date: "2024-01-25", amount: "$2,000", case: "CASE-2024-001", status: "Held in Escrow", type: "Remaining Fee" }
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
              <Badge variant="secondary" className="ml-2">Lawyer Portal</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <Badge className="bg-success">⭐ 4.8 Rating</Badge>
              <Button variant="ghost" size="sm">Settings</Button>
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
                  <p className="text-sm font-medium text-muted-foreground">Active Cases</p>
                  <p className="text-3xl font-bold">3</p>
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
                  <p className="text-3xl font-bold">$2.5K</p>
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
                  <p className="text-3xl font-bold">$8.2K</p>
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
                  <p className="text-3xl font-bold">2.1h</p>
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
              {cases.map((caseItem, index) => (
                <Card key={index} className="bg-gradient-card shadow-card">
                  <CardContent className="p-6">
                    <div className="grid lg:grid-cols-4 gap-4 items-center">
                      <div>
                        <h3 className="font-semibold mb-1">{caseItem.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">Client: {caseItem.client}</p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">{caseItem.id}</Badge>
                          <Badge className="text-xs">{caseItem.category}</Badge>
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <p className="text-sm font-medium mb-1">{caseItem.stage}</p>
                        <div className={`w-3 h-3 rounded-full mx-auto ${
                          caseItem.status === 'Completed' ? 'bg-success' :
                          caseItem.status === 'In Progress' ? 'bg-accent' : 'bg-warning'
                        }`} />
                      </div>

                      <div className="text-center">
                        <p className="text-lg font-bold">{caseItem.consultationFee}</p>
                        <p className="text-sm text-muted-foreground">+ {caseItem.remainingFee}</p>
                        <Badge variant="secondary" className="text-xs">{caseItem.urgency}</Badge>
                      </div>

                      <div className="flex space-x-2 justify-end">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button size="sm" className="bg-gradient-primary">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Proposals Tab */}
          <TabsContent value="proposals" className="space-y-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Create New Proposal</CardTitle>
                <CardDescription>
                  Draft a proposal for case: CASE-2024-004 - Employment Contract Review
                </CardDescription>
              </CardHeader>
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
                  <Button className="flex-1 bg-gradient-primary">
                    <Send className="h-4 w-4 mr-2" />
                    Send Proposal
                  </Button>
                  <Button variant="outline">Save Draft</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payouts Tab */}
          <TabsContent value="payouts" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6 mb-6">
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <DollarSign className="h-8 w-8 mx-auto text-success mb-2" />
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                  <p className="text-2xl font-bold">$18,400</p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <Clock className="h-8 w-8 mx-auto text-accent mb-2" />
                  <p className="text-sm text-muted-foreground">Pending Release</p>
                  <p className="text-2xl font-bold">$2,500</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">Available Now</p>
                  <p className="text-2xl font-bold">$1,800</p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Payout History</CardTitle>
                <CardDescription>Track your earnings and payment releases</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payouts.map((payout, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{payout.type}</p>
                        <p className="text-sm text-muted-foreground">{payout.case} • {payout.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{payout.amount}</p>
                        <Badge variant={
                          payout.status === 'Released' ? 'default' :
                          payout.status === 'Pending' ? 'secondary' : 'outline'
                        }>
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
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