import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Clock, MapPin, Video, Phone, Plus, Users } from 'lucide-react';
import { useAppointments, Appointment } from '@/hooks/useAppointments';
import { useAuth } from '@/hooks/useAuth';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface CaseCalendarProps {
  caseId: string;
  isLawyer: boolean;
  clientId?: string;
  lawyerId?: string;
}

export const CaseCalendar: React.FC<CaseCalendarProps> = ({ 
  caseId, 
  isLawyer, 
  clientId,
  lawyerId 
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    title: '',
    description: '',
        appointment_type: 'consultation',
    scheduled_date: '',
    duration_minutes: 60,
    location: '',
    meeting_link: '',
    notes: '',
  });

  const { appointments, loading, createAppointment } = useAppointments(caseId);
  const { user, profile } = useAuth();

  const getDayAppointments = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(parseISO(apt.scheduled_date), date)
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-info text-info-foreground';
      case 'confirmed':
        return 'bg-success text-success-foreground';
      case 'cancelled':
        return 'bg-destructive text-destructive-foreground';
      case 'completed':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation':
        return <Users className="h-3 w-3" />;
      case 'call':
        return <Phone className="h-3 w-3" />;
      case 'meeting':
        return <Video className="h-3 w-3" />;
      case 'court_hearing':
        return <MapPin className="h-3 w-3" />;
      default:
        return <CalendarIcon className="h-3 w-3" />;
    }
  };

  const handleCreateAppointment = async () => {
    if (!selectedDate || !user) return;

    const appointmentData = {
      ...newAppointment,
      case_id: caseId,
      lawyer_id: lawyerId || (isLawyer ? user.id : ''),
      client_id: clientId || (!isLawyer ? user.id : ''),
      scheduled_date: new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        parseInt(newAppointment.scheduled_date.split(':')[0]) || 9,
        parseInt(newAppointment.scheduled_date.split(':')[1]) || 0
      ).toISOString(),
    };

    const success = await createAppointment(appointmentData);
    if (success) {
      setShowCreateDialog(false);
      setNewAppointment({
        title: '',
        description: '',
        appointment_type: 'consultation',
        scheduled_date: '',
        duration_minutes: 60,
        location: '',
        meeting_link: '',
        notes: '',
      });
    }
  };

  const dayAppointments = selectedDate ? getDayAppointments(selectedDate) : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Case Calendar
        </CardTitle>
        <CardDescription>
          {isLawyer 
            ? "Manage appointments and schedule meetings with your client"
            : "View scheduled appointments and meetings with your lawyer"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <div>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                hasAppointments: (date) => getDayAppointments(date).length > 0,
              }}
              modifiersStyles={{
                hasAppointments: {
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                  color: 'hsl(var(--primary))',
                  fontWeight: 'bold',
                },
              }}
            />
            
            {isLawyer && (
              <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogTrigger asChild>
                  <Button className="w-full mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Appointment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Schedule New Appointment</DialogTitle>
                    <DialogDescription>
                      Create a new appointment for {selectedDate && format(selectedDate, 'MMMM d, yyyy')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Input
                        id="title"
                        value={newAppointment.title}
                        onChange={(e) => setNewAppointment(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Case consultation"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="type">Type</Label>
                      <Select
                        value={newAppointment.appointment_type}
        onValueChange={(value) => 
          setNewAppointment(prev => ({ ...prev, appointment_type: value as any }))
        }
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

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="time">Time</Label>
                        <Input
                          id="time"
                          type="time"
                          value={newAppointment.scheduled_date}
                          onChange={(e) => setNewAppointment(prev => ({ ...prev, scheduled_date: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="duration">Duration (minutes)</Label>
                        <Input
                          id="duration"
                          type="number"
                          value={newAppointment.duration_minutes}
                          onChange={(e) => setNewAppointment(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) || 60 }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newAppointment.description}
                        onChange={(e) => setNewAppointment(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Meeting details..."
                        className="min-h-[60px]"
                      />
                    </div>

                    <div>
                      <Label htmlFor="location">Location / Meeting Link</Label>
                      <Input
                        id="location"
                        value={newAppointment.location || newAppointment.meeting_link}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value.startsWith('http')) {
                            setNewAppointment(prev => ({ ...prev, meeting_link: value, location: '' }));
                          } else {
                            setNewAppointment(prev => ({ ...prev, location: value, meeting_link: '' }));
                          }
                        }}
                        placeholder="Office address or video call link"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleCreateAppointment} className="flex-1">
                        Schedule Appointment
                      </Button>
                      <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {/* Appointments List */}
          <div>
            <h3 className="font-semibold mb-3">
              {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
            </h3>
            
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : dayAppointments.length > 0 ? (
              <div className="space-y-3">
                {dayAppointments.map((appointment) => (
                  <Card key={appointment.id} className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeIcon(appointment.appointment_type)}
                          <h4 className="font-medium text-sm">{appointment.title}</h4>
                          <Badge variant="secondary" className={cn("text-xs", getStatusColor(appointment.status))}>
                            {appointment.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(parseISO(appointment.scheduled_date), 'h:mm a')} ({appointment.duration_minutes}m)
                          </div>
                          {appointment.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {appointment.location}
                            </div>
                          )}
                          {appointment.meeting_link && (
                            <div className="flex items-center gap-1">
                              <Video className="h-3 w-3" />
                              Video Call
                            </div>
                          )}
                        </div>
                        {appointment.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {appointment.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No appointments scheduled for this day</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};