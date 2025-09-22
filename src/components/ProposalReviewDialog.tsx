import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, Clock, DollarSign, Scale, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/hooks/useLanguage";

interface Proposal {
  id: string;
  case_id: string;
  lawyer_id: string;
  consultation_fee: number;
  remaining_fee: number;
  total_fee: number;
  timeline: string;
  strategy: string;
  generated_content: string;
  status: string;
  created_at: string;
  viewed_at?: string;
}

interface ProposalReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposal: Proposal;
  onProposalUpdate: () => void;
}

export const ProposalReviewDialog = ({
  open,
  onOpenChange,
  proposal,
  onProposalUpdate,
}: ProposalReviewDialogProps) => {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const { currentLanguage } = useLanguage();

  const handleAcceptProposal = async () => {
    if (!acceptedTerms) {
      toast.error(
        currentLanguage === 'ar' 
          ? 'يجب قبول الشروط والأحكام أولاً' 
          : 'Please accept the terms and conditions first'
      );
      return;
    }

    setLoading(true);
    try {
      // Update proposal status
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({
          status: 'accepted',
          response_at: new Date().toISOString()
        })
        .eq('id', proposal.id);

      if (proposalError) throw proposalError;

      // Update case status and fees
      const { error: caseError } = await supabase
        .from('cases')
        .update({
          status: 'proposal_accepted',
          consultation_fee: proposal.consultation_fee,
          remaining_fee: proposal.remaining_fee,
          total_fee: proposal.total_fee,
          updated_at: new Date().toISOString()
        })
        .eq('id', proposal.case_id);

      if (caseError) throw caseError;

      // Create notification for lawyer
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: proposal.lawyer_id,
          case_id: proposal.case_id,
          type: 'proposal_accepted',
          title: currentLanguage === 'ar' ? 'تم قبول العرض' : 'Proposal Accepted',
          message: currentLanguage === 'ar' 
            ? 'قام العميل بقبول عرضك القانوني' 
            : 'Client has accepted your legal proposal',
          action_required: false,
          metadata: { proposal_id: proposal.id }
        });

      if (notificationError) throw notificationError;

      toast.success(
        currentLanguage === 'ar' 
          ? 'تم قبول العرض بنجاح! سيتم توجيهك للدفع.' 
          : 'Proposal accepted successfully! You will be redirected to payment.'
      );

      onProposalUpdate();
      onOpenChange(false);

      // Here you would typically redirect to payment page
      // For now, we'll just show success message

    } catch (error) {
      console.error('Error accepting proposal:', error);
      toast.error(
        currentLanguage === 'ar' 
          ? 'حدث خطأ في قبول العرض' 
          : 'Error accepting proposal'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRejectProposal = async () => {
    setLoading(true);
    try {
      // Update proposal status
      const { error: proposalError } = await supabase
        .from('proposals')
        .update({
          status: 'rejected',
          response_at: new Date().toISOString()
        })
        .eq('id', proposal.id);

      if (proposalError) throw proposalError;

      // Update case status
      const { error: caseError } = await supabase
        .from('cases')
        .update({
          status: 'proposal_rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', proposal.case_id);

      if (caseError) throw caseError;

      // Create notification for lawyer
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: proposal.lawyer_id,
          case_id: proposal.case_id,
          type: 'proposal_rejected',
          title: currentLanguage === 'ar' ? 'تم رفض العرض' : 'Proposal Rejected',
          message: currentLanguage === 'ar' 
            ? 'قام العميل برفض عرضك القانوني' 
            : 'Client has rejected your legal proposal',
          action_required: false,
          metadata: { proposal_id: proposal.id }
        });

      if (notificationError) throw notificationError;

      toast.success(
        currentLanguage === 'ar' 
          ? 'تم رفض العرض' 
          : 'Proposal rejected'
      );

      onProposalUpdate();
      onOpenChange(false);

    } catch (error) {
      console.error('Error rejecting proposal:', error);
      toast.error(
        currentLanguage === 'ar' 
          ? 'حدث خطأ في رفض العرض' 
          : 'Error rejecting proposal'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="outline">{currentLanguage === 'ar' ? 'مُرسل' : 'Sent'}</Badge>;
      case 'viewed':
        return <Badge variant="secondary">{currentLanguage === 'ar' ? 'تم العرض' : 'Viewed'}</Badge>;
      case 'accepted':
        return <Badge variant="default">{currentLanguage === 'ar' ? 'مقبول' : 'Accepted'}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{currentLanguage === 'ar' ? 'مرفوض' : 'Rejected'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isActionable = proposal.status === 'sent' || proposal.status === 'viewed';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {currentLanguage === 'ar' ? 'مراجعة العرض القانوني' : 'Legal Proposal Review'}
            {getStatusBadge(proposal.status)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Fee Structure */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {currentLanguage === 'ar' ? 'هيكل الرسوم' : 'Fee Structure'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-primary/5 rounded-lg">
                  <div className="font-semibold text-lg">
                    ${proposal.consultation_fee?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentLanguage === 'ar' ? 'رسوم الاستشارة' : 'Consultation Fee'}
                  </div>
                </div>
                <div className="text-center p-4 bg-secondary/5 rounded-lg">
                  <div className="font-semibold text-lg">
                    ${proposal.remaining_fee?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentLanguage === 'ar' ? 'الرسوم المتبقية' : 'Remaining Fee'}
                  </div>
                </div>
                <div className="text-center p-4 bg-accent/5 rounded-lg">
                  <div className="font-semibold text-lg text-primary">
                    ${proposal.total_fee?.toLocaleString() || '0'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentLanguage === 'ar' ? 'إجمالي الرسوم' : 'Total Fee'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {currentLanguage === 'ar' ? 'الجدول الزمني' : 'Timeline'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{proposal.timeline}</p>
            </CardContent>
          </Card>

          {/* Strategy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                {currentLanguage === 'ar' ? 'الاستراتيجية القانونية' : 'Legal Strategy'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap">{proposal.strategy}</p>
            </CardContent>
          </Card>

          {/* Full Proposal Content */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentLanguage === 'ar' ? 'تفاصيل العرض الكامل' : 'Full Proposal Details'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {proposal.generated_content}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Section */}
          {isActionable && (
            <>
              <Separator />
              
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="text-primary">
                    {currentLanguage === 'ar' ? 'اتخاذ إجراء' : 'Take Action'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
                    />
                    <label
                      htmlFor="terms"
                      className="text-sm leading-relaxed cursor-pointer"
                    >
                      {currentLanguage === 'ar' 
                        ? 'أوافق على شروط وأحكام الخدمة وأفهم أن قبول هذا العرض يُشكل اتفاقية ملزمة قانونياً بيني وبين المحامي المذكور.'
                        : 'I agree to the terms and conditions of service and understand that accepting this proposal constitutes a legally binding agreement between myself and the mentioned lawyer.'
                      }
                    </label>
                  </div>
                  
                  <div className="flex gap-4">
                    <Button
                      onClick={handleAcceptProposal}
                      disabled={loading || !acceptedTerms}
                      className="flex-1"
                      size="lg"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {currentLanguage === 'ar' ? 'قبول العرض' : 'Accept Proposal'}
                    </Button>
                    
                    <Button
                      onClick={handleRejectProposal}
                      disabled={loading}
                      variant="destructive"
                      className="flex-1"
                      size="lg"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      {currentLanguage === 'ar' ? 'رفض العرض' : 'Reject Proposal'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Proposal Info */}
          <div className="text-xs text-muted-foreground text-center">
            {currentLanguage === 'ar' ? 'تم إرسال العرض في:' : 'Proposal sent on:'}{' '}
            {new Date(proposal.created_at).toLocaleDateString()}
            {proposal.viewed_at && (
              <>
                {currentLanguage === 'ar' ? ' • تم العرض في:' : ' • Viewed on:'}{' '}
                {new Date(proposal.viewed_at).toLocaleDateString()}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};