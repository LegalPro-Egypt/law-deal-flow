import { NotificationBadge } from "@/components/ui/notification-badge";
import { Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ConnectCardProps {
  unreadCount: number;
}

export function ConnectCard({ unreadCount }: ConnectCardProps) {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate('/client/communication')}
      className="bg-white dark:bg-card rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-border cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        {/* LEFT: Mail Icon */}
        <Mail className="h-6 w-6 text-foreground flex-shrink-0" />
        
        {/* CENTER: Title + Subtitle */}
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-lg font-bold text-foreground">Connect</span>
          <span className="text-sm text-gray-500 dark:text-muted-foreground">
            Communicate with your Legal Team
          </span>
        </div>
        
        {/* RIGHT: Notification Badge */}
        <NotificationBadge count={unreadCount} className="flex-shrink-0" />
      </div>
    </div>
  );
}
