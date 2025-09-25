import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface AppointmentFormData {
  title: string;
  description: string;
  appointment_type: string;
  scheduled_date: string;
  duration_minutes: number;
  location: string;
  meeting_link: string;
  notes: string;
}

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date | undefined;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
}

export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  open,
  onOpenChange,
  selectedDate,
  onSubmit
}) => {
  const [formData, setFormData] = useState<AppointmentFormData>({
    title: '',
    description: '',
    appointment_type: 'consultation',
    scheduled_date: '09:00',
    duration_minutes: 60,
    location: '',
    meeting_link: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        title: '',
        description: '',
        appointment_type: 'consultation',
        scheduled_date: '09:00',
        duration_minutes: 60,
        location: '',
        meeting_link: '',
        notes: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateFormData = (field: keyof AppointmentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (value: string) => {
    if (value.startsWith('http')) {
      updateFormData('meeting_link', value);
      updateFormData('location', '');
    } else {
      updateFormData('location', value);
      updateFormData('meeting_link', '');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule New Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateFormData('title', e.target.value)}
              placeholder="Case consultation"
              required
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="type">Type</Label>
            <Select
              value={formData.appointment_type}
              onValueChange={(value) => updateFormData('appointment_type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="consultation">Consultation</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="call">Phone Call</SelectItem>
                <SelectItem value="court_hearing">Court Hearing</SelectItem>
                <SelectItem value="document_review">Document Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={formData.scheduled_date}
                onChange={(e) => updateFormData('scheduled_date', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (min)</Label>
              <Select
                value={formData.duration_minutes.toString()}
                onValueChange={(value) => updateFormData('duration_minutes', parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              placeholder="Meeting details..."
              className="min-h-[80px]"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">Location / Meeting Link</Label>
            <Input
              id="location"
              value={formData.location || formData.meeting_link}
              onChange={(e) => handleLocationChange(e.target.value)}
              placeholder="Office address or video call link"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handleSubmit} 
            disabled={!formData.title || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};