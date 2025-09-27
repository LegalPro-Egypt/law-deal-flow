import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ConsultationData } from '@/hooks/useReportsData';
import { ReportCard } from './ReportCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface ConsultationReportProps {
  data: ConsultationData[];
  onExport: () => void;
}

export const ConsultationReport = ({ data, onExport }: ConsultationReportProps) => {
  const overallStats = useMemo(() => {
    const totalBooked = data.reduce((sum, item) => sum + item.booked, 0);
    const totalCompleted = data.reduce((sum, item) => sum + item.completed, 0);
    const totalMissed = data.reduce((sum, item) => sum + item.missed, 0);
    const overallCompletionRate = totalBooked > 0 ? (totalCompleted / totalBooked) * 100 : 0;

    return {
      totalBooked,
      totalCompleted,
      totalMissed,
      overallCompletionRate
    };
  }, [data]);

  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      date_formatted: new Date(item.date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    }));
  }, [data]);

  const getCompletionRateVariant = (rate: number) => {
    if (rate >= 90) return 'default';
    if (rate >= 75) return 'secondary';
    if (rate >= 60) return 'outline';
    return 'destructive';
  };

  const getCompletionRateLabel = (rate: number) => {
    if (rate >= 90) return 'Excellent';
    if (rate >= 75) return 'Good';
    if (rate >= 60) return 'Average';
    return 'Poor';
  };

  return (
    <ReportCard
      title="Consultation Completion"
      description="Booking completion rates and appointment analytics"
      onExport={onExport}
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-primary">{overallStats.totalBooked}</div>
            <div className="text-sm text-muted-foreground">Total Booked</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-secondary">{overallStats.totalCompleted}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-destructive">{overallStats.totalMissed}</div>
            <div className="text-sm text-muted-foreground">Missed</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-2xl font-bold text-accent">{overallStats.overallCompletionRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Completion Rate</div>
          </div>
        </div>

        {/* Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Consultation Trends Over Time</h4>
          <div className="h-64">
            <ChartContainer
              config={{
                booked: { label: 'Booked', color: 'hsl(var(--primary))' },
                completed: { label: 'Completed', color: 'hsl(var(--secondary))' },
                missed: { label: 'Missed', color: 'hsl(var(--destructive))' }
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date_formatted" />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="booked"
                    stackId="1"
                    stroke="var(--color-booked)"
                    fill="var(--color-booked)"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="completed"
                    stackId="2"
                    stroke="var(--color-completed)"
                    fill="var(--color-completed)"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="missed"
                    stackId="3"
                    stroke="var(--color-missed)"
                    fill="var(--color-missed)"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Booked</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Missed</TableHead>
                <TableHead>Completion Rate</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {chartData.slice().reverse().slice(0, 10).map((item) => (
                <TableRow key={item.date}>
                  <TableCell className="font-medium">
                    {new Date(item.date).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{item.booked}</TableCell>
                  <TableCell className="text-secondary">{item.completed}</TableCell>
                  <TableCell className="text-destructive">{item.missed}</TableCell>
                  <TableCell className="font-semibold">{item.completion_rate.toFixed(1)}%</TableCell>
                  <TableCell>
                    <Badge variant={getCompletionRateVariant(item.completion_rate)}>
                      {getCompletionRateLabel(item.completion_rate)}
                    </Badge>
                  </TableCell>
                  <TableCell className="w-[120px]">
                    <Progress value={item.completion_rate} className="h-2" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No consultation data available for the selected period
            </div>
          )}
          {data.length > 10 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Showing latest 10 of {data.length} days
            </div>
          )}
        </div>
      </div>
    </ReportCard>
  );
};