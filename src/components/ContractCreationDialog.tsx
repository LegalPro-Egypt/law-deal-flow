import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";
import { LanguageToggleButton } from "./LanguageToggleButton";

interface ContractCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string;
  caseId: string;
  lawyerId: string;
  clientId: string;
  onContractCreated?: () => void;
}

export function ContractCreationDialog({
  isOpen,
  onClose,
  proposalId,
  caseId,
  lawyerId,
  clientId,
  onContractCreated
}: ContractCreationDialogProps) {
  const { toast } = useToast();
  const [consultationNotes, setConsultationNotes] = useState("");
  const [language, setLanguage] = useState<'both' | 'en' | 'ar'>('both');
  const [contentEn, setContentEn] = useState("");
  const [contentAr, setContentAr] = useState("");
  const [currentDisplayLanguage, setCurrentDisplayLanguage] = useState<'en' | 'ar'>('en');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Payment structure fields
  const [paymentStructure, setPaymentStructure] = useState<'fixed_fee' | 'contingency' | 'hybrid'>('fixed_fee');
  const [remainingFee, setRemainingFee] = useState(0);
  const [contingencyPercentage, setContingencyPercentage] = useState<number>();
  const [hybridFixedFee, setHybridFixedFee] = useState<number>();
  const [hybridContingencyPercentage, setHybridContingencyPercentage] = useState<number>();
  const [timeline, setTimeline] = useState("");
  const [strategy, setStrategy] = useState("");

  // Fetch and pre-populate from existing proposal
  useEffect(() => {
    const fetchProposalData = async () => {
      if (!proposalId) return;
      
      const { data, error } = await supabase
        .from('proposals')
        .select('*')
        .eq('id', proposalId)
        .single();
      
      if (error) {
        console.error('Error fetching proposal:', error);
        return;
      }

      if (data) {
        setPaymentStructure((data.payment_structure || 'fixed_fee') as 'fixed_fee' | 'contingency' | 'hybrid');
        setRemainingFee(data.remaining_fee || 0);
        setContingencyPercentage(data.contingency_percentage);
        setHybridFixedFee(data.hybrid_fixed_fee);
        setHybridContingencyPercentage(data.hybrid_contingency_percentage);
        setTimeline(data.timeline || '');
        setStrategy(data.strategy || '');
      }
    };
    
    if (isOpen && proposalId) {
      fetchProposalData();
    }
  }, [isOpen, proposalId]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract', {
        body: {
          proposalId,
          consultationNotes,
          language,
          paymentStructure,
          remainingFee,
          contingencyPercentage,
          hybridFixedFee,
          hybridContingencyPercentage,
          timeline,
          strategy
        }
      });

      if (error) throw error;

      if (data.content_en) setContentEn(data.content_en);
      if (data.content_ar) setContentAr(data.content_ar);

      toast({
        title: "Success",
        description: "Contract generated successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate contract",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    if (!contentEn && !contentAr) {
      toast({
        title: "Error",
        description: "Please generate contract content first",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .insert({
          proposal_id: proposalId,
          case_id: caseId,
          lawyer_id: lawyerId,
          client_id: clientId,
          content_en: contentEn || null,
          content_ar: contentAr || null,
          consultation_notes: consultationNotes || null,
          payment_structure: paymentStructure,
          remaining_fee: remainingFee,
          contingency_percentage: contingencyPercentage,
          hybrid_fixed_fee: hybridFixedFee,
          hybrid_contingency_percentage: hybridContingencyPercentage,
          timeline: timeline || null,
          strategy: strategy || null,
          status: 'pending_admin_review'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contract submitted to admin for review"
      });

      onContractCreated?.();
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create contract",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayContent = currentDisplayLanguage === 'en' ? contentEn : contentAr;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Contract</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Payment Structure Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold text-sm">Payment Structure</h3>
            
            <div>
              <Label htmlFor="payment-structure">Payment Structure</Label>
              <Select
                value={paymentStructure}
                onValueChange={(value: 'fixed_fee' | 'contingency' | 'hybrid') => setPaymentStructure(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_fee">Fixed Fee</SelectItem>
                  <SelectItem value="contingency">Contingency</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Fixed + Contingency)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {paymentStructure === 'fixed_fee' && (
              <div>
                <Label htmlFor="remaining-fee">Total Fee (EGP)</Label>
                <Input
                  id="remaining-fee"
                  type="number"
                  value={remainingFee}
                  onChange={(e) => setRemainingFee(Number(e.target.value))}
                  min="0"
                  placeholder="Enter total fee for case work"
                />
              </div>
            )}

            {paymentStructure === 'contingency' && (
              <div>
                <Label htmlFor="contingency-percentage">Contingency Percentage (%)</Label>
                <Input
                  id="contingency-percentage"
                  type="number"
                  value={contingencyPercentage || ''}
                  onChange={(e) => setContingencyPercentage(Number(e.target.value))}
                  min="0"
                  max="100"
                  placeholder="Percentage of case outcome"
                />
              </div>
            )}

            {paymentStructure === 'hybrid' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="hybrid-fixed">Fixed Fee Component (EGP)</Label>
                  <Input
                    id="hybrid-fixed"
                    type="number"
                    value={hybridFixedFee || ''}
                    onChange={(e) => setHybridFixedFee(Number(e.target.value))}
                    min="0"
                    placeholder="Fixed fee portion"
                  />
                </div>
                <div>
                  <Label htmlFor="hybrid-contingency">Contingency Component (%)</Label>
                  <Input
                    id="hybrid-contingency"
                    type="number"
                    value={hybridContingencyPercentage || ''}
                    onChange={(e) => setHybridContingencyPercentage(Number(e.target.value))}
                    min="0"
                    max="100"
                    placeholder="Contingency percentage"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Timeline and Strategy Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="timeline">Timeline</Label>
              <Input
                id="timeline"
                value={timeline}
                onChange={(e) => setTimeline(e.target.value)}
                placeholder="e.g., 4-6 weeks"
              />
            </div>

            <div>
              <Label htmlFor="strategy">Legal Strategy (Optional)</Label>
              <Textarea
                id="strategy"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                placeholder="Describe the legal strategy..."
                rows={3}
              />
            </div>
          </div>

          {/* Consultation Notes */}
          <div>
            <Label htmlFor="consultation-notes">Consultation Notes (Optional)</Label>
            <Textarea
              id="consultation-notes"
              value={consultationNotes}
              onChange={(e) => setConsultationNotes(e.target.value)}
              placeholder="Add any notes from the consultation session..."
              rows={4}
            />
          </div>

          {/* Language Selection */}
          <div>
            <Label htmlFor="language">Generate In</Label>
            <Select
              value={language}
              onValueChange={(value: 'both' | 'en' | 'ar') => setLanguage(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Both Languages</SelectItem>
                <SelectItem value="en">English Only</SelectItem>
                <SelectItem value="ar">Arabic Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate with AI
              </>
            )}
          </Button>

          {(contentEn || contentAr) && (
            <>
              <div className="flex items-center justify-between">
                <Label>Contract Preview</Label>
                <LanguageToggleButton
                  currentLanguage={currentDisplayLanguage}
                  onLanguageChange={setCurrentDisplayLanguage}
                  contentEn={contentEn}
                  contentAr={contentAr}
                />
              </div>

              <Textarea
                value={displayContent}
                onChange={(e) => {
                  if (currentDisplayLanguage === 'en') {
                    setContentEn(e.target.value);
                  } else {
                    setContentAr(e.target.value);
                  }
                }}
                rows={15}
                className={currentDisplayLanguage === 'ar' ? 'text-right' : ''}
                dir={currentDisplayLanguage === 'ar' ? 'rtl' : 'ltr'}
              />
            </>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || (!contentEn && !contentAr)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit to Admin for Review"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}