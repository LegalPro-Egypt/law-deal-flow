import { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { ReportFilters } from './ReportFilters';
import { ReportFilters as ReportFiltersType } from '@/hooks/useReportsData';

interface ReportLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  filters: ReportFiltersType;
  onFiltersChange: (filters: ReportFiltersType) => void;
}

export function ReportLayout({ title, description, children, filters, onFiltersChange }: ReportLayoutProps) {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      
      <ReportFilters filters={filters} onFiltersChange={onFiltersChange} />
      
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}