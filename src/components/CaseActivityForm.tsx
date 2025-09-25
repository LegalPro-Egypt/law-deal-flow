import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Clock, FileText } from 'lucide-react';
import { useCaseActivities } from '@/hooks/useCaseActivities';

interface CaseActivityFormProps {
  caseId: string;
  onActivityAdded?: () => void;
}

export const CaseActivityForm: React.FC<CaseActivityFormProps> = ({ caseId, onActivityAdded }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    activity_type: 'progress_update',
    hours_worked: '',
    status: 'completed'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { addActivity } = useCaseActivities(caseId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      await addActivity({
        title: formData.title,
        description: formData.description || undefined,
        activity_type: formData.activity_type,
        hours_worked: formData.hours_worked ? parseFloat(formData.hours_worked) : undefined,
        status: formData.status
      });

      // Reset form
      setFormData({
        title: '',
        description: '',
        activity_type: 'progress_update',
        hours_worked: '',
        status: 'completed'
      });
      
      setIsOpen(false);
      onActivityAdded?.();
    } catch (error) {
      console.error('Failed to add activity:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Progress Update
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Add Case Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Activity Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Document review completed"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Provide details about the work completed..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="activity_type">Activity Type</Label>
              <Select value={formData.activity_type} onValueChange={(value) => handleInputChange('activity_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="progress_update">Progress Update</SelectItem>
                  <SelectItem value="document_review">Document Review</SelectItem>
                  <SelectItem value="research">Legal Research</SelectItem>
                  <SelectItem value="consultation">Client Consultation</SelectItem>
                  <SelectItem value="court_filing">Court Filing</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="hours_worked" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Hours Worked
              </Label>
              <Input
                id="hours_worked"
                type="number"
                step="0.5"
                min="0"
                value={formData.hours_worked}
                onChange={(e) => handleInputChange('hours_worked', e.target.value)}
                placeholder="2.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? 'Adding...' : 'Add Activity'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};