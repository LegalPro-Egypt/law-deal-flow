import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Eye, 
  FileText, 
  Users, 
  Shield, 
  Save,
  RefreshCw 
} from 'lucide-react';
import { FormFieldConfiguration } from './FormFieldConfiguration';
import { FormPreviewDialog } from './FormPreviewDialog';
import { useFormConfigurations } from '@/hooks/useFormConfigurations';

interface RealFormsPoliciesLayoutProps {
  type: 'lawyer_forms' | 'client_forms' | 'client_policies' | 'lawyer_policies';
  title: string;
  description: string;
}

export const RealFormsPoliciesLayout = ({ type, title, description }: RealFormsPoliciesLayoutProps) => {
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('configuration');
  
  // Map the type to form configuration type
  const formType = type === 'lawyer_forms' ? 'lawyer_profile' : 'personal_details';
  const isFormType = type.includes('forms');
  
  const {
    configurations,
    presets,
    isLoading,
    isSaving,
    updateConfiguration,
    createPreset,
    deletePreset,
    refetch,
  } = useFormConfigurations(formType);

  if (!isFormType) {
    // For policies, show a simple content editor (placeholder for now)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Edit Policy Content
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Policy Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <p>Policy content management will be available here.</p>
              <p>This will integrate with your existing PrivacyPolicy and TermsOfService components.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading form configurations...</p>
        </div>
      </div>
    );
  }

  const enabledFields = configurations.filter(config => config.is_enabled);
  const requiredFields = configurations.filter(config => config.is_enabled && config.is_required);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {isSaving && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Save className="h-3 w-3" />
              Saving...
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview Form
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refetch}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{configurations.length}</p>
                <p className="text-sm text-muted-foreground">Total Fields</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{enabledFields.length}</p>
                <p className="text-sm text-muted-foreground">Enabled Fields</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{requiredFields.length}</p>
                <p className="text-sm text-muted-foreground">Required Fields</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Field Configuration
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Form Preview
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="configuration" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Field Settings</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure which fields are shown to users and their validation rules. 
                Changes are saved automatically.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {configurations.map((config) => (
                <FormFieldConfiguration
                  key={config.id}
                  configuration={config}
                  presets={presets}
                  onUpdate={updateConfiguration}
                  onCreatePreset={createPreset}
                  onDeletePreset={deletePreset}
                  isSaving={isSaving}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preview" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Form Preview</CardTitle>
              <p className="text-sm text-muted-foreground">
                See how the form looks and behaves with your current settings.
              </p>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setShowPreview(true)}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Open Full Form Preview
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <FormPreviewDialog
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        formType={formType}
        configurations={configurations}
      />
    </div>
  );
};