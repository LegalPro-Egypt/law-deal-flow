import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LawyerProfileForm } from '@/components/LawyerProfileForm';
import { PersonalDetailsForm } from '@/components/PersonalDetailsForm';
import { FormConfiguration } from '@/hooks/useFormConfigurations';

interface FormPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formType: 'lawyer_profile' | 'personal_details';
  configurations: FormConfiguration[];
}

export const FormPreviewDialog = ({
  isOpen,
  onClose,
  formType,
  configurations,
}: FormPreviewDialogProps) => {
  const enabledFields = configurations.filter(config => config.is_enabled);
  const requiredFields = configurations.filter(config => config.is_enabled && config.is_required);

  const handleLawyerFormComplete = () => {
    console.log('Lawyer form completed in preview');
    // This is just a preview, so we don't actually submit
  };

  const handlePersonalFormSubmit = (data: any) => {
    console.log('Personal form submitted with data:', data);
    // This is just a preview, so we don't actually submit
  };

  const handleBack = () => {
    console.log('Back clicked in preview');
    // This is just a preview, so we don't actually navigate
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Form Preview: {formType === 'lawyer_profile' ? 'Lawyer Registration' : 'Personal Details'}
            <Badge variant="outline">{enabledFields.length} fields enabled</Badge>
            <Badge variant="default">{requiredFields.length} required</Badge>
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="p-4">
            {formType === 'lawyer_profile' ? (
              <LawyerProfileForm
                onComplete={handleLawyerFormComplete}
                // We could pass configurations here to dynamically modify the form
                // For now, showing the form as-is for preview
              />
            ) : (
              <PersonalDetailsForm
                onSubmit={handlePersonalFormSubmit}
                onBack={handleBack}
                // We could pass configurations here to dynamically modify the form
                // For now, showing the form as-is for preview
              />
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};