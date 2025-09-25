import React from 'react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth } from 'date-fns';
import { cn } from '@/lib/utils';

interface MonthDay {
  date: Date;
  appointmentCount: number;
  hasAppointments: boolean;
  isSelected: boolean;
  isToday: boolean;
}

interface MonthViewProps {
  monthDays: MonthDay[];
  onSelectDate: (date: Date) => void;
  selectedDate: Date;
}

export const MonthView: React.FC<MonthViewProps> = ({
  monthDays,
  onSelectDate,
  selectedDate,
}) => {
  // Get the full calendar grid (including prev/next month days for complete weeks)
  const monthStart = monthDays[0]?.date;
  const monthEnd = monthDays[monthDays.length - 1]?.date;
  
  if (!monthStart || !monthEnd) return null;
  
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getDayData = (date: Date) => {
    return monthDays.find(day => 
      day.date.toDateString() === date.toDateString()
    ) || {
      date,
      appointmentCount: 0,
      hasAppointments: false,
      isSelected: false,
      isToday: false,
    };
  };

  return (
    <div className="w-full">
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map((day) => (
          <div
            key={day}
            className="flex items-center justify-center p-2 text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date) => {
          const dayData = getDayData(date);
          const isCurrentMonth = isSameMonth(date, selectedDate);
          
          return (
            <button
              key={date.toISOString()}
              onClick={() => onSelectDate(date)}
              className={cn(
                "relative flex flex-col items-center justify-center p-2 h-12 rounded-lg transition-all duration-200",
                "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
                dayData.isSelected && "bg-primary text-primary-foreground shadow-md",
                dayData.isToday && !dayData.isSelected && "bg-muted border-2 border-primary/30",
                !isCurrentMonth && "opacity-30",
                !dayData.isSelected && !dayData.isToday && "hover:bg-muted/30"
              )}
              aria-label={`${format(date, 'MMMM d, yyyy')}${dayData.hasAppointments ? ` - ${dayData.appointmentCount} appointments` : ''}`}
            >
              {/* Day Number */}
              <span className={cn(
                "text-sm font-medium",
                dayData.isSelected && "text-primary-foreground",
                dayData.isToday && !dayData.isSelected && "text-primary font-semibold"
              )}>
                {format(date, 'd')}
              </span>

              {/* Appointment Indicators */}
              {dayData.hasAppointments && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2">
                  {dayData.appointmentCount <= 3 ? (
                    // Show individual dots for 1-3 appointments
                    <div className="flex gap-0.5">
                      {[...Array(dayData.appointmentCount)].map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-1 h-1 rounded-full",
                            dayData.isSelected 
                              ? "bg-primary-foreground/70" 
                              : "bg-primary"
                          )}
                        />
                      ))}
                    </div>
                  ) : (
                    // Show count badge for 4+ appointments
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold",
                      dayData.isSelected 
                        ? "bg-primary-foreground/20 text-primary-foreground" 
                        : "bg-primary/20 text-primary"
                    )}>
                      {dayData.appointmentCount > 9 ? '9+' : dayData.appointmentCount}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};