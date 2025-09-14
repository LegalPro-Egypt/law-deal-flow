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
  Send
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ClientDashboard = () => {
  const [newMessage, setNewMessage] = useState("");

  // Mock data - would come from Supabase
  const caseData = {
    id: "CASE-2024-001",
    title: "Divorce Proceedings - Smith vs Smith",
    category: "Family Law",
    status: "In Progress",
    urgency: "Medium",
    assignedLawyer: {
      name: "Sarah Johnson",
      specialization: "Family Law",
      rating: 4.8,
      avatar: "/placeholder-avatar.jpg"
    },
    timeline: [
      { date: "2024-01-15", event: "Case submitted", status: "completed" },
      { date: "2024-01-16", event: "Lawyer assigned", status: "completed" },
      { date: "2024-01-17", event: "Proposal received", status: "completed" },
      { date: "2024-01-18", event: "Consultation fee paid", status: "completed" },
      { date: "2024-01-20", event: "Initial consultation", status: "current" },
      { date: "2024-01-25", event: "Document review", status: "pending" },
      { date: "2024-02-01", event: "Filing deadline", status: "pending" }
    ],
    payments: [
      { type: "Consultation Fee", amount: "$500", status: "Paid", date: "2024-01-18" },
      { type: "Remaining Fee", amount: "$2,000", status: "Authorized", date: "2024-01-18" }
    ]
  };

  const messages = [
    {
      sender: "lawyer",
      name: "Sarah Johnson",
      time: "2 hours ago",
      message: "I've reviewed your documents. The marriage certificate looks good, but I'll need the financial statements updated with current values. Can you provide the most recent bank statements?",
      type: "text"
    },
    {
      sender: "client",
      name: "You",
      time: "1 hour ago", 
      message: "I'll get those statements from the bank tomorrow. Should I also include the investment account details?",
      type: "text"
    },
    {
      sender: "lawyer",
      name: "Sarah Johnson", 
      time: "30 minutes ago",
      message: "Yes, please include all investment accounts. Also, I'm scheduling our next consultation for Friday at 2 PM. Does that work for you?",
      type: "text"
    }
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
              <h1 className="text-3xl font-bold mb-2">{caseData.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{caseData.id}</Badge>
                <Badge className="bg-primary">{caseData.category}</Badge>
                <Badge variant="secondary">{caseData.urgency} Priority</Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2 mt-4 lg:mt-0">
              <div className={`w-3 h-3 rounded-full ${
                caseData.status === 'In Progress' ? 'bg-accent' : 'bg-success'
              }`} />
              <span className="font-medium">{caseData.status}</span>
            </div>
          </div>

          {/* Lawyer Info Card */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-lg font-semibold">SJ</span>
                </div>
                <div>
                  <CardTitle className="text-lg">{caseData.assignedLawyer.name}</CardTitle>
                  <CardDescription>{caseData.assignedLawyer.specialization} • ⭐ {caseData.assignedLawyer.rating}/5.0</CardDescription>
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
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
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
                    {caseData.timeline.map((item, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          item.status === 'completed' ? 'bg-success' :
                          item.status === 'current' ? 'bg-accent' : 'bg-muted'
                        }`} />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className={`font-medium ${
                              item.status === 'current' ? 'text-accent' : ''
                            }`}>
                              {item.event}
                            </span>
                            <span className="text-sm text-muted-foreground">{item.date}</span>
                          </div>
                        </div>
                        {item.status === 'completed' && (
                          <CheckCircle className="h-4 w-4 text-success" />
                        )}
                        {item.status === 'current' && (
                          <Clock className="h-4 w-4 text-accent" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
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
                </CardContent>
              </Card>
            </div>
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
                  {messages.map((msg, index) => (
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
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
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
                    <Button size="sm" className="bg-gradient-primary">
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
                <div className="grid gap-4">
                  {[
                    { name: "Marriage Certificate.pdf", size: "1.2 MB", uploaded: "2024-01-15", status: "verified" },
                    { name: "Financial Statement.pdf", size: "856 KB", uploaded: "2024-01-15", status: "verified" },
                    { name: "Bank Statement Jan 2024.pdf", size: "2.1 MB", uploaded: "2024-01-20", status: "pending" },
                    { name: "Investment Portfolio.pdf", size: "1.8 MB", uploaded: "2024-01-22", status: "pending" }
                  ].map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-muted-foreground">{doc.size} • Uploaded {doc.uploaded}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={doc.status === 'verified' ? 'default' : 'secondary'}>
                          {doc.status}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                  <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground mb-2">Drop files here or click to upload</p>
                  <Button variant="outline" size="sm">Choose Files</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle>Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {caseData.payments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{payment.type}</p>
                        <p className="text-sm text-muted-foreground">{payment.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">{payment.amount}</p>
                        <Badge variant={payment.status === 'Paid' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="bg-gradient-card shadow-card">
                <CardHeader>
                  <CardTitle>Payment Protection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
                      <h4 className="font-medium text-success mb-2">Escrow Protection Active</h4>
                      <p className="text-sm text-muted-foreground">
                        Your remaining fee ($2,000) is held in escrow. Funds will be released to the lawyer only after case completion and your approval.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Consultation Fee</span>
                        <span className="text-success">✓ Paid</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Remaining Fee (Escrow)</span>
                        <span className="text-accent">⏳ Secured</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Platform Fee (10%)</span>
                        <span>Included</span>
                      </div>
                    </div>
                    <Button className="w-full" variant="outline">
                      Download Invoice
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientDashboard;