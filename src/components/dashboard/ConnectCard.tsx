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
      className="relative bg-white dark:bg-card rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-border cursor-pointer hover:shadow-md transition-shadow"
    >
      <NotificationBadge count={unreadCount} />
      
      <div className="flex flex-col gap-2">
        <Mail className="h-6 w-6 text-foreground" />
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-foreground">Connect</span>
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          </div>
          <span className="text-sm text-gray-500 dark:text-muted-foreground">
            Communicate with your Legal Team
          </span>
        </div>
      </div>
    </div>
  );
}
