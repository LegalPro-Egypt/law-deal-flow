import { useState, useEffect, useCallback } from 'react';
import { addDays, startOfWeek, endOfWeek, format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { useAppointments, type Appointment } from './useAppointments';

export interface AgendaPickerState {
  selectedDate: Date;
  viewMode: 'week' | 'month' | 'collapsed';
  currentWeekStart: Date;
  isScrolling: boolean;
}

export const useAgendaPicker = (caseId?: string) => {
  const [state, setState] = useState<AgendaPickerState>({
    selectedDate: new Date(),
    viewMode: 'week',
    currentWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }), // Monday start
    isScrolling: false,
  });

  const { appointments, loading, createAppointment, updateAppointment, cancelAppointment } = useAppointments(caseId);

  // Get appointments for selected date
  const selectedDateAppointments = appointments.filter(apt => 
    isSameDay(new Date(apt.scheduled_date), state.selectedDate)
  );

  // Get week days with appointment counts
  const getWeekDays = useCallback(() => {
    const weekEnd = endOfWeek(state.currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: state.currentWeekStart, end: weekEnd }).map(date => {
      const dayAppointments = appointments.filter(apt => 
        isSameDay(new Date(apt.scheduled_date), date)
      );
      return {
        date,
        appointmentCount: dayAppointments.length,
        hasAppointments: dayAppointments.length > 0,
        isSelected: isSameDay(date, state.selectedDate),
        isToday: isSameDay(date, new Date()),
      };
    });
  }, [state.currentWeekStart, state.selectedDate, appointments]);

  // Get month days with appointment indicators
  const getMonthDays = useCallback(() => {
    const monthStart = startOfMonth(state.selectedDate);
    const monthEnd = endOfMonth(state.selectedDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd }).map(date => {
      const dayAppointments = appointments.filter(apt => 
        isSameDay(new Date(apt.scheduled_date), date)
      );
      return {
        date,
        appointmentCount: dayAppointments.length,
        hasAppointments: dayAppointments.length > 0,
        isSelected: isSameDay(date, state.selectedDate),
        isToday: isSameDay(date, new Date()),
      };
    });
  }, [state.selectedDate, appointments]);

  // Actions
  const selectDate = useCallback((date: Date) => {
    setState(prev => ({
      ...prev,
      selectedDate: date,
      viewMode: prev.viewMode === 'month' ? 'week' : prev.viewMode,
    }));
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setState(prev => ({
      ...prev,
      selectedDate: today,
      currentWeekStart: startOfWeek(today, { weekStartsOn: 1 }),
    }));
  }, []);

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    setState(prev => {
      const newWeekStart = addDays(prev.currentWeekStart, direction === 'next' ? 7 : -7);
      return {
        ...prev,
        currentWeekStart: newWeekStart,
      };
    });
  }, []);

  const toggleViewMode = useCallback(() => {
    setState(prev => ({
      ...prev,
      viewMode: prev.viewMode === 'week' ? 'month' : 'week',
    }));
  }, []);

  const setViewMode = useCallback((viewMode: 'week' | 'month' | 'collapsed') => {
    setState(prev => ({
      ...prev,
      viewMode,
    }));
  }, []);

  const setScrolling = useCallback((isScrolling: boolean) => {
    setState(prev => ({
      ...prev,
      isScrolling,
    }));
  }, []);

  // Group appointments by time for agenda display
  const getGroupedAppointments = useCallback(() => {
    const sorted = selectedDateAppointments.sort((a, b) => 
      new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
    );

    const groups = {
      morning: [] as Appointment[],
      afternoon: [] as Appointment[],
      evening: [] as Appointment[],
    };

    sorted.forEach(apt => {
      const hour = new Date(apt.scheduled_date).getHours();
      if (hour < 12) groups.morning.push(apt);
      else if (hour < 17) groups.afternoon.push(apt);
      else groups.evening.push(apt);
    });

    return groups;
  }, [selectedDateAppointments]);

  return {
    state,
    appointments: selectedDateAppointments,
    groupedAppointments: getGroupedAppointments(),
    weekDays: getWeekDays(),
    monthDays: getMonthDays(),
    loading,
    actions: {
      selectDate,
      goToToday,
      navigateWeek,
      toggleViewMode,
      setViewMode,
      setScrolling,
      createAppointment,
      updateAppointment,
      cancelAppointment,
    },
  };
};