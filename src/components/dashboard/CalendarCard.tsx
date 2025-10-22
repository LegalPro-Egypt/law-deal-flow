import { Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function CalendarCard() {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate('/client/calendar')}
      className="bg-white dark:bg-card rounded-2xl px-4 py-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        {/* LEFT: Icon + Text */}
        <div className="flex flex-col gap-2 flex-1">
          <Calendar className="h-6 w-6 text-foreground" />
          <div className="flex flex-col gap-1">
            <span className="text-2xl font-semibold leading-none tracking-tight text-card-foreground">Calendar & Appointments</span>
            <span className="text-sm text-muted-foreground">
              View scheduled meetings and appointments
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
