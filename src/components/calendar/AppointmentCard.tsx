import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, Video, Phone, Users, CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Appointment } from '@/hooks/useAppointments';

interface AppointmentCardProps {
  appointment: Appointment;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'default';
    case 'cancelled':
      return 'destructive';
    case 'completed':
      return 'secondary';
    default:
      return 'outline';
  }
};

const getTypeIcon = (type: string) => {
  const iconClass = "h-4 w-4 text-muted-foreground";
  switch (type) {
    case 'consultation':
      return <Users className={iconClass} />;
    case 'call':
      return <Phone className={iconClass} />;
    case 'meeting':
      return <Video className={iconClass} />;
    case 'court_hearing':
      return <MapPin className={iconClass} />;
    default:
      return <CalendarIcon className={iconClass} />;
  }
};

export const AppointmentCard: React.FC<AppointmentCardProps> = ({ appointment }) => {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-primary/20">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getTypeIcon(appointment.appointment_type)}
            <h4 className="font-semibold text-foreground">{appointment.title}</h4>
          </div>
          <Badge variant={getStatusVariant(appointment.status)} className="text-xs">
            {appointment.status}
          </Badge>
        </div>

        {/* Time and Duration */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {format(parseISO(appointment.scheduled_date), 'h:mm a')}
            <span className="mx-1">•</span>
            {appointment.duration_minutes}m
          </span>
        </div>

        {/* Location or Meeting Link */}
        {(appointment.location || appointment.meeting_link) && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {appointment.location ? (
              <>
                <MapPin className="h-4 w-4" />
                <span>{appointment.location}</span>
              </>
            ) : (
              <>
                <Video className="h-4 w-4" />
                <span>Video Meeting</span>
              </>
            )}
          </div>
        )}

        {/* Description */}
        {appointment.description && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {appointment.description}
          </p>
        )}
      </div>
    </Card>
  );
};