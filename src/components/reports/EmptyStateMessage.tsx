import { BarChart3, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateMessageProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: 'chart' | 'calendar' | 'filter';
}

export const EmptyStateMessage = ({ 
  title = "No data available", 
  description = "There's no data to display for the selected filters and date range.",
  actionText = "Adjust filters",
  onAction,
  icon = 'chart'
}: EmptyStateMessageProps) => {
  const IconComponent = {
    chart: BarChart3,
    calendar: Calendar,
    filter: Filter
  }[icon];

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <IconComponent className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-md">{description}</p>
      {onAction && (
        <Button variant="outline" onClick={onAction}>
          {actionText}
        </Button>
      )}
    </div>
  );
};