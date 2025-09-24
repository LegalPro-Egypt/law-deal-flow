import React, { useState, useEffect } from "react";
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
import { Loader2, FileText, DollarSign, Clock, Target, CheckCircle } from "lucide-react";

interface CreateProposalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
  caseTitle: string;
  clientName: string;
  existingProposal?: any;
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
  existingProposal,
  onProposalSent
}) => {
  const isEditMode = !!existingProposal;
  const [formData, setFormData] = useState<ProposalForm>({
    consultation_fee: existingProposal?.consultation_fee || 500,
    remaining_fee: existingProposal?.remaining_fee || 2000,
    timeline: existingProposal?.timeline || "4-6 weeks",
    strategy: existingProposal?.strategy || ""
  });
  const [generatedProposal, setGeneratedProposal] = useState<string>(existingProposal?.generated_content || "");
  const [feeStructure, setFeeStructure] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [proposalType, setProposalType] = useState<'generated' | 'uploaded'>('generated');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>(existingProposal?.uploaded_pdf_url || "");
  const [activeTab, setActiveTab] = useState("form");
  const { toast } = useToast();
  const { t, isRTL } = useLanguage();

  // Set active tab when editing existing proposal
  useEffect(() => {
    if (isEditMode && existingProposal?.generated_content) {
      setProposalType('generated');
      setActiveTab("preview");
    } else if (isEditMode && existingProposal?.uploaded_pdf_url) {
      setProposalType('uploaded');
      setActiveTab("preview");
    } else {
      setActiveTab("form");
    }
  }, [isEditMode, existingProposal]);

  // Calculate additional fees in real-time
  const platformFeePercentage = 5.0;
  const paymentProcessingFeePercentage = 3.0;
  const clientProtectionFeePercentage = 3.0;
  
  const calculateFees = () => {
    const remainingFee = formData.remaining_fee || 0;
    const platformFeeAmount = remainingFee * (platformFeePercentage / 100);
    const paymentProcessingFeeAmount = remainingFee * (paymentProcessingFeePercentage / 100);
    const clientProtectionFeeAmount = remainingFee * (clientProtectionFeePercentage / 100);
    const totalAdditionalFees = platformFeeAmount + paymentProcessingFeeAmount + clientProtectionFeeAmount;
    const baseTotalFee = formData.consultation_fee + remainingFee;
    const finalTotalFee = baseTotalFee + totalAdditionalFees;
    
    return {
      platformFeeAmount,
      paymentProcessingFeeAmount,
      clientProtectionFeeAmount,
      totalAdditionalFees,
      baseTotalFee,
      finalTotalFee
    };
  };

  const calculatedFees = calculateFees();

  const handleInputChange = (field: keyof ProposalForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = async (file: File) => {
    if (!file || file.type !== 'application/pdf') {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF file only",
        variant: "destructive"
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a PDF file smaller than 20MB",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = 'pdf';
      const fileName = `${caseId}/proposal-${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('case-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('case-documents')
        .getPublicUrl(fileName);

      setUploadedFileUrl(publicUrl);
      setUploadedFile(file);
      setProposalType('uploaded');
      setActiveTab("preview");
      
      toast({
        title: "PDF uploaded successfully",
        description: "Your proposal PDF has been uploaded"
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload PDF file",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
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
      setFeeStructure(data.feeStructure);
      setProposalType('generated');
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
    if (proposalType === 'generated' && !generatedProposal) {
      toast({
        title: t('proposal.messages.noProposal'),
        description: t('proposal.messages.noProposalDesc'),
        variant: "destructive"
      });
      return;
    }
    
    if (proposalType === 'uploaded' && !uploadedFileUrl) {
      toast({
        title: "No PDF uploaded",
        description: "Please upload a PDF proposal or generate one",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      if (isEditMode) {
        // Update existing proposal
        const { error: proposalError } = await supabase
          .from('proposals')
          .update({
            consultation_fee: formData.consultation_fee,
            remaining_fee: formData.remaining_fee,
            total_fee: formData.consultation_fee + formData.remaining_fee,
            platform_fee_amount: calculatedFees.platformFeeAmount,
            payment_processing_fee_amount: calculatedFees.paymentProcessingFeeAmount,
            client_protection_fee_amount: calculatedFees.clientProtectionFeeAmount,
            base_total_fee: calculatedFees.baseTotalFee,
            total_additional_fees: calculatedFees.totalAdditionalFees,
            final_total_fee: calculatedFees.finalTotalFee,
            timeline: formData.timeline,
            strategy: formData.strategy,
            generated_content: proposalType === 'generated' ? generatedProposal : null,
            uploaded_pdf_url: proposalType === 'uploaded' ? uploadedFileUrl : null,
            proposal_type: proposalType,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProposal.id);

        if (proposalError) throw proposalError;
      } else {
        // Create new proposal record
        const { data: proposalData, error: proposalError } = await supabase
          .from('proposals')
          .insert({
            case_id: caseId,
            lawyer_id: (await supabase.auth.getUser()).data.user?.id,
            client_id: (await supabase.from('cases').select('user_id').eq('id', caseId).single()).data?.user_id,
            consultation_fee: formData.consultation_fee,
            remaining_fee: formData.remaining_fee,
            total_fee: formData.consultation_fee + formData.remaining_fee,
            platform_fee_percentage: platformFeePercentage,
            payment_processing_fee_percentage: paymentProcessingFeePercentage,
            client_protection_fee_percentage: clientProtectionFeePercentage,
            platform_fee_amount: calculatedFees.platformFeeAmount,
            payment_processing_fee_amount: calculatedFees.paymentProcessingFeeAmount,
            client_protection_fee_amount: calculatedFees.clientProtectionFeeAmount,
            base_total_fee: calculatedFees.baseTotalFee,
            total_additional_fees: calculatedFees.totalAdditionalFees,
            final_total_fee: calculatedFees.finalTotalFee,
            timeline: formData.timeline,
            strategy: formData.strategy,
            generated_content: proposalType === 'generated' ? generatedProposal : null,
            uploaded_pdf_url: proposalType === 'uploaded' ? uploadedFileUrl : null,
            proposal_type: proposalType,
            status: 'pending_admin_review'
          })
          .select()
          .single();

        if (proposalError) throw proposalError;
      }

      // Update case status to indicate proposal is under admin review
      const { error: caseError } = await supabase
        .from('cases')
        .update({
          status: 'proposal_sent',
          updated_at: new Date().toISOString(),
        })
        .eq('id', caseId);

      if (caseError) throw caseError;

      toast({
        title: isEditMode ? "Proposal Updated" : "Proposal Sent for Review",
        description: isEditMode 
          ? "Your proposal has been updated successfully." 
          : "Your proposal has been sent to the admin for review and approval."
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
            {isEditMode ? 'Edit Proposal' : t('proposal.title')}
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
                  
                  {/* Additional Fees Section */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Platform Fee (5%):</span>
                      <span>${calculatedFees.platformFeeAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Payment Processing Fee (3%):</span>
                      <span>${calculatedFees.paymentProcessingFeeAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Client Protection Fee (3%):</span>
                      <span>${calculatedFees.clientProtectionFeeAmount.toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  <div className="flex justify-between items-center font-semibold">
                    <span>{t('proposal.feeStructure.total')}:</span>
                    <span>${calculatedFees.finalTotalFee.toLocaleString()}</span>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    <p>* Additional fees apply to remaining payment only</p>
                    <p>* Consultation fee ({formData.consultation_fee.toLocaleString()}) paid upfront</p>
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

            {/* Proposal Type Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className={`text-sm flex items-center gap-2 ${isRTL() ? 'flex-row-reverse' : ''}`}>
                  <FileText className="h-4 w-4" />
                  Proposal Type
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="proposalType"
                      value="generated"
                      checked={proposalType === 'generated'}
                      onChange={(e) => setProposalType(e.target.value as 'generated' | 'uploaded')}
                      className="w-4 h-4"
                    />
                    <span>Generate AI Proposal</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="proposalType"
                      value="uploaded"
                      checked={proposalType === 'uploaded'}
                      onChange={(e) => setProposalType(e.target.value as 'generated' | 'uploaded')}
                      className="w-4 h-4"
                    />
                    <span>Upload PDF Proposal</span>
                  </label>
                </div>

                {proposalType === 'uploaded' && (
                  <div className="space-y-2">
                    <Label htmlFor="proposal-pdf">Upload PDF Proposal</Label>
                    <input
                      id="proposal-pdf"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                      disabled={isUploading}
                    />
                    {isUploading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Uploading PDF...
                      </div>
                    )}
                    {uploadedFileUrl && !isUploading && (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <CheckCircle className="h-4 w-4" />
                        PDF uploaded successfully
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className={`flex ${isRTL() ? 'justify-start' : 'justify-end'}`}>
              {proposalType === 'generated' ? (
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
              ) : (
                <Button 
                  onClick={() => setActiveTab("preview")}
                  disabled={!uploadedFileUrl}
                >
                  Preview PDF Proposal
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 overflow-y-auto max-h-[60vh]">
            {proposalType === 'generated' && generatedProposal ? (
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
            ) : proposalType === 'uploaded' && uploadedFileUrl ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">PDF Proposal Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 space-y-4">
                    <FileText className="h-16 w-16 mx-auto text-primary" />
                    <div>
                      <p className="font-medium">PDF Proposal Uploaded</p>
                      <p className="text-sm text-muted-foreground">
                        Your PDF proposal is ready to be sent to the client
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => window.open(uploadedFileUrl, '_blank')}
                      className="mt-4"
                    >
                      <FileText className={`h-4 w-4 ${isRTL() ? 'ml-2' : 'mr-2'}`} />
                      View PDF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {proposalType === 'generated' 
                      ? t('proposal.messages.noGenerated')
                      : 'No PDF proposal uploaded yet'
                    }
                  </p>
                </CardContent>
              </Card>
            )}

            <div className={`flex ${isRTL() ? 'justify-between flex-row-reverse' : 'justify-between'}`}>
              <Button variant="outline" onClick={() => setActiveTab("form")}>
                {t('proposal.buttons.backToEdit')}
              </Button>
              <Button 
                onClick={sendProposal} 
                disabled={isSending || (!generatedProposal && !uploadedFileUrl)}
              >
                {isSending ? (
                  <>
                    <Loader2 className={`h-4 w-4 ${isRTL() ? 'ml-2' : 'mr-2'} animate-spin`} />
                    {t('proposal.buttons.sending')}
                  </>
                ) : (
                  isEditMode ? 'Update Proposal' : t('proposal.buttons.send')
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};