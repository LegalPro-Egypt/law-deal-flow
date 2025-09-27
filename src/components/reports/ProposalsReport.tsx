import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ProposalData } from '@/hooks/useReportsData';
import { ReportCard } from './ReportCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ProposalsReportProps {
  data: ProposalData[];
  onExport: () => void;
}

export const ProposalsReport = ({ data, onExport }: ProposalsReportProps) => {
  const chartData = useMemo(() => {
    return [...data].sort((a, b) => b.acceptance_rate - a.acceptance_rate);
  }, [data]);

  const overallStats = useMemo(() => {
    const totalSent = data.reduce((sum, item) => sum + item.sent_count, 0);
    const totalAccepted = data.reduce((sum, item) => sum + item.accepted_count, 0);
    const averageRate = totalSent > 0 ? (totalAccepted / totalSent) * 100 : 0;

    return {
      totalSent,
      totalAccepted,
      averageRate
    };
  }, [data]);

  const getAcceptanceRateVariant = (rate: number) => {
    if (rate >= 80) return 'default';
    if (rate >= 60) return 'secondary';
    if (rate >= 40) return 'outline';
    return 'destructive';
  };

  const getAcceptanceRateLabel = (rate: number) => {
    if (rate >= 80) return 'Excellent';
    if (rate >= 60) return 'Good';
    if (rate >= 40) return 'Average';
    return 'Needs Improvement';
  };

  return (
    <ReportCard
      title="Proposals Sent vs Accepted"
      description="Lawyer performance and proposal acceptance rates"
      onExport={onExport}
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">{overallStats.totalSent}</div>
            <div className="text-sm text-muted-foreground">Total Sent</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-secondary">{overallStats.totalAccepted}</div>
            <div className="text-sm text-muted-foreground">Total Accepted</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-accent">{overallStats.averageRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Average Rate</div>
          </div>
        </div>

        {/* Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Sent vs Accepted by Lawyer</h4>
          <div className="h-64">
            <ChartContainer
              config={{
                sent_count: { label: 'Sent', color: 'hsl(var(--primary))' },
                accepted_count: { label: 'Accepted', color: 'hsl(var(--secondary))' }
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="lawyer_name" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sent_count" fill="var(--color-sent_count)" />
                  <Bar dataKey="accepted_count" fill="var(--color-accepted_count)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lawyer</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Accepted</TableHead>
                <TableHead>Rate</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.map((lawyer) => (
                <TableRow key={lawyer.lawyer_id}>
                  <TableCell className="font-medium">{lawyer.lawyer_name}</TableCell>
                  <TableCell>{lawyer.sent_count}</TableCell>
                  <TableCell>{lawyer.accepted_count}</TableCell>
                  <TableCell className="font-semibold">{lawyer.acceptance_rate.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant={getAcceptanceRateVariant(lawyer.acceptance_rate)}>
                      {getAcceptanceRateLabel(lawyer.acceptance_rate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <Progress value={lawyer.acceptance_rate} className="h-2" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No proposal data available for the selected period
            </div>
          )}
        </div>
      </div>
    </ReportCard>
  );
};