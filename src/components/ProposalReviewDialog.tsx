import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, AlertTriangle, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';

interface ProposalMessage {
  id: string;
  content: string;
  metadata?: {
    fees?: {
      consultation_fee: number;
      remaining_fee: number;
      total_fee: number;
    };
    timeline?: string;
    strategy?: string;
  };
  created_at: string;
}

interface ProposalReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseTitle: string;
  proposal: ProposalMessage | null;
  onProposalAction: () => void;
}

export const ProposalReviewDialog: React.FC<ProposalReviewDialogProps> = ({
  open,
  onOpenChange,
  caseId,
  caseTitle,
  proposal,
  onProposalAction
}) => {
  const { t, isRTL } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleAcceptProposal = async () => {
    if (!termsAccepted) {
      toast({
        title: t('proposal.review.error.termsRequired'),
        description: t('proposal.review.error.termsRequiredDesc'),
        variant: "destructive"
      });
      return;
    }

    if (!user || !proposal) return;

    setProcessing(true);

    try {
      // Update case status and fees
      const { error: caseError } = await supabase
        .from('cases')
        .update({
          status: 'proposal_accepted',
          consultation_fee: proposal.metadata?.fees?.consultation_fee || 0,
          total_fee: proposal.metadata?.fees?.total_fee || 0,
          remaining_fee: proposal.metadata?.fees?.remaining_fee || 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (caseError) throw caseError;

      // Log the acceptance for legal records
      const { error: messageError } = await supabase
        .from('case_messages')
        .insert({
          case_id: caseId,
          role: 'system',
          content: `Proposal accepted by client at ${new Date().toISOString()}. Legal agreement established.`,
          message_type: 'system',
          metadata: {
            action: 'proposal_accepted',
            timestamp: new Date().toISOString(),
            user_id: user.id,
            terms_accepted: true,
            binding_agreement: true
          }
        });

      if (messageError) throw messageError;

      toast({
        title: t('proposal.review.success.accepted'),
        description: t('proposal.review.success.acceptedDesc')
      });

      onProposalAction();
      onOpenChange(false);

      // Redirect to payment page for consultation
      setTimeout(() => {
        navigate('/payment', { 
          state: { 
            caseId, 
            amount: proposal.metadata?.fees?.consultation_fee || 0,
            type: 'consultation'
          }
        });
      }, 1000);

    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast({
        title: t('proposal.review.error.acceptFailed'),
        description: t('proposal.review.error.acceptFailedDesc'),
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!user) return;

    setProcessing(true);

    try {
      // Update case status to request changes
      const { error: caseError } = await supabase
        .from('cases')
        .update({
          status: 'proposal_revision_requested',
          updated_at: new Date().toISOString()
        })
        .eq('id', caseId);

      if (caseError) throw caseError;

      // Log the request for changes
      const { error: messageError } = await supabase
        .from('case_messages')
        .insert({
          case_id: caseId,
          role: 'system',
          content: `Client requested changes to proposal at ${new Date().toISOString()}`,
          message_type: 'system',
          metadata: {
            action: 'proposal_revision_requested',
            timestamp: new Date().toISOString(),
            user_id: user.id
          }
        });

      if (messageError) throw messageError;

      toast({
        title: t('proposal.review.success.changesRequested'),
        description: t('proposal.review.success.changesRequestedDesc')
      });

      onProposalAction();
      onOpenChange(false);

    } catch (error) {
      console.error('Error requesting changes:', error);
      toast({
        title: t('proposal.review.error.changesFailed'),
        description: t('proposal.review.error.changesFailedDesc'),
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  if (!proposal) {
    return null;
  }

  const fees = proposal.metadata?.fees;
  const timeline = proposal.metadata?.timeline;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-y-auto ${isRTL() ? 'rtl' : ''}`}>
        <DialogHeader className={isRTL() ? 'text-right' : ''}>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('proposal.review.title')}
          </DialogTitle>
          <DialogDescription>
            {t('proposal.review.subtitle', { caseTitle })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Legal Notice */}
          <Alert className="border-warning bg-warning/10">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className={isRTL() ? 'text-right' : ''}>
              <strong>{t('proposal.review.legalNotice.title')}</strong><br />
              {t('proposal.review.legalNotice.description')}
            </AlertDescription>
          </Alert>

          {/* Proposal Content */}
          <Card>
            <CardHeader>
              <CardTitle>{t('proposal.review.proposalContent')}</CardTitle>
              <CardDescription>
                {t('proposal.review.proposalDate', { 
                  date: new Date(proposal.created_at).toLocaleDateString() 
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="prose prose-sm max-w-none">
                {proposal.content.split('\n').map((paragraph, index) => (
                  <p key={index} className={isRTL() ? 'text-right' : ''}>{paragraph}</p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fee Structure */}
          {fees && (
            <Card>
              <CardHeader>
                <CardTitle>{t('proposal.review.feeStructure')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className={`flex justify-between items-center ${isRTL() ? 'flex-row-reverse' : ''}`}>
                  <span>{t('proposal.review.consultationFee')}</span>
                  <Badge variant="secondary">${fees.consultation_fee}</Badge>
                </div>
                <div className={`flex justify-between items-center ${isRTL() ? 'flex-row-reverse' : ''}`}>
                  <span>{t('proposal.review.remainingFee')}</span>
                  <Badge variant="outline">${fees.remaining_fee}</Badge>
                </div>
                <Separator />
                <div className={`flex justify-between items-center font-semibold ${isRTL() ? 'flex-row-reverse' : ''}`}>
                  <span>{t('proposal.review.totalFee')}</span>
                  <Badge className="bg-primary text-primary-foreground">${fees.total_fee}</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          {timeline && (
            <Card>
              <CardHeader>
                <CardTitle>{t('proposal.review.timeline')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className={isRTL() ? 'text-right' : ''}>{timeline}</p>
              </CardContent>
            </Card>
          )}

          {/* Terms Acceptance */}
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className={`flex items-start space-x-2 ${isRTL() ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <Checkbox
                  id="terms-checkbox"
                  checked={termsAccepted}
                  onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                />
                <div className={`flex-1 ${isRTL() ? 'text-right' : ''}`}>
                  <label htmlFor="terms-checkbox" className="text-sm font-medium cursor-pointer">
                    {t('proposal.review.termsAcceptance.label')}
                  </label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('proposal.review.termsAcceptance.description')}{' '}
                    <Link 
                      to="/terms" 
                      target="_blank"
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      {t('proposal.review.termsAcceptance.link')}
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Link>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className={`flex gap-3 pt-4 ${isRTL() ? 'flex-row-reverse' : ''}`}>
            <Button
              onClick={handleAcceptProposal}
              disabled={!termsAccepted || processing}
              className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {processing ? t('proposal.review.buttons.accepting') : t('proposal.review.buttons.accept')}
            </Button>
            <Button
              onClick={handleRequestChanges}
              disabled={processing}
              variant="outline"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {processing ? t('proposal.review.buttons.requesting') : t('proposal.review.buttons.requestChanges')}
            </Button>
          </div>

          {/* Payment Flow Notice */}
          {termsAccepted && (
            <Alert className="bg-info/10 border-info">
              <AlertDescription className={isRTL() ? 'text-right' : ''}>
                {t('proposal.review.paymentNotice', { 
                  amount: fees?.consultation_fee || 0 
                })}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};