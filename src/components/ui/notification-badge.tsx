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
      "absolute -top-2 -right-2 min-w-[1.25rem] h-[1.25rem] bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs font-semibold leading-none border-2 border-background",
      className
    )}>
      {displayCount}
    </div>
  );
}