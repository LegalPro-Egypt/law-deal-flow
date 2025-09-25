import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, MapPin, Video, Plus, Users, FileText, Phone, Gavel } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Appointment } from '@/hooks/useAppointments';

interface GroupedAppointments {
  morning: Appointment[];
  afternoon: Appointment[];
  evening: Appointment[];
}

interface AgendaListProps {
  selectedDate: Date;
  appointments: Appointment[];
  groupedAppointments: GroupedAppointments;
  loading: boolean;
  onScheduleClick: () => void;
  showScheduleButton: boolean;
}

const AppointmentTypeIcon = ({ type }: { type: string }) => {
  const icons = {
    consultation: Users,
    meeting: Users,
    call: Phone,
    court_hearing: Gavel,
    document_review: FileText,
  };
  
  const Icon = icons[type as keyof typeof icons] || Users;
  return <Icon className="h-4 w-4" />;
};

const AppointmentCard = ({ appointment }: { appointment: Appointment }) => {
  const startTime = format(new Date(appointment.scheduled_date), 'h:mm a');
  const endTime = format(
    new Date(new Date(appointment.scheduled_date).getTime() + appointment.duration_minutes * 60000),
    'h:mm a'
  );

  const getTypeColor = (type: string) => {
    const colors = {
      consultation: 'bg-blue-100 text-blue-700 border-blue-200',
      meeting: 'bg-green-100 text-green-700 border-green-200',
      call: 'bg-purple-100 text-purple-700 border-purple-200',
      court_hearing: 'bg-red-100 text-red-700 border-red-200',
      document_review: 'bg-orange-100 text-orange-700 border-orange-200',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <Card className="p-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-primary/20">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <AppointmentTypeIcon type={appointment.appointment_type} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-medium text-foreground truncate">
                {appointment.title}
              </h3>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{startTime} - {endTime}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>({appointment.duration_minutes}m)</span>
                </div>
              </div>
            </div>
            
            <Badge 
              variant="outline"
              className={cn("text-xs", getTypeColor(appointment.appointment_type))}
            >
              {appointment.appointment_type.replace('_', ' ')}
            </Badge>
          </div>

          {appointment.description && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {appointment.description}
            </p>
          )}

          {(appointment.location || appointment.meeting_link) && (
            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
              {appointment.meeting_link ? (
                <>
                  <Video className="h-3 w-3" />
                  <span>Video call</span>
                </>
              ) : (
                <>
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{appointment.location}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const TimeSection = ({ 
  title, 
  appointments, 
  icon: Icon 
}: { 
  title: string; 
  appointments: Appointment[];
  icon: React.ComponentType<{ className?: string }>;
}) => {
  if (appointments.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          {title} ({appointments.length})
        </h3>
      </div>
      <div className="space-y-2">
        {appointments.map((appointment) => (
          <AppointmentCard key={appointment.id} appointment={appointment} />
        ))}
      </div>
    </div>
  );
};

export const AgendaList: React.FC<AgendaListProps> = ({
  selectedDate,
  appointments,
  groupedAppointments,
  loading,
  onScheduleClick,
  showScheduleButton,
}) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <Card className="p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted/50 p-4 mb-4">
            <CalendarIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-medium text-foreground mb-2">No appointments</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            No appointments are scheduled for {format(selectedDate, 'EEEE, MMMM d')}
          </p>
          {showScheduleButton && (
            <Button
              onClick={onScheduleClick}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Schedule Appointment
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Schedule Button */}
      {showScheduleButton && (
        <Button
          onClick={onScheduleClick}
          className="w-full bg-primary hover:bg-primary/90"
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Schedule New Appointment
        </Button>
      )}

      {/* Grouped Appointments */}
      <div className="space-y-6">
        <TimeSection 
          title="Morning"
          appointments={groupedAppointments.morning}
          icon={Clock}
        />
        <TimeSection 
          title="Afternoon"
          appointments={groupedAppointments.afternoon}
          icon={Clock}
        />
        <TimeSection 
          title="Evening"
          appointments={groupedAppointments.evening}
          icon={Clock}
        />
      </div>
      
      {/* Timezone hint */}
      <div className="text-xs text-muted-foreground text-center py-2">
        Times shown in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
      </div>
    </div>
  );
};