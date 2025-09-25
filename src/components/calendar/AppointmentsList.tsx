import React from 'react';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { AppointmentCard } from './AppointmentCard';
import { Appointment } from '@/hooks/useAppointments';

interface AppointmentsListProps {
  selectedDate: Date | undefined;
  appointments: Appointment[];
  loading: boolean;
}

export const AppointmentsList: React.FC<AppointmentsListProps> = ({
  selectedDate,
  appointments,
  loading
}) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-muted/50 p-4 mb-4">
          <CalendarIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-2">No appointments</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          No appointments are scheduled for this day. Select a date to view or schedule appointments.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((appointment) => (
        <AppointmentCard key={appointment.id} appointment={appointment} />
      ))}
    </div>
  );
};