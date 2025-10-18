import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CommunicationInbox } from '@/components/CommunicationInbox';

interface MobileConnectViewProps {
  caseId: string;
  cases: any[];
  onBack: () => void;
}

export const MobileConnectView: React.FC<MobileConnectViewProps> = ({
  caseId,
  cases,
  onBack,
}) => {
  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        <CommunicationInbox 
          cases={cases}
          userRole="client"
          caseId={caseId}
        />
      </div>
    </div>
  );
};
