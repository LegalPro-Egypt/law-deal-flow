import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Lock, CreditCard, Clock } from 'lucide-react';
import { CommunicationLauncher } from '@/components/CommunicationLauncher';
import { RecentSessions } from '@/components/RecentSessions';
import { useLanguage } from '@/hooks/useLanguage';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationBadge } from '@/components/ui/notification-badge';

interface Case {
  id: string;
  title: string;
  case_number: string;
  status: string;
  consultation_paid?: boolean;
  payment_status?: string;
}

interface CommunicationInboxProps {
  cases: Case[];
  userRole: 'client' | 'lawyer';
  caseId?: string;
  caseTitle?: string;
  caseStatus?: string;
  consultationPaid?: boolean;
  paymentStatus?: string;
  lawyerAssigned?: boolean;
}

export const CommunicationInbox: React.FC<CommunicationInboxProps> = ({
  cases,
  userRole,
  caseId: initialCaseId,
  caseTitle: initialCaseTitle,
  caseStatus: initialCaseStatus,
  consultationPaid: initialConsultationPaid,
  paymentStatus: initialPaymentStatus,
  lawyerAssigned = false
}) => {
  const { t, isRTL } = useLanguage();
  const { unreadCount } = useNotifications();
  
  // Use first available case if no initial case provided
  const firstCase = cases.length > 0 ? cases[0] : null;
  const [selectedCaseId, setSelectedCaseId] = useState(initialCaseId || firstCase?.id || '');
  
  // Find selected case details
  const selectedCase = cases.find(c => c.id === selectedCaseId) || firstCase;
  const caseId = selectedCase?.id || '';
  const caseTitle = selectedCase?.title || '';
  const caseStatus = selectedCase?.status || '';
  const consultationPaid = selectedCase?.consultation_paid || false;
  const paymentStatus = selectedCase?.payment_status || 'pending';

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

  if (cases.length === 0) {
    return (
      <Card className={`bg-gradient-card shadow-card ${isRTL() ? 'rtl-card' : ''}`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 relative ${isRTL() ? 'flex-row-reverse justify-end' : ''}`}>
            <MessageSquare className="h-5 w-5" />
            {t('communication.inbox.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className={isRTL() ? 'text-right' : ''}>
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              No cases available for communication
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-card shadow-card ${isRTL() ? 'rtl-card' : ''}`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 relative ${isRTL() ? 'flex-row-reverse justify-end' : ''}`}>
          <MessageSquare className="h-5 w-5" />
          {t('communication.inbox.title')}
          <NotificationBadge count={unreadCount} />
        </CardTitle>
        <CardDescription className={`flex items-center justify-between ${isRTL() ? 'text-right flex-row-reverse' : ''}`}>
          <span>{t(`communication.inbox.description.${userRole}`)}</span>
          {cases.length > 1 && (
            <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
              <SelectTrigger className="w-auto min-w-[200px] ml-4">
                <SelectValue placeholder="Select Case" />
              </SelectTrigger>
              <SelectContent>
                {cases.map((caseItem) => (
                  <SelectItem key={caseItem.id} value={caseItem.id}>
                    {caseItem.case_number} - {caseItem.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className={isRTL() ? 'text-right' : ''}>
        {!selectedCase ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Please select a case to start communication
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="communication" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="communication">Communication</TabsTrigger>
              <TabsTrigger value="sessions">Recent Sessions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="communication" className="space-y-4 mt-4">
              {canCommunicate ? (
                <div className="space-y-4">
                  <div className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse justify-end' : ''}`}>
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
                <Alert className={isRTL() ? 'text-right' : ''}>
                  <disabledInfo.icon className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <div className={`font-medium ${isRTL() ? 'text-right' : ''}`}>{disabledInfo.title}</div>
                    <div className={`text-sm text-muted-foreground ${isRTL() ? 'text-right' : ''}`}>
                      {disabledInfo.description}
                    </div>
                    <div className={`flex items-center gap-2 mt-2 ${isRTL() ? 'flex-row-reverse justify-end' : ''}`}>
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
            </TabsContent>
            
            <TabsContent value="sessions" className="mt-4">
              <RecentSessions 
                caseId={caseId}
                caseTitle={caseTitle}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
};