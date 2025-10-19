import { useNavigate } from "react-router-dom";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProposalsContractsCardProps {
  unreadCount: number;
}

export const ProposalsContractsCard = ({ unreadCount }: ProposalsContractsCardProps) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate('/client/proposals-contracts')}
      className="bg-white dark:bg-card rounded-2xl px-4 py-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-3">
        {/* LEFT: Icon + Text */}
        <div className="flex flex-col gap-2 flex-1">
          <FileText className="h-6 w-6 text-foreground" />
          <div className="flex flex-col gap-1">
            <span className="text-lg font-bold text-foreground leading-[1.3]">Proposals & Contracts</span>
            <span className="text-sm leading-5 text-gray-500 dark:text-muted-foreground">
              View proposals and contracts
            </span>
          </div>
        </div>
        
        {/* RIGHT: Notification Badge */}
        {unreadCount > 0 && (
          <Badge variant="destructive" className="flex-shrink-0">
            {unreadCount}
          </Badge>
        )}
      </div>
    </div>
  );
};
