import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportButton } from './ExportButton';

interface ReportCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  exportData?: any[];
  exportFilename?: string;
  className?: string;
}

export function ReportCard({ 
  title, 
  description, 
  children, 
  exportData, 
  exportFilename,
  className 
}: ReportCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          {description && (
            <CardDescription>{description}</CardDescription>
          )}
        </div>
        {exportData && exportFilename && (
          <ExportButton data={exportData} filename={exportFilename} />
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
}