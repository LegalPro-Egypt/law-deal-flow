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
      className="bg-white dark:bg-card rounded-2xl px-4 py-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        {/* LEFT: Icon + Text */}
        <div className="flex flex-col gap-2 flex-1">
          <Mail className="h-6 w-6 text-foreground" />
          <div className="flex flex-col gap-1">
            <span className="text-lg font-bold text-foreground leading-[1.3]">Connect</span>
            <span className="text-sm leading-5 text-gray-500 dark:text-muted-foreground">
              Communicate with your Legal Team
            </span>
          </div>
        </div>
        
        {/* RIGHT: Notification Badge */}
        <NotificationBadge count={unreadCount} className="flex-shrink-0" />
      </div>
    </div>
  );
}
