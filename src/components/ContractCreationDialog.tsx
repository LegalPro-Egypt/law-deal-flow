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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  
  // Payment structure fields
  const [paymentStructure, setPaymentStructure] = useState<'fixed_fee' | 'contingency' | 'hybrid'>('fixed_fee');
  const [remainingFee, setRemainingFee] = useState(0);
  const [contingencyPercentage, setContingencyPercentage] = useState<number>();
  const [hybridFixedFee, setHybridFixedFee] = useState<number>();
  const [hybridContingencyPercentage, setHybridContingencyPercentage] = useState<number>();
  const [timeline, setTimeline] = useState("");
  const [strategy, setStrategy] = useState("");
  const [isLoadingProposal, setIsLoadingProposal] = useState(true);

  // Fetch session token and pre-populate from existing proposal
  useEffect(() => {
    const initialize = async () => {
      if (!proposalId) return;
      
      setIsLoadingProposal(true);
      
      // Get current session token
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.access_token) {
        setSessionToken(sessionData.session.access_token);
      }
      
      const { data, error } = await supabase
        .from('proposals')
        .select('timeline, strategy, remaining_fee, consultation_fee, payment_structure, contingency_percentage, hybrid_fixed_fee, hybrid_contingency_percentage')
        .eq('id', proposalId)
        .single();
      
      if (error) {
        console.error('Error fetching proposal:', error);
        setIsLoadingProposal(false);
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
      
      setIsLoadingProposal(false);
    };
    
    if (isOpen && proposalId) {
      initialize();
    }
  }, [isOpen, proposalId]);

  const handleGenerate = async () => {
    if (!sessionToken) {
      toast({
        title: "Authentication Error",
        description: "Please wait for authentication to complete",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    const startTime = Date.now();
    
    // Show progress toast
    const progressToast = toast({
      title: "Generating Contract",
      description: "Generating scope and assembling contract...",
      duration: 30000
    });

    try {
      const { data, error } = await supabase.functions.invoke('generate-contract', {
        headers: {
          Authorization: `Bearer ${sessionToken}`
        },
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

      if (error) {
        // Handle specific error codes
        if (error.message?.includes('429')) {
          throw new Error('Rate limit exceeded. Please try again in a few minutes.');
        }
        if (error.message?.includes('402')) {
          throw new Error('Payment required. Please add credits to continue.');
        }
        if (error.message?.includes('timed out') || error.message?.includes('timeout')) {
          throw new Error('Contract generation timed out. Please try again or select a single language for faster generation.');
        }
        if (error.message?.includes('Proposal not found')) {
          throw new Error('Unable to access proposal. Please try refreshing the page.');
        }
        throw error;
      }

      if (data.content_en) setContentEn(data.content_en);
      if (data.content_ar) setContentAr(data.content_ar);

      const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
      progressToast.dismiss();
      
      const usedFallback = data.used_fallback;
      toast({
        title: "Success",
        description: `Contract generated in ${elapsedTime}s${usedFallback ? ' (using fallback scope)' : ''}`
      });
    } catch (error: any) {
      console.error('Contract generation error:', error);
      progressToast.dismiss();
      
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate contract. Please try again.",
        variant: "destructive",
        duration: 7000
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
          {isLoadingProposal ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              {/* Payment Structure Section */}
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">Payment Structure</h3>
                  <Badge variant="outline" className="text-xs">From Proposal</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Pre-filled from proposal. You can edit if needed before generating.</p>
            
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
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor="timeline">Timeline</Label>
                    {timeline && <Badge variant="outline" className="text-xs">From Proposal</Badge>}
                  </div>
                  <Input
                    id="timeline"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    placeholder="e.g., 4-6 weeks"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Editable reference for contract generation</p>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Label htmlFor="strategy">Legal Strategy</Label>
                    {strategy && <Badge variant="outline" className="text-xs">From Proposal</Badge>}
                  </div>
                  <Textarea
                    id="strategy"
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    placeholder="Describe the legal strategy for this case..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Editable reference for contract generation</p>
                </div>
              </div>
            </>
          )}

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
            disabled={isGenerating || !proposalId || !sessionToken}
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