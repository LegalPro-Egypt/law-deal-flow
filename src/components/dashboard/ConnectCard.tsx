import { NotificationBadge } from "@/components/ui/notification-badge";

interface ConnectCardProps {
  unreadCount: number;
  onClick: () => void;
}

export function ConnectCard({ unreadCount, onClick }: ConnectCardProps) {
  return (
    <div 
      onClick={onClick}
      className="relative bg-white dark:bg-card rounded-2xl px-4 py-3 shadow-sm border border-gray-200 dark:border-border cursor-pointer hover:shadow-md transition-shadow"
    >
      {unreadCount > 0 && (
        <NotificationBadge count={unreadCount} className="absolute -top-2 -right-2" />
      )}
      
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold text-foreground">Connect</span>
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        </div>
        <span className="text-sm text-gray-500 dark:text-muted-foreground">
          Communicate with your Legal Team
        </span>
      </div>
    </div>
  );
}
