import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CaseTimeline } from '@/components/CaseTimeline';
import { CaseWorkProgress } from '@/components/CaseWorkProgress';
import { MobileTab } from './MobileTabBar';

interface MobileMilestonesViewProps {
  caseId: string;
  caseData?: any;
  onBack: () => void;
}

export const MobileMilestonesView: React.FC<MobileMilestonesViewProps> = ({
  caseId,
  caseData,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Milestones & Progress</h1>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {caseData && (
          <CaseWorkProgress caseData={caseData} />
        )}
        <CaseTimeline caseId={caseId} caseData={caseData} />
      </div>
    </div>
  );
};
