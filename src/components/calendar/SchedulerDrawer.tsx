import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Clock, MapPin, Video, FileText, Users, Phone, Gavel } from 'lucide-react';
import { cn } from '@/lib/utils';

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

interface SchedulerDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: Date;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  isMobile: boolean;
}

const appointmentTypes = [
  { value: 'consultation', label: 'Consultation', icon: Users, description: 'Client meeting or consultation' },
  { value: 'meeting', label: 'Meeting', icon: Users, description: 'General meeting' },
  { value: 'call', label: 'Phone Call', icon: Phone, description: 'Telephone consultation' },
  { value: 'court_hearing', label: 'Court Hearing', icon: Gavel, description: 'Court appearance' },
  { value: 'document_review', label: 'Document Review', icon: FileText, description: 'Document review session' },
];

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30'
];

const durations = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
  { value: 180, label: '3 hours' },
];

export const SchedulerDrawer: React.FC<SchedulerDrawerProps> = ({
  open,
  onOpenChange,
  selectedDate,
  onSubmit,
  isMobile,
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
    if (!formData.title.trim()) return;
    
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

  const handleTypeChange = (type: string) => {
    updateFormData('appointment_type', type);
    const typeData = appointmentTypes.find(t => t.value === type);
    if (typeData && !formData.title) {
      updateFormData('title', typeData.label);
    }
  };

  const FormContent = () => (
    <div className="space-y-6">
      {/* Appointment Type Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Appointment Type</Label>
        <div className="grid grid-cols-1 gap-2">
          {appointmentTypes.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                onClick={() => handleTypeChange(type.value)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                  formData.appointment_type === type.value
                    ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  formData.appointment_type === type.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs text-muted-foreground">{type.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => updateFormData('title', e.target.value)}
          placeholder="Enter appointment title"
          required
        />
      </div>

      {/* Time and Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Time</Label>
          <Select
            value={formData.scheduled_date}
            onValueChange={(value) => updateFormData('scheduled_date', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((time) => (
                <SelectItem key={time} value={time}>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    {time}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Duration</Label>
          <Select
            value={formData.duration_minutes.toString()}
            onValueChange={(value) => updateFormData('duration_minutes', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durations.map((duration) => (
                <SelectItem key={duration.value} value={duration.value.toString()}>
                  {duration.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData('description', e.target.value)}
          placeholder="Add details about this appointment..."
          className="min-h-[80px]"
        />
      </div>

      {/* Location / Meeting Link */}
      <div className="space-y-2">
        <Label htmlFor="location">Location / Meeting Link</Label>
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {formData.meeting_link ? (
              <Video className="h-4 w-4 text-muted-foreground" />
            ) : (
              <MapPin className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <Input
            id="location"
            value={formData.location || formData.meeting_link}
            onChange={(e) => handleLocationChange(e.target.value)}
            placeholder="Office address or video call link"
            className="pl-10"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateFormData('notes', e.target.value)}
          placeholder="Additional notes or reminders..."
          className="min-h-[60px]"
        />
      </div>

      {/* Submit Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={!formData.title.trim() || isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Scheduling...' : 'Schedule Appointment'}
        </Button>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] p-6">
          <DrawerHeader className="px-0 pb-4">
            <DrawerTitle>Schedule Appointment</DrawerTitle>
            <DrawerDescription>
              Create a new appointment for {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1">
            <FormContent />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule Appointment</DialogTitle>
          <DialogDescription>
            Create a new appointment for {selectedDate && format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </DialogDescription>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
};