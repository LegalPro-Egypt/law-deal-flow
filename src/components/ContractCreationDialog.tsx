import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-contract', {
        body: {
          proposalId,
          consultationNotes,
          language
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