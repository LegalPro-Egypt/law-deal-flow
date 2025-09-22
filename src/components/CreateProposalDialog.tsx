import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/hooks/useLanguage";
import { Loader2, FileText, DollarSign, Clock, Target } from "lucide-react";

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseTitle: string;
  clientName: string;
  onProposalSent: () => void;
}

interface ProposalForm {
  consultation_fee: number;
  remaining_fee: number;
  timeline: string;
  strategy: string;
}

export const CreateProposalDialog: React.FC<CreateProposalDialogProps> = ({
  open,
  onOpenChange,
  caseId,
  caseTitle,
  clientName,
  onProposalSent
}) => {
  const [formData, setFormData] = useState<ProposalForm>({
    consultation_fee: 500,
    remaining_fee: 2000,
    timeline: "4-6 weeks",
    strategy: ""
  });
  const [generatedProposal, setGeneratedProposal] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState("form");
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();

  const handleInputChange = (field: keyof ProposalForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateProposal = async () => {
    if (!formData.strategy.trim()) {
      toast({
        title: t('proposal.messages.strategyRequired'),
        description: t('proposal.messages.strategyRequiredDesc'),
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      toast({
        title: "Generating proposal...",
        description: "This may take 15-30 seconds",
      });

      console.log('Generating proposal for case:', caseId, 'with data:', formData);
      
      const { data, error } = await supabase.functions.invoke('generate-proposal', {
        body: {
          caseId,
          proposalInput: formData
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(`Edge function error: ${JSON.stringify(error)}`);
      }

      if (!data) {
        throw new Error('No data returned from proposal generation');
      }

      if (data.error) {
        throw new Error(`Proposal generation failed: ${data.error}`);
      }

      if (!data.generatedProposal) {
        throw new Error('No proposal content generated');
      }

      console.log('Generated proposal length:', data.generatedProposal.length);
      setGeneratedProposal(data.generatedProposal);
      setActiveTab("preview");
      
      toast({
        title: t('proposal.messages.generated'),
        description: t('proposal.messages.generatedDesc')
      });
    } catch (error) {
      console.error('Error generating proposal:', error);
      
      let errorMessage = "Failed to generate proposal. Please try again.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        title: t('proposal.messages.generationFailed'),
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendProposal = async () => {
    if (!generatedProposal) {
      toast({
        title: t('proposal.messages.noProposal'),
        description: t('proposal.messages.noProposalDesc'),
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      // Create proposal record in dedicated proposals table
      const { data: proposalData, error: proposalError } = await supabase
        .from('proposals')
        .insert({
          case_id: caseId,
          lawyer_id: (await supabase.auth.getUser()).data.user?.id,
          client_id: (await supabase.from('cases').select('user_id').eq('id', caseId).single()).data?.user_id,
          consultation_fee: formData.consultation_fee,
          remaining_fee: formData.remaining_fee,
          total_fee: formData.consultation_fee + formData.remaining_fee,
          timeline: formData.timeline,
          strategy: formData.strategy,
          generated_content: generatedProposal,
          status: 'sent'
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      // Update case status
      const { error: caseError } = await supabase
        .from('cases')
        .update({
          status: 'proposal_sent',
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      if (caseError) throw caseError;

      // Get client ID for notification
      const { data: caseData } = await supabase
        .from('cases')
        .select('user_id')
        .eq('id', caseId)
        .single();

      if (caseData) {
        // Create notification for client
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            user_id: caseData.user_id,
            case_id: caseId,
            type: 'proposal_received',
            title: 'New Legal Proposal Received',
            message: 'You have received a new legal proposal for your case. Please review and respond.',
            action_required: true,
            metadata: { 
              proposal_id: proposalData.id,
              total_fee: formData.consultation_fee + formData.remaining_fee
            }
          });

        if (notificationError) throw notificationError;
      }

      toast({
        title: t('proposal.messages.sent'),
        description: t('proposal.messages.sentDesc', { clientName })
      });

      onProposalSent();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        consultation_fee: 500,
        remaining_fee: 2000,
        timeline: "4-6 weeks",
        strategy: ""
      });
      setGeneratedProposal("");
      setActiveTab("form");

    } catch (error) {
      console.error('Error sending proposal:', error);
      toast({
        title: t('proposal.messages.sendFailed'),
        description: t('proposal.messages.sendFailedDesc'),
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`max-w-4xl max-h-[90vh] overflow-hidden ${isRTL() ? 'rtl' : 'ltr'}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
            <FileText className="h-5 w-5" />
            {t('proposal.title')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('proposal.subtitle', { caseTitle, clientName })}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">{t('proposal.tabs.details')}</TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedProposal}>
              {t('proposal.tabs.preview')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-6 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-sm flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                    <DollarSign className="h-4 w-4" />
                    {t('proposal.feeStructure.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className={`space-y-2 ${isRTL() ? 'text-right' : ''}`}>
                    <Label htmlFor="consultation_fee">{t('proposal.feeStructure.consultation')}</Label>
                    <Input
                      id="consultation_fee"
                      type="number"
                      value={formData.consultation_fee}
                      onChange={(e) => handleInputChange('consultation_fee', Number(e.target.value))}
                      min="0"
                      step="50"
                    />
                  </div>
                  <div className={`space-y-2 ${isRTL() ? 'text-right' : ''}`}>
                    <Label htmlFor="remaining_fee">{t('proposal.feeStructure.remaining')}</Label>
                    <Input
                      id="remaining_fee"
                      type="number"
                      value={formData.remaining_fee}
                      onChange={(e) => handleInputChange('remaining_fee', Number(e.target.value))}
                      min="0"
                      step="100"
                    />
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center font-semibold">
                    <span>{t('proposal.feeStructure.total')}:</span>
                    <span>${(formData.consultation_fee + formData.remaining_fee).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-sm flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                    <Clock className="h-4 w-4" />
                    {t('proposal.timeline.title')}
                  </CardTitle>
                </CardHeader>
                  <CardContent className="space-y-2">
                  <Label htmlFor="timeline">{t('proposal.timeline.estimated')}</Label>
                  <Input
                    id="timeline"
                    value={formData.timeline}
                    onChange={(e) => handleInputChange('timeline', e.target.value)}
                    placeholder={t('proposal.timeline.placeholder')}
                    className={isRTL() ? 'text-right' : ''}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                  <Target className="h-4 w-4" />
                  {t('proposal.strategy.title')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="strategy">{t('proposal.strategy.label')}</Label>
                <Textarea
                  id="strategy"
                  value={formData.strategy}
                  onChange={(e) => handleInputChange('strategy', e.target.value)}
                  placeholder={t('proposal.strategy.placeholder')}
                  rows={4}
                  className={`resize-none ${isRTL() ? 'text-right leading-relaxed' : ''}`}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {t('proposal.strategy.description')}
                </p>
              </CardContent>
            </Card>

            <div className={`flex ${isRTL() ? 'justify-start' : 'justify-end'}`}>
              <Button 
                onClick={generateProposal} 
                disabled={isGenerating || !formData.strategy.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className={`h-4 w-4 ${isRTL() ? 'ml-2' : 'mr-2'} animate-spin`} />
                    {t('proposal.buttons.generating')}
                  </>
                ) : (
                  t('proposal.buttons.generate')
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 overflow-y-auto max-h-[60vh]">
            {generatedProposal ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('proposal.generatedTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`prose prose-sm max-w-none whitespace-pre-wrap bg-muted p-4 rounded-md leading-relaxed ${isRTL() ? 'text-right' : 'text-left'}`}>
                    {generatedProposal}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {t('proposal.messages.noGenerated')}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className={`flex ${isRTL() ? 'justify-between flex-row-reverse' : 'justify-between'}`}>
              <Button variant="outline" onClick={() => setActiveTab("form")}>
                {t('proposal.buttons.backToEdit')}
              </Button>
              <Button onClick={sendProposal} disabled={isSending || !generatedProposal}>
                {isSending ? (
                  <>
                    <Loader2 className={`h-4 w-4 ${isRTL() ? 'ml-2' : 'mr-2'} animate-spin`} />
                    {t('proposal.buttons.sending')}
                  </>
                ) : (
                  t('proposal.buttons.send')
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};