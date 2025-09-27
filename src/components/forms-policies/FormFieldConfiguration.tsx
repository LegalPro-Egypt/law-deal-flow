import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Settings2 } from 'lucide-react';
import { FormConfiguration, FormFieldPreset, useFormConfigurations } from '@/hooks/useFormConfigurations';

interface FormFieldConfigurationProps {
  configuration: FormConfiguration;
  presets: Record<string, FormFieldPreset[]>;
  onUpdate: (configId: string, updates: Partial<FormConfiguration>) => void;
  onCreatePreset: (presetType: string, value: string, label: string) => void;
  onDeletePreset: (presetId: string, presetType: string) => void;
  isSaving: boolean;
}

export const FormFieldConfiguration = ({
  configuration,
  presets,
  onUpdate,
  onCreatePreset,
  onDeletePreset,
  isSaving,
}: FormFieldConfigurationProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionLabel, setNewOptionLabel] = useState('');

  const fieldPresets = presets[configuration.field_name] || [];
  const hasPresets = ['specializations', 'languages', 'barAdmissions'].includes(configuration.field_name);

  const handleToggleEnabled = (enabled: boolean) => {
    onUpdate(configuration.id, { is_enabled: enabled });
  };

  const handleToggleRequired = (required: boolean) => {
    onUpdate(configuration.id, { is_required: required });
  };

  const handleUpdateHelpText = (helpText: string) => {
    onUpdate(configuration.id, { help_text: helpText });
  };

  const handleUpdateLabelOverride = (labelOverride: string) => {
    onUpdate(configuration.id, { label_override: labelOverride });
  };

  const handleAddPreset = () => {
    if (newOptionValue.trim() && newOptionLabel.trim()) {
      onCreatePreset(configuration.field_name, newOptionValue.trim(), newOptionLabel.trim());
      setNewOptionValue('');
      setNewOptionLabel('');
    }
  };

  const getFieldDisplayName = (fieldName: string): string => {
    const fieldNames: Record<string, string> = {
      firstName: 'First Name',
      lastName: 'Last Name',
      officePhone: 'Office Phone',
      privatePhone: 'Private Phone',
      officeAddress: 'Office Address',
      birthDate: 'Birth Date',
      lawFirm: 'Law Firm',
      teamSize: 'Team Size',
      yearsExperience: 'Years of Experience',
      licenseNumber: 'License Number',
      bio: 'Professional Biography',
      specializations: 'Specializations',
      barAdmissions: 'Bar Admissions',
      languages: 'Languages',
      fullName: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number',
      preferredLanguage: 'Preferred Language',
      address: 'Address',
      alternateContact: 'Alternate Contact',
    };
    return fieldNames[fieldName] || fieldName;
  };

  return (
    <Card className={`transition-all duration-200 ${configuration.is_enabled ? '' : 'opacity-60'}`}>
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center min-w-0">
            <span className="text-base font-semibold truncate">{configuration.label_override || getFieldDisplayName(configuration.field_name)}</span>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={configuration.is_required ? 'default' : 'secondary'} className="text-xs">
                {configuration.is_required ? 'Required' : 'Optional'}
              </Badge>
              {hasPresets && (
                <Badge variant="outline" className="text-xs">
                  {fieldPresets.length} options
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <Settings2 className="h-4 w-4" />
            </Button>
            <Switch
              checked={configuration.is_enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isSaving}
            />
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Field Status</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id={`required-${configuration.id}`}
                  checked={configuration.is_required}
                  onCheckedChange={handleToggleRequired}
                  disabled={isSaving}
                />
                <Label htmlFor={`required-${configuration.id}`}>Required field</Label>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor={`label-${configuration.id}`}>Custom Label (optional)</Label>
              <Input
                id={`label-${configuration.id}`}
                value={configuration.label_override || ''}
                onChange={(e) => handleUpdateLabelOverride(e.target.value)}
                placeholder={getFieldDisplayName(configuration.field_name)}
                disabled={isSaving}
                className="w-full"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor={`help-${configuration.id}`}>Help Text</Label>
            <Textarea
              id={`help-${configuration.id}`}
              value={configuration.help_text || ''}
              onChange={(e) => handleUpdateHelpText(e.target.value)}
              placeholder="Enter helpful information for users filling out this field"
              rows={3}
              disabled={isSaving}
            />
          </div>

          {hasPresets && (
            <div className="space-y-3">
              <Label>Available Options</Label>
              <div className="space-y-2">
                {fieldPresets.map((preset) => (
                  <div key={preset.id} className="flex items-center justify-between p-2 bg-muted rounded-lg min-w-0">
                    <div className="flex-1 min-w-0">
                      <span className="block truncate">{preset.option_label}</span>
                      <span className="text-xs text-muted-foreground">({preset.option_value})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeletePreset(preset.id, configuration.field_name)}
                      disabled={isSaving}
                      className="flex-shrink-0 ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    placeholder="Value (e.g. family_law)"
                    value={newOptionValue}
                    onChange={(e) => setNewOptionValue(e.target.value)}
                    disabled={isSaving}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Label (e.g. Family Law)"
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    disabled={isSaving}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAddPreset}
                    disabled={!newOptionValue.trim() || !newOptionLabel.trim() || isSaving}
                    size="sm"
                    className="flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
};