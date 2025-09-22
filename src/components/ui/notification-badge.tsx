import { cn } from "@/lib/utils";

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export function NotificationBadge({ count, className }: NotificationBadgeProps) {
  if (count === 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <div className={cn(
      "absolute -top-1 -right-1 min-w-[1.125rem] h-[1.125rem] bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-medium leading-none",
      className
    )}>
      {displayCount}
    </div>
  );
}