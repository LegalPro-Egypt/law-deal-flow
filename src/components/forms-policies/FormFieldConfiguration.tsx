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
      <CardContent className="p-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col xs:flex-row xs:items-center gap-2 min-w-0 flex-1">
            <span className="font-medium truncate text-sm">{configuration.label_override || getFieldDisplayName(configuration.field_name)}</span>
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant={configuration.is_required ? 'default' : 'secondary'} className="text-xs px-1.5 py-0 whitespace-nowrap">
                {configuration.is_required ? 'Required' : 'Optional'}
              </Badge>
              {hasPresets && (
                <Badge variant="outline" className="text-xs px-1.5 py-0 whitespace-nowrap">
                  {fieldPresets.length}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 self-start sm:self-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 w-7 p-0"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </Button>
            <Switch
              checked={configuration.is_enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={isSaving}
            />
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 pt-3 border-t space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Field Status</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`required-${configuration.id}`}
                    checked={configuration.is_required}
                    onCheckedChange={handleToggleRequired}
                    disabled={isSaving}
                  />
                  <Label htmlFor={`required-${configuration.id}`} className="text-sm">Required field</Label>
                </div>
              </div>
              
              <div className="space-y-1">
                <Label htmlFor={`label-${configuration.id}`} className="text-xs">Custom Label</Label>
                <Input
                  id={`label-${configuration.id}`}
                  value={configuration.label_override || ''}
                  onChange={(e) => handleUpdateLabelOverride(e.target.value)}
                  placeholder={getFieldDisplayName(configuration.field_name)}
                  disabled={isSaving}
                  className="h-8 text-sm"
                />
              </div>
            </div>
            
            <div className="space-y-1">
              <Label htmlFor={`help-${configuration.id}`} className="text-xs">Help Text</Label>
              <Textarea
                id={`help-${configuration.id}`}
                value={configuration.help_text || ''}
                onChange={(e) => handleUpdateHelpText(e.target.value)}
                placeholder="Enter helpful information for users"
                rows={2}
                disabled={isSaving}
                className="text-sm resize-none"
              />
            </div>

            {hasPresets && (
              <div className="space-y-2">
                <Label className="text-xs">Available Options</Label>
                <div className="space-y-1">
                  {fieldPresets.map((preset) => (
                    <div key={preset.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs min-w-0">
                      <div className="flex-1 min-w-0 pr-1">
                        <span className="block truncate font-medium text-xs">{preset.option_label}</span>
                        <span className="text-xs text-muted-foreground truncate">({preset.option_value})</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeletePreset(preset.id, configuration.field_name)}
                        disabled={isSaving}
                        className="h-5 w-5 p-0 flex-shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex gap-1">
                      <Input
                        placeholder="Value"
                        value={newOptionValue}
                        onChange={(e) => setNewOptionValue(e.target.value)}
                        disabled={isSaving}
                        className="flex-1 h-7 text-xs min-w-0"
                      />
                      <Input
                        placeholder="Label"
                        value={newOptionLabel}
                        onChange={(e) => setNewOptionLabel(e.target.value)}
                        disabled={isSaving}
                        className="flex-1 h-7 text-xs min-w-0"
                      />
                      <Button
                        onClick={handleAddPreset}
                        disabled={!newOptionValue.trim() || !newOptionLabel.trim() || isSaving}
                        size="sm"
                        className="h-7 w-7 p-0 flex-shrink-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};