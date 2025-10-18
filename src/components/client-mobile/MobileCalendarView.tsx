import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CaseCalendar } from '@/components/CaseCalendar';

interface MobileCalendarViewProps {
  caseId: string;
  clientId?: string;
  lawyerId?: string;
  onBack: () => void;
}

export const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({
  caseId,
  clientId,
  lawyerId,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Calendar & Appointments</h1>
        </div>
      </div>

      <div className="px-4 py-4">
        <CaseCalendar
          caseId={caseId}
          isLawyer={false}
          clientId={clientId}
          lawyerId={lawyerId}
        />
      </div>
    </div>
  );
};
