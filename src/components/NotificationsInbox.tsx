import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, CheckCircle, Clock, CreditCard, RefreshCw } from "lucide-react";
import { ProposalReviewDialog } from "@/components/ProposalReviewDialog";
import { useNotifications, type Notification, type Proposal } from "@/hooks/useNotifications";
import { useLanguage } from "@/hooks/useLanguage";

interface NotificationsInboxProps {
  activeCaseId?: string;
}

export const NotificationsInbox = ({ activeCaseId }: NotificationsInboxProps) => {
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const { currentLanguage } = useLanguage();
  const navigate = useNavigate();
  const { 
    notifications, 
    proposals, 
    proposalsWithCases,
    loading, 
    unreadCount,
    markAsRead, 
    handleViewProposal: updateProposalStatus,
    refreshData,
    needsPayment
  } = useNotifications();

  // Filter notifications and proposals by active case
  const filteredNotifications = activeCaseId 
    ? notifications.filter(n => (n as any).case_id === activeCaseId)
    : notifications;
    
  const filteredProposalsWithCases = activeCaseId
    ? proposalsWithCases.filter(p => p.case?.id === activeCaseId)
    : proposalsWithCases;

  const handleViewProposal = async (proposalId: string) => {
    await updateProposalStatus(proposalId);
    const proposal = proposals.find(p => p.id === proposalId);
    if (proposal) {
      setSelectedProposal(proposal);
    }
  };

  const handleCompletePayment = (proposalId: string) => {
    const proposalWithCase = proposalsWithCases.find(p => p.id === proposalId);
    if (proposalWithCase && proposalWithCase.case) {
      // Determine payment type and amount based on case status
      const isGracePeriodPayment = proposalWithCase.case.status === 'consultation_completed';
      
      // Calculate remaining payment with additional fees
      const remainingFee = proposalWithCase.remaining_fee || 0;
      const additionalFees = proposalWithCase.total_additional_fees || (remainingFee * 0.11); // 5% + 3% + 3%
      
      const paymentType = isGracePeriodPayment ? 'remaining' : 'consultation';
      const amount = isGracePeriodPayment ? remainingFee + additionalFees : proposalWithCase.consultation_fee;
      
      navigate('/payment', {
        state: {
          paymentData: {
            caseId: proposalWithCase.case.id,
            proposalId: proposalWithCase.id,
            consultationFee: proposalWithCase.consultation_fee,
            remainingFee: remainingFee,
            totalFee: proposalWithCase.final_total_fee || proposalWithCase.total_fee,
            additionalFees: additionalFees,
            lawyerName: proposalWithCase.case.assigned_lawyer_name || 'Your Lawyer',
            caseTitle: proposalWithCase.case.title,
            isRemainingPayment: isGracePeriodPayment
          }
        }
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'proposal_received':
        return <FileText className="h-4 w-4" />;
      case 'proposal_accepted':
      case 'proposal_rejected':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={refreshData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          {currentLanguage === 'ar' ? 'تحديث' : 'Refresh'}
        </Button>
      </div>
      
      {filteredNotifications.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {currentLanguage === 'ar' ? 'لا توجد عروض قانونية بعد' : 'No legal proposals yet'}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border overflow-hidden ${
                !notification.is_read 
                  ? 'bg-primary/5 border-primary/20' 
                  : 'bg-background'
              }`}
            >
              <div className="flex items-start overflow-hidden min-w-0">
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="mb-1">
                    <h4 className="font-medium truncate">{notification.title}</h4>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-1">
                    {notification.message}
                  </p>
                  
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(notification.created_at).toLocaleDateString()}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      {(notification.type === 'proposal_received' || (notification.type === 'general' && (notification as any).metadata?.proposal_id)) && (
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            const proposalId = (notification as any).metadata?.proposal_id;
                            if (proposalId) {
                              handleViewProposal(proposalId);
                              markAsRead(notification.id);
                            }
                          }}
                        >
                          {currentLanguage === 'ar' ? 'مراجعة العرض' : 'View Proposal'}
                        </Button>
                      )}
                      
                      {(() => {
                        const proposalId = (notification as any).metadata?.proposal_id;
                        const proposalWithCase = filteredProposalsWithCases.find(p => p.id === proposalId);
                        if (!proposalWithCase || !needsPayment(proposalWithCase)) return null;
                        
                        const isGracePeriodPayment = proposalWithCase.case?.status === 'consultation_completed';
                        const remainingFee = proposalWithCase.remaining_fee || 0;
                        const additionalFees = proposalWithCase.total_additional_fees || (remainingFee * 0.11);
                        const amount = isGracePeriodPayment ? 
                          remainingFee + additionalFees : 
                          proposalWithCase.consultation_fee;
                        const paymentLabel = isGracePeriodPayment ? 'Complete Final Payment' : 'Complete Payment';
                        const gracePeriodExpires = proposalWithCase.case?.grace_period_expires_at ? 
                          new Date(proposalWithCase.case.grace_period_expires_at) : null;
                        const timeRemaining = gracePeriodExpires ? 
                          Math.max(0, Math.ceil((gracePeriodExpires.getTime() - new Date().getTime()) / (1000 * 60 * 60))) : null;
                        
                        return (
                          <div className="w-full sm:w-auto space-y-2">
                            <Button
                              size="sm"
                              variant="default"
                              className={`w-full ${isGracePeriodPayment ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : 'bg-primary hover:bg-primary/90'}`}
                              onClick={() => handleCompletePayment(proposalId)}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              {currentLanguage === 'ar' ? 'إكمال الدفع' : paymentLabel}
                              {amount && ` ($${amount})`}
                            </Button>
                            {isGracePeriodPayment && timeRemaining !== null && (
                              <div className="text-xs text-center text-warning">
                                {timeRemaining > 0 ? `${timeRemaining}h remaining` : 'Grace period expired'}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProposal && (
        <ProposalReviewDialog
          open={!!selectedProposal}
          onOpenChange={() => setSelectedProposal(null)}
          proposal={selectedProposal}
          onProposalUpdate={() => {}}
        />
      )}
    </>
  );
};