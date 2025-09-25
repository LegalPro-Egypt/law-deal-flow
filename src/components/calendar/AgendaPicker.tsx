import React, { useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, ChevronUp, Calendar, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAgendaPicker } from '@/hooks/useAgendaPicker';
import { useIsMobile } from '@/hooks/use-mobile';
import { WeekStrip } from './WeekStrip';
import { MonthView } from './MonthView';
import { AgendaList } from './AgendaList';
import { SchedulerDrawer } from './SchedulerDrawer';

interface AgendaPickerProps {
  caseId: string;
  isLawyer: boolean;
  clientId?: string;
  lawyerId?: string;
}

export const AgendaPicker: React.FC<AgendaPickerProps> = ({
  caseId,
  isLawyer,
  clientId,
  lawyerId,
}) => {
  const isMobile = useIsMobile();
  const [showScheduler, setShowScheduler] = React.useState(false);
  
  const {
    state,
    appointments,
    groupedAppointments,
    weekDays,
    monthDays,
    loading,
    actions,
  } = useAgendaPicker(caseId);

  // Handle scroll to collapse calendar
  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const isScrolling = scrollY > 100;
      
      if (isScrolling !== state.isScrolling) {
        actions.setScrolling(isScrolling);
        if (isScrolling && state.viewMode !== 'collapsed') {
          actions.setViewMode('collapsed');
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile, state.isScrolling, state.viewMode, actions]);

  const handleCreateAppointment = async (appointmentData: any) => {
    const fullAppointmentData = {
      ...appointmentData,
      case_id: caseId,
      lawyer_id: lawyerId || (isLawyer ? 'current-user' : ''),
      client_id: clientId || (!isLawyer ? 'current-user' : ''),
      scheduled_date: new Date(
        state.selectedDate.getFullYear(),
        state.selectedDate.getMonth(),
        state.selectedDate.getDate(),
        parseInt(appointmentData.scheduled_date.split(':')[0]) || 9,
        parseInt(appointmentData.scheduled_date.split(':')[1]) || 0
      ).toISOString(),
    };

    const success = await actions.createAppointment(fullAppointmentData);
    if (success) {
      setShowScheduler(false);
    }
  };

  // Desktop layout (>900px)
  if (!isMobile && window.innerWidth > 900) {
    return (
      <div className="grid grid-cols-[400px_1fr] gap-6 h-full">
        {/* Left: Month Calendar */}
        <Card className="p-4 h-fit sticky top-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {format(state.selectedDate, 'MMMM yyyy')}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={actions.goToToday}
              className="text-xs"
            >
              Today
            </Button>
          </div>
          <MonthView
            monthDays={monthDays}
            onSelectDate={actions.selectDate}
            selectedDate={state.selectedDate}
          />
        </Card>

        {/* Right: Agenda */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {format(state.selectedDate, 'EEEE, MMMM d')}
            </h2>
            {isLawyer && (
              <Button
                onClick={() => setShowScheduler(true)}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            )}
          </div>
          
          <AgendaList
            selectedDate={state.selectedDate}
            appointments={appointments}
            groupedAppointments={groupedAppointments}
            loading={loading}
            onScheduleClick={() => setShowScheduler(true)}
            showScheduleButton={isLawyer}
          />
        </div>

        <SchedulerDrawer
          open={showScheduler}
          onOpenChange={setShowScheduler}
          selectedDate={state.selectedDate}
          onSubmit={handleCreateAppointment}
          isMobile={false}
        />
      </div>
    );
  }

  // Mobile layout
  return (
    <div className="space-y-4">
      {/* Sticky Header */}
      <div 
        className={cn(
          "sticky top-0 z-40 bg-background/95 backdrop-blur-sm transition-all duration-300",
          state.viewMode === 'collapsed' ? 'py-2' : 'py-4'
        )}
      >
        {state.viewMode === 'collapsed' ? (
          // Collapsed chip
          <Button
            variant="outline"
            onClick={() => actions.setViewMode('week')}
            className="w-full justify-between px-4 py-3 h-auto"
          >
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">
                {format(state.selectedDate, 'EEE, MMM d')}
              </span>
              {appointments.length > 0 && (
                <div className="bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  {appointments.length}
                </div>
              )}
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        ) : (
          // Full header
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">
                {format(state.selectedDate, 'MMMM yyyy')}
              </h1>
              <Button
                variant="outline"
                size="sm"
                onClick={actions.goToToday}
              >
                Today
              </Button>
            </div>

            {/* Week Strip */}
            <WeekStrip
              weekDays={weekDays}
              onSelectDate={actions.selectDate}
              onNavigateWeek={actions.navigateWeek}
            />

            {/* Expand/Collapse Month Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={actions.toggleViewMode}
              className="w-full justify-center"
            >
              {state.viewMode === 'month' ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Hide Calendar
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Full Month
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Month View (Expanded) */}
      {state.viewMode === 'month' && (
        <Card className="p-4">
          <MonthView
            monthDays={monthDays}
            onSelectDate={(date) => {
              actions.selectDate(date);
              actions.setViewMode('week');
            }}
            selectedDate={state.selectedDate}
          />
        </Card>
      )}

      {/* Agenda List */}
      <AgendaList
        selectedDate={state.selectedDate}
        appointments={appointments}
        groupedAppointments={groupedAppointments}
        loading={loading}
        onScheduleClick={() => setShowScheduler(true)}
        showScheduleButton={isLawyer}
      />

      {/* Scheduler Drawer */}
      <SchedulerDrawer
        open={showScheduler}
        onOpenChange={setShowScheduler}
        selectedDate={state.selectedDate}
        onSubmit={handleCreateAppointment}
        isMobile={true}
      />
    </div>
  );
};