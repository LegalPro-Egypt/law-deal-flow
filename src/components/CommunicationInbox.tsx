import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Lock, CreditCard, Clock } from 'lucide-react';
import { CommunicationLauncher } from '@/components/CommunicationLauncher';
// RecentSessions removed - Twilio integration removed
import { useLanguage } from '@/hooks/useLanguage';
import { NotificationBadge } from '@/components/ui/notification-badge';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface Case {
  id: string;
  title: string;
  case_number: string;
  status: string;
  consultation_paid?: boolean;
  payment_status?: string;
  consultation_completed_at?: string;
  grace_period_expires_at?: string;
  communication_modes?: {
    text: boolean;
    voice: boolean;
    video: boolean;
  };
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
  chatNotificationCount?: number;
}

export const CommunicationInbox: React.FC<CommunicationInboxProps> = ({
  cases,
  userRole,
  caseId: initialCaseId,
  caseTitle: initialCaseTitle,
  caseStatus: initialCaseStatus,
  consultationPaid: initialConsultationPaid,
  paymentStatus: initialPaymentStatus,
  lawyerAssigned = false,
  chatNotificationCount = 0
}) => {
  const { t, isRTL } = useLanguage();
  const [completing, setCompleting] = useState(false);
  
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
      // Lawyers can communicate only after client pays for consultation
      return consultationPaid && paymentStatus === 'paid';
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

  // Check if lawyer can mark consultation as completed
  const canCompleteConsultation = () => {
    return userRole === 'lawyer' && 
           caseStatus === 'proposal_accepted' && 
           consultationPaid && 
           paymentStatus === 'paid' &&
           !selectedCase?.consultation_completed_at;
  };

  const handleCompleteConsultation = async () => {
    if (!caseId) return;
    
    setCompleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('complete-consultation', {
        body: { caseId }
      });

      if (error) throw error;

      toast({
        title: "Consultation Completed",
        description: "The consultation has been marked as completed. Client has 24 hours to complete remaining payment.",
      });

      // Trigger a refresh of case data
      window.location.reload();
    } catch (error) {
      console.error('Error completing consultation:', error);
      toast({
        title: "Error",
        description: "Failed to complete consultation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setCompleting(false);
    }
  };

  if (cases.length === 0) {
    return (
      <div className={isRTL() ? 'text-right' : ''}>
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            No cases available for communication
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={isRTL() ? 'text-right' : ''}>
        {!selectedCase ? (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Please select a case to start communication
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {canCommunicate ? (
              <div className="space-y-4">
                <div className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse justify-end' : ''}`}>
                  <Badge variant="secondary" className="bg-success/10 text-success">
                    {t('communication.status.active')}
                  </Badge>
                  {consultationPaid && paymentStatus === 'paid' && !selectedCase?.consultation_completed_at && (
                    <Badge variant="outline" className="text-xs">
                      {t('communication.status.paidConsultation')}
                    </Badge>
                  )}
                  {selectedCase?.consultation_completed_at && (
                    <Badge variant="outline" className="text-xs bg-warning/10 text-warning">
                      Consultation Completed
                    </Badge>
                  )}
                </div>

                {/* Consultation Completed Button for Lawyers */}
                {canCompleteConsultation() && (
                  <div className="p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg border border-primary/20">
                    <div className={`flex items-center justify-between ${isRTL() ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <h4 className="font-medium text-sm">Ready to complete consultation?</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Mark the consultation as completed. Client will have 24 hours to pay remaining fees.
                        </p>
                      </div>
                      <Button
                        onClick={handleCompleteConsultation}
                        disabled={completing}
                        className="ml-4 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {completing ? 'Completing...' : 'Complete Consultation'}
                      </Button>
                    </div>
                  </div>
                )}

                <CommunicationLauncher 
                  caseId={caseId}
                  caseTitle={caseTitle}
                  lawyerAssigned={lawyerAssigned}
                  communicationModes={selectedCase?.communication_modes}
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
                </AlertDescription>
              </Alert>
            )}
          </div>
      )}
    </div>
  );
};