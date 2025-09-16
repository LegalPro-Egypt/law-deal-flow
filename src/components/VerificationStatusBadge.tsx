import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, AlertTriangle } from "lucide-react";

interface VerificationStatusBadgeProps {
  status: string | null | undefined;
  className?: string;
}

export function VerificationStatusBadge({ status, className }: VerificationStatusBadgeProps) {
  const getStatusConfig = (status: string | null | undefined) => {
    switch (status) {
      case 'pending_basic':
        return {
          label: 'Basic Profile',
          variant: 'secondary' as const,
          icon: AlertTriangle,
          className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
        };
      case 'pending_complete':
        return {
          label: 'Under Review',
          variant: 'secondary' as const,
          icon: Clock,
          className: 'bg-blue-100 text-blue-800 hover:bg-blue-100'
        };
      case 'verified':
        return {
          label: 'Verified',
          variant: 'default' as const,
          icon: ShieldCheck,
          className: 'bg-green-100 text-green-800 hover:bg-green-100'
        };
      default:
        return {
          label: 'Unknown',
          variant: 'outline' as const,
          icon: AlertTriangle,
          className: 'bg-gray-100 text-gray-800 hover:bg-gray-100'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`${config.className} ${className}`}
    >
      <Icon className="h-3 w-3 mr-1" />
      {config.label}
    </Badge>
  );
}