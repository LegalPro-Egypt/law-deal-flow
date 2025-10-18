import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <div className={cn("absolute -top-2 -right-2", className)}>
      {/* Green base circle */}
      <div className="relative w-5 h-5 bg-green-500 rounded-full">
        {/* Red notification circle with count - overlapping top-right */}
        <div className="absolute -top-1 -right-1 min-w-[1rem] h-[1rem] bg-destructive text-white rounded-full flex items-center justify-center text-[10px] font-bold leading-none px-1">
          {displayCount}
        </div>
      </div>
    </div>
  );
}