import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, FileText, CheckCircle, Clock, CreditCard } from "lucide-react";
import { ProposalReviewDialog } from "@/components/ProposalReviewDialog";
import { useNotifications, type Notification, type Proposal } from "@/hooks/useNotifications";
import { useLanguage } from "@/hooks/useLanguage";

export const NotificationsInbox = () => {
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
    needsPayment
  } = useNotifications();

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
      navigate('/payment', {
        state: {
          caseId: proposalWithCase.case.id,
          proposalId: proposalWithCase.id,
          consultationFee: proposalWithCase.consultation_fee,
          totalFee: proposalWithCase.total_fee,
          lawyerName: proposalWithCase.case.assigned_lawyer_name || 'Your Lawyer',
          caseTitle: proposalWithCase.case.title
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
        return <Bell className="h-4 w-4" />;
    }
  };


  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {currentLanguage === 'ar' ? 'صندوق الإشعارات' : 'Notifications Inbox'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {currentLanguage === 'ar' ? 'صندوق الإشعارات' : 'Notifications Inbox'}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {currentLanguage === 'ar' ? 'لا توجد إشعارات' : 'No notifications yet'}
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border ${
                    !notification.is_read 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-background'
                  }`}
                >
                  <div className="flex items-start gap-3 overflow-hidden">
                    <div className={`p-2 rounded-full flex-shrink-0 ${
                      !notification.is_read ? 'bg-primary/20' : 'bg-muted'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <div className="mb-1">
                        <h4 className="font-medium truncate">{notification.title}</h4>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-4 mt-3">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(notification.created_at).toLocaleDateString()}
                        </div>
                        
                        {notification.action_required && notification.type === 'proposal_received' && (
                          <Button
                            size="sm"
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
                          const proposalWithCase = proposalsWithCases.find(p => p.id === proposalId);
                          return proposalWithCase && needsPayment(proposalWithCase) && (
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-primary hover:bg-primary/90"
                              onClick={() => handleCompletePayment(proposalId)}
                            >
                              <CreditCard className="h-4 w-4 mr-2" />
                              {currentLanguage === 'ar' ? 'إكمال الدفع' : 'Complete Payment'}
                            </Button>
                          );
                        })()}
                        
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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