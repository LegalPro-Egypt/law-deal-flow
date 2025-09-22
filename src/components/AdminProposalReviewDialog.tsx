import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText, Clock, DollarSign, Scale, CheckCircle, XCircle, User, Briefcase, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Proposal {
  id: string;
  case_id: string;
  lawyer_id: string;
  client_id: string;
  consultation_fee: number;
  remaining_fee: number;
  total_fee: number;
  timeline: string;
  strategy: string;
  generated_content: string;
  status: string;
  created_at: string;
  viewed_at?: string;
  metadata?: any;
}

interface AdminProposalReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal;
  onProposalUpdate: () => void;
  caseDetails?: any;
  lawyerDetails?: any;
}

export const AdminProposalReviewDialog = ({
  open,
  onOpenChange,
  proposal,
  onProposalUpdate,
  caseDetails,
  lawyerDetails,
}: AdminProposalReviewDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Return early if no proposal is provided
  if (!proposal) {
    return null;
  }

  const handleApproveProposal = async () => {
    setLoading(true);
    try {
      // Get current user ID first
      const { data: { user } } = await supabase.auth.getUser();
      
      // Update proposal status to sent (awaiting client response)
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({
          status: 'sent',
          metadata: { 
            ...proposal.metadata, // Preserve existing metadata
            admin_notes: adminNotes,
            admin_approved_at: new Date().toISOString(),
            admin_approved_by: user?.id
          }
        })
        .eq('id', proposal.id);

      if (proposalError) throw proposalError;

      // Update case status
      const { error: caseError } = await supabase
        .from('cases')
        .update({
          status: 'proposal_sent',
          updated_at: new Date().toISOString()
        })
        .eq('id', proposal.case_id);

      if (caseError) throw caseError;

      // Create notification for client
      const { error: clientNotificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: proposal.client_id,
          case_id: proposal.case_id,
          type: 'proposal_received',
          title: 'New Legal Proposal Received',
          message: 'You have received a new legal proposal for your case. Please review and respond.',
          action_required: true,
          metadata: { 
            proposal_id: proposal.id,
            total_fee: proposal.total_fee
          }
        });

      if (clientNotificationError) throw clientNotificationError;

      // Create notification for lawyer
      const { error: lawyerNotificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: proposal.lawyer_id,
          case_id: proposal.case_id,
          type: 'proposal_approved',
          title: 'Proposal Approved',
          message: 'Your proposal has been approved by the admin and sent to the client.',
          action_required: false,
          metadata: { 
            proposal_id: proposal.id,
            admin_notes: adminNotes
          }
        });

      if (lawyerNotificationError) throw lawyerNotificationError;

      toast.success('Proposal approved and sent to client successfully!');

      onProposalUpdate();
      onOpenChange(false);
      setAdminNotes("");

    } catch (error) {
      console.error('Error approving proposal:', error);
      toast.error('Error approving proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleRejectProposal = async () => {
    if (!adminNotes.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      // Update proposal status to rejected
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({
          status: 'rejected',
          metadata: { 
            admin_notes: adminNotes,
            rejected_at: new Date().toISOString(),
            rejected_by: (await supabase.auth.getUser()).data.user?.id
          }
        })
        .eq('id', proposal.id);

      if (proposalError) throw proposalError;

      // Update case status back to lawyer_assigned
      const { error: caseError } = await supabase
        .from('cases')
        .update({
          status: 'lawyer_assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', proposal.case_id);

      if (caseError) throw caseError;

      // Create notification for lawyer
      const { error: lawyerNotificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: proposal.lawyer_id,
          case_id: proposal.case_id,
          type: 'proposal_rejected',
          title: 'Proposal Requires Revision',
          message: `Your proposal needs revision. Admin feedback: ${adminNotes}`,
          action_required: true,
          metadata: { 
            proposal_id: proposal.id,
            admin_notes: adminNotes
          }
        });

      if (lawyerNotificationError) throw lawyerNotificationError;

      toast.success('Proposal rejected. Lawyer has been notified.');

      onProposalUpdate();
      onOpenChange(false);
      setAdminNotes("");

    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast.error('Error rejecting proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProposal = async () => {
    setLoading(true);
    try {
      // Delete the proposal
      const { error: deleteError } = await supabase
        .from('proposals')
        .delete()
        .eq('id', proposal.id);

      if (deleteError) throw deleteError;

      // Revert case status back to lawyer_assigned
      const { error: caseError } = await supabase
        .from('cases')
        .update({
          status: 'lawyer_assigned',
          updated_at: new Date().toISOString()
        })
        .eq('id', proposal.case_id);

      if (caseError) throw caseError;

      // Clean up any related notifications
      const { error: notificationError } = await supabase
        .from('notifications')
        .delete()
        .eq('case_id', proposal.case_id)
        .in('type', ['proposal_received', 'proposal_approved', 'proposal_rejected']);

      if (notificationError) {
        console.warn('Failed to clean up notifications:', notificationError);
      }

      toast.success('Proposal deleted successfully and case status reverted');

      onProposalUpdate();
      onOpenChange(false);
      setShowDeleteConfirm(false);

    } catch (error) {
      console.error('Error deleting proposal:', error);
      toast.error('Error deleting proposal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Admin Proposal Review
            <Badge variant="secondary">Pending Approval</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Case & Lawyer Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4" />
                  Case Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-medium">Case:</span> {caseDetails?.title || 'Unknown Case'}</p>
                <p><span className="font-medium">Category:</span> {caseDetails?.category || 'N/A'}</p>
                <p><span className="font-medium">Client:</span> {caseDetails?.client_name || 'N/A'}</p>
                <p><span className="font-medium">Case Number:</span> {caseDetails?.case_number || 'N/A'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  Lawyer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><span className="font-medium">Name:</span> {lawyerDetails?.first_name} {lawyerDetails?.last_name}</p>
                <p><span className="font-medium">Firm:</span> {lawyerDetails?.law_firm || 'N/A'}</p>
                <p><span className="font-medium">Experience:</span> {lawyerDetails?.years_experience || 'N/A'} years</p>
                <p><span className="font-medium">Email:</span> {lawyerDetails?.email}</p>
              </CardContent>
            </Card>
          </div>

          {/* Fee Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Fee Structure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="font-semibold text-lg">
                    ${proposal?.consultation_fee?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Consultation Fee</div>
                </div>
                <div className="text-center p-4 bg-secondary/5 rounded-lg">
                  <div className="font-semibold text-lg">
                    ${proposal?.remaining_fee?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Remaining Fee</div>
                </div>
                <div className="text-center p-4 bg-accent/5 rounded-lg">
                  <div className="font-semibold text-lg text-primary">
                    ${proposal?.total_fee?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Fee</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{proposal?.timeline || 'No timeline specified'}</p>
            </CardContent>
          </Card>

          {/* Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Legal Strategy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{proposal?.strategy || 'No strategy specified'}</p>
            </CardContent>
          </Card>

          {/* Full Proposal Content */}
          <Card>
            <CardHeader>
              <CardTitle>AI-Generated Proposal Content</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed bg-muted/50 p-4 rounded-md">
                  {proposal?.generated_content || 'No proposal content available'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Admin Review Section */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="text-primary">Admin Review & Decision</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="admin-notes">Admin Notes (required for rejection)</Label>
                <Textarea
                  id="admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Provide feedback, suggestions, or reasons for approval/rejection..."
                  rows={4}
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  onClick={handleApproveProposal}
                  disabled={loading}
                  className="w-full sm:flex-1 bg-success hover:bg-success/90"
                  size="lg"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Send to Client
                </Button>
                
                <Button
                  onClick={handleRejectProposal}
                  disabled={loading || !adminNotes.trim()}
                  variant="destructive"
                  className="w-full sm:flex-1"
                  size="lg"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject & Return to Lawyer
                </Button>

                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={loading}
                  variant="outline"
                  className="w-full sm:w-auto border-destructive text-destructive hover:bg-destructive hover:text-white"
                  size="lg"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Proposal Info */}
          <div className="text-xs text-muted-foreground text-center">
            Proposal created on: {proposal ? new Date(proposal.created_at).toLocaleDateString() : 'N/A'} at {proposal ? new Date(proposal.created_at).toLocaleTimeString() : 'N/A'}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Proposal Permanently</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the proposal and revert the case status back to "lawyer_assigned". 
                The lawyer will be able to create a new proposal. This action cannot be undone.
                Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                Cancel
              </AlertDialogCancel>
              <Button 
                type="button" 
                variant="destructive" 
                onClick={handleDeleteProposal}
                disabled={loading}
              >
                Delete Permanently
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};