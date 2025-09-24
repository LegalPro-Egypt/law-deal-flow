import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, DollarSign, Clock, FileText } from 'lucide-react';
import { useAdditionalFeeRequests, CreateFeeRequestData } from '@/hooks/useAdditionalFeeRequests';

interface LawyerCase {
  id: string;
  case_number: string;
  title: string;
  client_name?: string;
  status: string;
}

interface AdditionalFeeRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeCases: LawyerCase[];
}

export const AdditionalFeeRequestDialog: React.FC<AdditionalFeeRequestDialogProps> = ({
  open,
  onOpenChange,
  activeCases,
}) => {
  const { createRequest, creating } = useAdditionalFeeRequests();
  const [formData, setFormData] = useState<CreateFeeRequestData>({
    case_id: '',
    request_title: '',
    request_description: '',
    additional_fee_amount: 0,
    timeline_extension_days: 0,
    justification: '',
  });

  const handleInputChange = (field: keyof CreateFeeRequestData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.case_id || !formData.request_title || !formData.additional_fee_amount || !formData.justification) {
      return;
    }

    const success = await createRequest(formData);
    if (success) {
      // Reset form
      setFormData({
        case_id: '',
        request_title: '',
        request_description: '',
        additional_fee_amount: 0,
        timeline_extension_days: 0,
        justification: '',
      });
      onOpenChange(false);
    }
  };

  const selectedCase = activeCases.find(c => c.id === formData.case_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Request Additional Fees
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Case Selection */}
          <div className="space-y-2">
            <Label htmlFor="case_id">Select Case</Label>
            <Select 
              value={formData.case_id} 
              onValueChange={(value) => handleInputChange('case_id', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose an active case" />
              </SelectTrigger>
              <SelectContent>
                {activeCases.map((case_) => (
                  <SelectItem key={case_.id} value={case_.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{case_.case_number}</span>
                      <span className="text-sm text-muted-foreground">{case_.title}</span>
                      {case_.client_name && (
                        <span className="text-xs text-muted-foreground">Client: {case_.client_name}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedCase && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="space-y-1">
                  <p className="font-medium">{selectedCase.case_number}</p>
                  <p className="text-sm text-muted-foreground">{selectedCase.title}</p>
                  {selectedCase.client_name && (
                    <p className="text-sm text-muted-foreground">Client: {selectedCase.client_name}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Request Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="request_title">Request Title</Label>
              <Input
                id="request_title"
                value={formData.request_title}
                onChange={(e) => handleInputChange('request_title', e.target.value)}
                placeholder="e.g., Additional Document Review"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="additional_fee_amount" className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                Additional Fee Amount
              </Label>
              <Input
                id="additional_fee_amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.additional_fee_amount || ''}
                onChange={(e) => handleInputChange('additional_fee_amount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeline_extension_days" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Timeline Extension (Days)
            </Label>
            <Input
              id="timeline_extension_days"
              type="number"
              min="0"
              value={formData.timeline_extension_days || ''}
              onChange={(e) => handleInputChange('timeline_extension_days', parseInt(e.target.value) || 0)}
              placeholder="0 (optional)"
            />
            <p className="text-xs text-muted-foreground">
              Additional days needed to complete the work (optional)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="request_description">Request Description</Label>
            <Textarea
              id="request_description"
              value={formData.request_description}
              onChange={(e) => handleInputChange('request_description', e.target.value)}
              placeholder="Describe the additional work required..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification" className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              Justification
            </Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => handleInputChange('justification', e.target.value)}
              placeholder="Explain why this additional work was not covered in the original proposal..."
              rows={4}
              required
            />
            <p className="text-xs text-muted-foreground">
              Provide a clear explanation of why this additional work is necessary and wasn't included in the original scope.
            </p>
          </div>

          {/* Fee Summary */}
          {formData.additional_fee_amount > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Fee Request Summary</h4>
                  <div className="flex justify-between items-center">
                    <span>Additional Fee:</span>
                    <span className="font-medium">${formData.additional_fee_amount.toFixed(2)}</span>
                  </div>
                  {formData.timeline_extension_days > 0 && (
                    <div className="flex justify-between items-center">
                      <span>Timeline Extension:</span>
                      <span className="font-medium">{formData.timeline_extension_days} days</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={creating || !formData.case_id || !formData.request_title || !formData.additional_fee_amount || !formData.justification}
            >
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};