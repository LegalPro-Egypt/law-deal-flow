import React, { useRef } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WeekDay {
  date: Date;
  appointmentCount: number;
  hasAppointments: boolean;
  isSelected: boolean;
  isToday: boolean;
}

interface WeekStripProps {
  weekDays: WeekDay[];
  onSelectDate: (date: Date) => void;
  onNavigateWeek: (direction: 'prev' | 'next') => void;
}

export const WeekStrip: React.FC<WeekStripProps> = ({
  weekDays,
  onSelectDate,
  onNavigateWeek,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const deltaX = startX - endX;
      
      // Swipe threshold (50px)
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          onNavigateWeek('next');
        } else {
          onNavigateWeek('prev');
        }
      }
      
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div className="relative">
      {/* Navigation Buttons */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onNavigateWeek('prev')}
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onNavigateWeek('next')}
        className="absolute right-0 top-1/2 -translate-y-1/2 z-10 h-8 w-8 bg-background/80 backdrop-blur-sm"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Week Days */}
      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        className="flex gap-2 px-8 py-2 overflow-hidden select-none"
      >
        {weekDays.map((day) => (
          <button
            key={day.date.toISOString()}
            onClick={() => onSelectDate(day.date)}
            className={cn(
              "flex-1 min-w-0 flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200",
              "hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20",
              day.isSelected && "bg-primary text-primary-foreground shadow-md",
              day.isToday && !day.isSelected && "bg-muted border-2 border-primary/30",
              !day.isSelected && !day.isToday && "hover:bg-muted/30"
            )}
            aria-label={`${format(day.date, 'EEEE, MMMM d, yyyy')}${day.hasAppointments ? ` - ${day.appointmentCount} appointments` : ''}`}
          >
            {/* Day Name */}
            <span className={cn(
              "text-xs font-medium uppercase tracking-wide",
              day.isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
            )}>
              {format(day.date, 'EEE')}
            </span>
            
            {/* Day Number */}
            <span className={cn(
              "text-lg font-semibold mt-1",
              day.isSelected && "text-primary-foreground",
              day.isToday && !day.isSelected && "text-primary"
            )}>
              {format(day.date, 'd')}
            </span>
            
            {/* Appointment Indicator */}
            {day.hasAppointments && (
              <div className={cn(
                "w-2 h-2 rounded-full mt-1 flex-shrink-0",
                day.isSelected 
                  ? "bg-primary-foreground/60" 
                  : "bg-primary"
              )}>
                {day.appointmentCount > 1 && (
                  <div className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                    day.isSelected 
                      ? "bg-primary-foreground text-primary" 
                      : "bg-primary text-primary-foreground"
                  )}>
                    {day.appointmentCount > 9 ? '9+' : day.appointmentCount}
                  </div>
                )}
              </div>
            )}
          </button>
        ))}
      </div>
      
      {/* Week indicator dots */}
      <div className="flex justify-center gap-1 mt-2">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-1.5 h-1.5 rounded-full transition-colors",
              i === 1 ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>
    </div>
  );
};