import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, Lock, CreditCard, Clock } from 'lucide-react';
import { CommunicationLauncher } from '@/components/CommunicationLauncher';
import { useLanguage } from '@/hooks/useLanguage';

interface CommunicationInboxProps {
  caseId: string;
  caseTitle: string;
  caseStatus: string;
  consultationPaid: boolean;
  paymentStatus: string;
  userRole: 'client' | 'lawyer';
  lawyerAssigned?: boolean;
}

export const CommunicationInbox: React.FC<CommunicationInboxProps> = ({
  caseId,
  caseTitle,
  caseStatus,
  consultationPaid,
  paymentStatus,
  userRole,
  lawyerAssigned = false
}) => {
  const { t, isRTL } = useLanguage();

  // Determine if communication should be enabled
  const shouldEnableCommunication = () => {
    if (userRole === 'lawyer') {
      // Lawyers can communicate once proposal is accepted
      return ['proposal_accepted', 'consultation_paid', 'active', 'in_progress', 'completed'].includes(caseStatus);
    } else {
      // Clients can communicate once they've paid for consultation
      return consultationPaid && paymentStatus === 'paid';
    }
  };

  const canCommunicate = shouldEnableCommunication();

  // Get the appropriate message for why communication is disabled
  const getDisabledMessage = () => {
    if (userRole === 'lawyer') {
      if (caseStatus === 'lawyer_assigned') {
        return {
          title: t('communication.disabled.waitingResponse.title'),
          description: t('communication.disabled.waitingResponse.description'),
          icon: Clock
        };
      }
      if (caseStatus === 'proposal_sent') {
        return {
          title: t('communication.disabled.proposalReview.title'),
          description: t('communication.disabled.proposalReview.description'),
          icon: Clock
        };
      }
    } else {
      if (!lawyerAssigned) {
        return {
          title: t('communication.disabled.noLawyer.title'),
          description: t('communication.disabled.noLawyer.description'),
          icon: Clock
        };
      }
      if (caseStatus === 'proposal_sent' || caseStatus === 'proposal_accepted') {
        return {
          title: t('communication.disabled.paymentRequired.title'),
          description: t('communication.disabled.paymentRequired.description'),
          icon: CreditCard
        };
      }
      if (!consultationPaid || paymentStatus !== 'paid') {
        return {
          title: t('communication.disabled.paymentPending.title'),
          description: t('communication.disabled.paymentPending.description'),
          icon: CreditCard
        };
      }
    }
    
    return {
      title: t('communication.disabled.notAvailable.title'),
      description: t('communication.disabled.notAvailable.description'),
      icon: Lock
    };
  };

  const disabledInfo = getDisabledMessage();

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
          <MessageSquare className="h-5 w-5" />
          {t('communication.inbox.title')}
        </CardTitle>
        <CardDescription>
          {t(`communication.inbox.description.${userRole}`)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canCommunicate ? (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
              <Badge variant="secondary" className="bg-success/10 text-success">
                {t('communication.status.active')}
              </Badge>
              {consultationPaid && paymentStatus === 'paid' && (
                <Badge variant="outline" className="text-xs">
                  {t('communication.status.paidConsultation')}
                </Badge>
              )}
            </div>
            <CommunicationLauncher 
              caseId={caseId}
              caseTitle={caseTitle}
              lawyerAssigned={lawyerAssigned}
            />
          </div>
        ) : (
          <Alert>
            <disabledInfo.icon className="h-4 w-4" />
            <AlertDescription className="space-y-2">
              <div className="font-medium">{disabledInfo.title}</div>
              <div className="text-sm text-muted-foreground">
                {disabledInfo.description}
              </div>
              <div className={`flex items-center gap-2 mt-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                <Badge variant="outline" className="text-xs">
                  {t('communication.labels.status')} {t(`dashboard.cases.status.${caseStatus}`, caseStatus)}
                </Badge>
                {!consultationPaid && userRole === 'client' && (
                  <Badge variant="outline" className="text-xs">
                    {t('communication.labels.payment')} {paymentStatus.replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};