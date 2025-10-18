import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <div className={cn("relative", className)}>
      {/* Green base circle - always visible */}
      <div className="relative w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
        {/* Red notification circle with count - only when count > 0 */}
        {count > 0 && (
          <div className="absolute -top-1 -right-1 min-w-[1rem] h-[1rem] bg-destructive text-white rounded-full flex items-center justify-center text-[10px] font-bold leading-none px-1">
            {displayCount}
          </div>
        )}
      </div>
    </div>
  );
}