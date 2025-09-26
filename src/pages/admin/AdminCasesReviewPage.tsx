import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminData } from "@/hooks/useAdminData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ClipboardCheck, 
  Eye, 
  Search, 
  XCircle, 
  Trash2, 
  CheckCircle,
  Ban
} from "lucide-react";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CaseDetailsDialog } from "@/components/CaseDetailsDialog";
import { AssignLawyerDialog } from "@/components/AssignLawyerDialog";
import { formatCaseStatus } from "@/utils/caseUtils";

export default function AdminCasesReviewPage() {
  const { toast } = useToast();
  const { 
    cases, 
    loading, 
    deleteCase, 
    denyCaseAndDelete, 
    refreshData 
  } = useAdminData();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showCaseDetails, setShowCaseDetails] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<string | null>(null);
  const [showCaseDeleteConfirm, setShowCaseDeleteConfirm] = useState(false);
  const [caseToDeny, setCaseToDeny] = useState<string | null>(null);
  const [showCaseDenyConfirm, setShowCaseDenyConfirm] = useState(false);
  const [denyReason, setDenyReason] = useState("");
  const [showAssignLawyerDialog, setShowAssignLawyerDialog] = useState(false);
  const [caseToAssign, setCaseToAssign] = useState<{id: string, category?: string} | null>(null);

  // Filter cases that need review (submitted status)
  const reviewCases = cases.filter(c => c.status === 'submitted');
  
  const filteredCases = reviewCases.filter(caseItem => {
    const searchLower = searchTerm.toLowerCase();
    return (
      caseItem.title.toLowerCase().includes(searchLower) ||
      caseItem.client_name.toLowerCase().includes(searchLower) ||
      caseItem.client_email.toLowerCase().includes(searchLower) ||
      caseItem.category.toLowerCase().includes(searchLower) ||
      caseItem.case_number.toLowerCase().includes(searchLower)
    );
  });

  const handleViewCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setShowCaseDetails(true);
  };

  const handleAssignLawyer = (caseId: string, category?: string) => {
    setCaseToAssign({ id: caseId, category });
    setShowAssignLawyerDialog(true);
  };

  const handleDeleteCase = (caseId: string) => {
    setCaseToDelete(caseId);
    setShowCaseDeleteConfirm(true);
  };

  const handleDenyCase = (caseId: string) => {
    setCaseToDeny(caseId);
    setShowCaseDenyConfirm(true);
  };

  const confirmDeleteCase = async () => {
    if (!caseToDelete) return;
    
    try {
      await deleteCase(caseToDelete);
      setShowCaseDeleteConfirm(false);
      setCaseToDelete(null);
    } catch (error) {
      // Error is already handled in deleteCase
    }
  };

  const confirmDenyCase = async () => {
    if (!caseToDeny) return;
    
    try {
      await denyCaseAndDelete(caseToDeny, denyReason);
      setShowCaseDenyConfirm(false);
      setCaseToDeny(null);
      setDenyReason("");
    } catch (error) {
      // Error is already handled in denyCaseAndDelete
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency.toLowerCase()) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cases for Review</h1>
          <p className="text-muted-foreground">
            Review and process submitted cases awaiting approval
          </p>
        </div>
        <Button onClick={refreshData} variant="outline">
          Refresh Data
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Badge variant="secondary">
          {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''} for review
        </Badge>
      </div>

      {filteredCases.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Cases for Review</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm ? "No cases match your search criteria." : "All submitted cases have been reviewed."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredCases.map((caseItem) => (
            <Card key={caseItem.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{caseItem.title}</CardTitle>
                    <Badge variant={getUrgencyColor(caseItem.urgency)}>
                      {caseItem.urgency} priority
                    </Badge>
                    <Badge variant="outline">{caseItem.category}</Badge>
                    <Badge variant="secondary">{caseItem.language.toUpperCase()}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewCase(caseItem.id)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAssignLawyer(caseItem.id, caseItem.category)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Assign Lawyer
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDenyCase(caseItem.id)}
                    >
                      <Ban className="h-4 w-4 mr-1" />
                      Deny
                    </Button>
                    <AlertDialog open={showCaseDeleteConfirm && caseToDelete === caseItem.id} onOpenChange={setShowCaseDeleteConfirm}>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCase(caseItem.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Case</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to permanently delete this case? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <Button variant="destructive" onClick={confirmDeleteCase}>
                            Delete
                          </Button>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <CardDescription>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Case #{caseItem.case_number}</span>
                    <span>Client: {caseItem.client_name}</span>
                    <span>Status: {formatCaseStatus(caseItem.status)}</span>
                    <span>Created: {new Date(caseItem.created_at).toLocaleDateString()}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {caseItem.description.length > 200 
                    ? caseItem.description.slice(0, 200) + '...' 
                    : caseItem.description}
                </p>
                {caseItem.ai_summary && (
                  <div className="mt-3 p-3 bg-muted rounded">
                    <p className="text-sm">
                      <span className="font-medium">AI Summary:</span> {caseItem.ai_summary.slice(0, 150)}...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Case Details Dialog */}
      {selectedCaseId && showCaseDetails && (
        <CaseDetailsDialog
          caseId={selectedCaseId}
          isOpen={showCaseDetails}
          onClose={() => {
            setShowCaseDetails(false);
            setSelectedCaseId(null);
          }}
        />
      )}

      {/* Assign Lawyer Dialog */}
      {caseToAssign && (
        <AssignLawyerDialog
          caseId={caseToAssign.id}
          isOpen={showAssignLawyerDialog}
          onClose={() => {
            setShowAssignLawyerDialog(false);
            setCaseToAssign(null);
          }}
          onSuccess={() => {
            setShowAssignLawyerDialog(false);
            setCaseToAssign(null);
            refreshData();
          }}
        />
      )}

      {/* Deny Case Dialog */}
      <Dialog open={showCaseDenyConfirm} onOpenChange={setShowCaseDenyConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Case</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Please provide a reason for denying this case. This will be recorded for audit purposes.
            </p>
            <Textarea
              placeholder="Enter denial reason..."
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCaseDenyConfirm(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDenyCase}
              disabled={!denyReason.trim()}
            >
              Deny Case
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}