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

  const handleInputChange = (field: keyof ProposalForm, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateProposal = async () => {
    if (!formData.strategy.trim()) {
      toast({
        title: "Strategy Required",
        description: "Please provide your legal strategy before generating the proposal.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-proposal', {
        body: {
          caseId,
          proposalInput: formData
        }
      });

      if (error) throw error;

      setGeneratedProposal(data.generatedProposal);
      setActiveTab("preview");
      
      toast({
        title: "Proposal Generated",
        description: "Your AI-powered proposal has been created successfully."
      });
    } catch (error) {
      console.error('Error generating proposal:', error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate proposal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sendProposal = async () => {
    if (!generatedProposal) {
      toast({
        title: "No Proposal",
        description: "Please generate a proposal first.",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      // Update case with proposal details
      const { error: updateError } = await supabase
        .from('cases')
        .update({
          consultation_fee: formData.consultation_fee,
          remaining_fee: formData.remaining_fee,
          total_fee: formData.consultation_fee + formData.remaining_fee,
          status: 'proposal_sent'
        })
        .eq('id', caseId);

      if (updateError) throw updateError;

      // Send proposal as a message
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('case_id', caseId)
        .single();

      if (conversation) {
        const { error: messageError } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversation.id,
            role: 'lawyer',
            content: `📋 **Legal Proposal - ${caseTitle}**

${generatedProposal}

---
**Quick Summary:**
• Consultation Fee: $${formData.consultation_fee.toLocaleString()}
• Remaining Fee: $${formData.remaining_fee.toLocaleString()}
• **Total Fee: $${(formData.consultation_fee + formData.remaining_fee).toLocaleString()}**
• Estimated Timeline: ${formData.timeline}

Please review this proposal and let me know if you have any questions or would like to discuss any aspects further.`,
            message_type: 'proposal',
            metadata: {
              proposal_data: {
                consultation_fee: formData.consultation_fee,
                remaining_fee: formData.remaining_fee,
                total_fee: formData.consultation_fee + formData.remaining_fee,
                timeline: formData.timeline,
                strategy: formData.strategy
              }
            }
          });

        if (messageError) throw messageError;
      }

      toast({
        title: "Proposal Sent",
        description: `Your professional proposal has been sent to ${clientName}.`
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
        title: "Send Failed",
        description: "Failed to send proposal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create AI-Powered Proposal
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {caseTitle} • {clientName}
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="form">Proposal Details</TabsTrigger>
            <TabsTrigger value="preview" disabled={!generatedProposal}>
              Preview & Send
            </TabsTrigger>
          </TabsList>

          <TabsContent value="form" className="space-y-6 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fee Structure
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="consultation_fee">Consultation Fee ($)</Label>
                    <Input
                      id="consultation_fee"
                      type="number"
                      value={formData.consultation_fee}
                      onChange={(e) => handleInputChange('consultation_fee', Number(e.target.value))}
                      min="0"
                      step="50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="remaining_fee">Remaining Fee ($)</Label>
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
                    <span>Total Fee:</span>
                    <span>${(formData.consultation_fee + formData.remaining_fee).toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="timeline">Estimated Timeline</Label>
                  <Input
                    id="timeline"
                    value={formData.timeline}
                    onChange={(e) => handleInputChange('timeline', e.target.value)}
                    placeholder="e.g., 4-6 weeks"
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Legal Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Label htmlFor="strategy">Your Approach & Strategy</Label>
                <Textarea
                  id="strategy"
                  value={formData.strategy}
                  onChange={(e) => handleInputChange('strategy', e.target.value)}
                  placeholder="Describe your legal strategy, approach, and key points you'll address in this case..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This will be used by AI to generate a comprehensive proposal with professional legal language.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                onClick={generateProposal} 
                disabled={isGenerating || !formData.strategy.trim()}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate AI Proposal'
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4 overflow-y-auto max-h-[60vh]">
            {generatedProposal && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generated Proposal</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap bg-muted p-4 rounded-md">
                    {generatedProposal}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("form")}>
                Back to Edit
              </Button>
              <Button onClick={sendProposal} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Proposal'
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};