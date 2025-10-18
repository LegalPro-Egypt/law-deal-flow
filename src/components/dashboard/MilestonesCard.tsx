import { useState } from "react";
import { FastForward } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CaseTimeline } from "@/components/CaseTimeline";
import { useCaseActivities } from "@/hooks/useCaseActivities";

interface MilestonesCardProps {
  caseId: string;
  caseData: any;
  userRole?: string;
}

export function MilestonesCard({ caseId, caseData, userRole }: MilestonesCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { activities } = useCaseActivities(caseId);

  // Get the latest date from activities or case updates
  const getLatestDate = () => {
    const dates = [
      caseData.updated_at,
      caseData.created_at,
      ...activities.map(a => a.created_at)
    ].filter(Boolean);
    
    if (dates.length === 0) return new Date();
    
    const latestDate = new Date(Math.max(...dates.map(d => new Date(d).getTime())));
    return latestDate;
  };

  const latestDate = getLatestDate();
  const todaysDate = format(new Date(), "dd MMM yyyy");
  const lastUpdated = formatDistanceToNow(latestDate, { addSuffix: true });

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-blue-950 rounded-2xl px-4 py-4 flex items-center justify-between hover:brightness-110 active:scale-95 transition-all duration-200 cursor-pointer shadow-lg focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
        aria-label="View case milestones"
      >
        <div className="flex flex-col items-start gap-0 leading-none">
          <span className="text-xs text-white/80 leading-tight">{todaysDate}</span>
          <div className="flex items-center gap-1.5 leading-none">
            <span className="text-lg font-semibold text-white leading-tight">Milestones</span>
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
          </div>
          <span className="text-sm text-white/70 leading-tight">Last updated {lastUpdated}</span>
        </div>
        
        <div className="relative">
          <div className="relative w-36 h-36">
            <svg 
              className="absolute inset-0" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="fadeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.7)" />
                </linearGradient>
              </defs>
              <g fill="url(#fadeGradient)">
                <polygon points="5,4 15,12 5,20" />
                <polygon points="13,4 23,12 13,20" />
              </g>
            </svg>
          </div>
        </div>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Case Milestones</DialogTitle>
            <DialogDescription>
              Track your case progress and important updates
            </DialogDescription>
          </DialogHeader>
          <CaseTimeline 
            caseId={caseId} 
            caseData={caseData} 
            userRole={userRole} 
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
