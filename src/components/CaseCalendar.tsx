import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Sparkles } from 'lucide-react';
import { useAppointments } from '@/hooks/useAppointments';
import { useAuth } from '@/hooks/useAuth';
import { format, isSameDay, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { AppointmentForm } from './calendar/AppointmentForm';
import { AppointmentsList } from './calendar/AppointmentsList';

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

  const { appointments, loading, createAppointment } = useAppointments(caseId);
  const { user } = useAuth();

  const getDayAppointments = (date: Date) => {
    return appointments.filter(apt => 
      isSameDay(parseISO(apt.scheduled_date), date)
    );
  };

  const handleCreateAppointment = async (appointmentData: any) => {
    if (!selectedDate || !user) return;

    const fullAppointmentData = {
      ...appointmentData,
      case_id: caseId,
      lawyer_id: lawyerId || (isLawyer ? user.id : ''),
      client_id: clientId || (!isLawyer ? user.id : ''),
      scheduled_date: new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        parseInt(appointmentData.scheduled_date.split(':')[0]) || 9,
        parseInt(appointmentData.scheduled_date.split(':')[1]) || 0
      ).toISOString(),
    };

    const success = await createAppointment(fullAppointmentData);
    if (success) {
      setShowCreateDialog(false);
    }
  };

  const dayAppointments = selectedDate ? getDayAppointments(selectedDate) : [];

  return (
    <div className="space-y-6">
      {/* Main Content */}
      <div className="grid lg:grid-cols-[400px_1fr] gap-8">
        {/* Calendar Section */}
        <Card className="lg:sticky lg:top-6 h-fit">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Select Date</CardTitle>
            <CardDescription>
              Choose a date to view or schedule appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-lg border-0"
              modifiers={{
                hasAppointments: (date) => getDayAppointments(date).length > 0,
              }}
              modifiersStyles={{
                hasAppointments: {
                  backgroundColor: 'hsl(var(--primary) / 0.1)',
                  color: 'hsl(var(--primary))',
                  fontWeight: 'bold',
                  border: '2px solid hsl(var(--primary) / 0.2)',
                },
              }}
            />
          </CardContent>
        </Card>

        {/* Appointments Section */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
                </CardTitle>
                <CardDescription>
                  {dayAppointments.length > 0 
                    ? `${dayAppointments.length} appointment${dayAppointments.length > 1 ? 's' : ''} scheduled`
                    : 'No appointments scheduled'
                  }
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {isLawyer && selectedDate && (
                  <Button 
                    onClick={() => setShowCreateDialog(true)}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Schedule
                  </Button>
                )}
                {dayAppointments.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{dayAppointments.length} meetings</span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AppointmentsList
              selectedDate={selectedDate}
              appointments={dayAppointments}
              loading={loading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Appointment Form Dialog */}
      <AppointmentForm
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        selectedDate={selectedDate}
        onSubmit={handleCreateAppointment}
      />
    </div>
  );
};