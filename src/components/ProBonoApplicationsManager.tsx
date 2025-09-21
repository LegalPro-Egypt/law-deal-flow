import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Heart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  ChevronDown, 
  ChevronUp,
  User,
  Phone,
  Mail,
  DollarSign,
  Users,
  FileText,
  AlertTriangle,
  Calendar
} from "lucide-react";

interface ProBonoApplication {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  financial_info: any;
  case_details: any;
  status: string;
  admin_notes: string | null;
  admin_response: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export const ProBonoApplicationsManager = () => {
  const { toast } = useToast();
  const [applications, setApplications] = useState<ProBonoApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<ProBonoApplication | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [adminResponse, setAdminResponse] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [expandedApps, setExpandedApps] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pro_bono_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error('Error fetching pro bono applications:', error);
      toast({
        title: "Error",
        description: "Failed to fetch pro bono applications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (application: ProBonoApplication) => {
    setSelectedApplication(application);
    setAdminResponse(application.admin_response || "");
    setAdminNotes(application.admin_notes || "");
    setShowDetailsDialog(true);
  };

  const handleUpdateStatus = async (applicationId: string, newStatus: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        status: newStatus,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (adminResponse.trim()) {
        updateData.admin_response = adminResponse.trim();
      }

      if (adminNotes.trim()) {
        updateData.admin_notes = adminNotes.trim();
      }

      const { error } = await supabase
        .from('pro_bono_applications')
        .update(updateData)
        .eq('id', applicationId);

      if (error) throw error;

      // Send email notification to applicant
      if (selectedApplication) {
        try {
          await supabase.functions.invoke('send-probono-response', {
            body: {
              email: selectedApplication.email,
              fullName: selectedApplication.full_name,
              caseTitle: selectedApplication.case_details?.title || 'N/A',
              status: newStatus,
              adminResponse: adminResponse.trim(),
            }
          });
        } catch (emailError) {
          console.error('Failed to send notification email:', emailError);
          // Don't fail the status update if email fails
        }
      }

      toast({
        title: "Application Updated",
        description: `Application ${newStatus === 'approved' ? 'approved' : 'rejected'} successfully`,
      });

      setShowDetailsDialog(false);
      await fetchApplications();
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application",
        variant: "destructive",
      });
    }
  };

  const toggleExpansion = (appId: string) => {
    const newExpanded = new Set(expandedApps);
    if (newExpanded.has(appId)) {
      newExpanded.delete(appId);
    } else {
      newExpanded.add(appId);
    }
    setExpandedApps(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-success text-success-foreground';
      case 'rejected': return 'bg-destructive text-destructive-foreground';
      case 'under_review': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-warning text-warning-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredApplications = applications.filter(app => {
    if (statusFilter === "all") return true;
    return app.status === statusFilter;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="h-6 w-6 text-success" />
          <h2 className="text-2xl font-bold">Pro Bono Applications</h2>
        </div>
        <div className="text-center py-8">Loading applications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Heart className="h-6 w-6 text-success" />
          <h2 className="text-2xl font-bold">Pro Bono Applications</h2>
          <Badge variant="secondary">{applications.length} total</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Filter:</span>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1 border rounded-md bg-background"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredApplications.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {statusFilter === "all" ? "No pro bono applications yet" : `No ${statusFilter} applications`}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredApplications.map((application) => (
            <Card key={application.id} className="bg-gradient-card shadow-card">
              <Collapsible>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Heart className="h-5 w-5 text-success" />
                      <div>
                        <CardTitle className="text-lg">{application.case_details?.title || 'Untitled Case'}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4" />
                          {application.full_name}
                          <span className="text-xs text-muted-foreground">
                            • {formatDate(application.created_at)}
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getUrgencyColor(application.case_details?.urgency || 'medium')}>
                        {application.case_details?.urgency || 'medium'}
                      </Badge>
                      <Badge className={getStatusColor(application.status)}>
                        {application.status.replace('_', ' ')}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(application)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <CollapsibleTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpansion(application.id)}
                        >
                          {expandedApps.has(application.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                  </div>
                </CardHeader>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Email:</span>
                          <span>{application.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Phone:</span>
                          <span>{application.phone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Income:</span>
                          <span>{application.financial_info?.monthlyIncome || 'N/A'} EGP/month</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Family Size:</span>
                          <span>{application.financial_info?.familySize || 'N/A'}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Category:</span>
                          <span className="capitalize">{application.case_details?.category || 'N/A'}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-muted-foreground">Previous Help:</span>
                          <span className="ml-2 capitalize">{application.case_details?.previousLegalHelp || 'N/A'}</span>
                        </div>
                        {application.reviewed_at && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Reviewed:</span>
                            <span>{formatDate(application.reviewed_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                      <p className="text-sm text-muted-foreground font-medium mb-1">Case Description:</p>
                      <p className="text-sm line-clamp-3">{application.case_details?.description || 'N/A'}</p>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))
        )}
      </div>

      {/* Application Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-success" />
              Pro Bono Application Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <h3 className="text-lg font-semibold">{selectedApplication.case_details?.title || 'N/A'}</h3>
                  <p className="text-muted-foreground">{selectedApplication.full_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getUrgencyColor(selectedApplication.case_details?.urgency || 'medium')}>
                    {selectedApplication.case_details?.urgency || 'medium'}
                  </Badge>
                  <Badge className={getStatusColor(selectedApplication.status)}>
                    {selectedApplication.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Email:</span>
                      <p>{selectedApplication.email}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Phone:</span>
                      <p>{selectedApplication.phone}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Applied:</span>
                      <p>{formatDate(selectedApplication.created_at)}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Financial Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Monthly Income:</span>
                      <p>{selectedApplication.financial_info?.monthlyIncome || 'N/A'} EGP</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Family Size:</span>
                      <p>{selectedApplication.financial_info?.familySize || 'N/A'} members</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Has Assets:</span>
                      <p className="capitalize">{selectedApplication.financial_info?.hasAssets || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Case Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Case Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Category:</span>
                      <p className="capitalize">{selectedApplication.case_details?.category || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-muted-foreground">Previous Legal Help:</span>
                      <p className="capitalize">{selectedApplication.case_details?.previousLegalHelp || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Case Description:</span>
                    <p className="mt-1 p-3 bg-muted/30 rounded-lg">{selectedApplication.case_details?.description || 'N/A'}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">Why They Need Pro Bono Help:</span>
                    <p className="mt-1 p-3 bg-muted/30 rounded-lg">{selectedApplication.case_details?.whyNeedHelp || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Notes */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Admin Notes (Internal)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this application..."
                    className="min-h-20"
                  />
                </CardContent>
              </Card>

              {/* Admin Response */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Response to Applicant</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                    placeholder="Write a response that will be sent to the applicant..."
                    className="min-h-32"
                  />
                </CardContent>
              </Card>

              {/* Action Buttons */}
              {selectedApplication.status === 'pending' && (
                <div className="flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedApplication.id, 'under_review')}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Mark Under Review
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleUpdateStatus(selectedApplication.id, 'rejected')}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                  <Button
                    className="bg-success hover:bg-success/90"
                    onClick={() => handleUpdateStatus(selectedApplication.id, 'approved')}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};