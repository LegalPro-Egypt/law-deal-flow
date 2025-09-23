import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CaseCardProps {
  caseId: string;
  clientName: string;
  area: string;
  statusLabel: string;
  onExpand: () => void;
}

export function CaseCard({ caseId, clientName, area, statusLabel, onExpand }: CaseCardProps) {
  return (
    <div className="flex items-center gap-3 w-full">
      {/* Case ID Pill */}
      <div className="flex-shrink-0 h-8 md:h-9 px-3 bg-muted rounded-full flex items-center justify-center">
        <span className="text-sm font-medium text-muted-foreground leading-none">
          {caseId}
        </span>
      </div>

      {/* Main Label - Client Name • Area of Law */}
      <div className="flex-1 min-w-0">
        <span className="text-sm md:text-base font-semibold text-foreground truncate block">
          {clientName} • {area}
        </span>
      </div>

      {/* Status Pill with Chevron */}
      <button
        onClick={onExpand}
        className={cn(
          "flex-shrink-0 h-8 md:h-9 inline-flex items-center gap-2 px-3 pr-4",
          "bg-primary/10 text-primary rounded-full min-w-24",
          "hover:bg-primary/20 transition-colors duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        )}
        aria-label={`Expand case details for ${statusLabel} case`}
      >
        <span className="text-sm font-medium leading-none">
          {statusLabel}
        </span>
        <ChevronRight className="h-4 w-4 flex-shrink-0" />
      </button>
    </div>
  );
}

// Demo wrapper component
export function CaseCardDemo() {
  const handleExpand = (caseInfo: string) => {
    console.log('Expanding case:', caseInfo);
  };

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-4">
      <h2 className="text-lg font-semibold mb-4">CaseCard Component Demo</h2>
      
      {/* Regular case */}
      <div className="bg-card border rounded-lg p-4">
        <CaseCard
          caseId="C-001"
          clientName="John Smith"
          area="Business Law"
          statusLabel="In Progress"
          onExpand={() => handleExpand('John Smith - Business Law')}
        />
      </div>

      {/* Long client name */}
      <div className="bg-card border rounded-lg p-4">
        <CaseCard
          caseId="C-002"
          clientName="Acme Corporation International Holdings LLC"
          area="Corporate Litigation"
          statusLabel="In Progress"
          onExpand={() => handleExpand('Acme Corporation - Corporate Litigation')}
        />
      </div>

      {/* Long status label test */}
      <div className="bg-card border rounded-lg p-4">
        <CaseCard
          caseId="C-003"
          clientName="Jane Doe"
          area="Family Law"
          statusLabel="Awaiting Review"
          onExpand={() => handleExpand('Jane Doe - Family Law')}
        />
      </div>

      {/* Very long case ID */}
      <div className="bg-card border rounded-lg p-4">
        <CaseCard
          caseId="CASE-2024-001"
          clientName="Tech Startup Inc"
          area="IP Law"
          statusLabel="Active"
          onExpand={() => handleExpand('Tech Startup - IP Law')}
        />
      </div>
    </div>
  );
}