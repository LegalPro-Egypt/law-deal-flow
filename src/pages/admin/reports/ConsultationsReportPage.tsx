import { useState } from 'react';
import { ReportLayout } from '@/components/reports/shared/ReportLayout';
import { ReportCard } from '@/components/reports/shared/ReportCard';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import { LoadingState } from '@/components/reports/shared/LoadingState';
import { useReportsData, ReportFilters } from '@/hooks/useReportsData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';

export default function ConsultationsReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    currency: 'USD',
  });

  const { consultationData, loading, error } = useReportsData(filters);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-destructive p-6">Error: {error}</div>;

  // Calculate overall metrics
  const totalBooked = consultationData.reduce((sum, item) => sum + item.booked, 0);
  const totalCompleted = consultationData.reduce((sum, item) => sum + item.completed, 0);
  const totalMissed = consultationData.reduce((sum, item) => sum + item.missed, 0);
  const overallCompletionRate = totalBooked > 0 ? Math.round((totalCompleted / totalBooked) * 100) : 0;

  // Prepare chart data
  const chartData = consultationData.map(item => ({
    ...item,
    date_short: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  const getCompletionRateBadge = (rate: number) => {
    if (rate >= 90) return 'default';
    if (rate >= 75) return 'secondary';
    if (rate >= 60) return 'outline';
    return 'destructive';
  };

  return (
    <ReportLayout
      title="Consultation Completion Report"
      description="Analysis of consultation booking and completion rates"
      filters={filters}
      onFiltersChange={setFilters}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Overall KPI Cards */}
        <ReportCard
          title="Overall Statistics"
          description="Summary of all consultation activity"
          className="md:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-foreground">{totalBooked}</div>
              <div className="text-sm text-muted-foreground">Total Booked</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-success">{totalCompleted}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-destructive">{totalMissed}</div>
              <div className="text-sm text-muted-foreground">Missed/Cancelled</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">{overallCompletionRate}%</div>
              <div className="text-sm text-muted-foreground">Completion Rate</div>
            </div>
          </div>
        </ReportCard>

        {/* Daily Consultation Data Table */}
        <ReportCard
          title="Daily Breakdown"
          description="Consultation statistics by day"
          exportData={consultationData}
          exportFilename="daily-consultations"
        >
          {consultationData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Booked</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Missed</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {consultationData
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 15)
                    .map((item, index) => (
                    <TableRow key={`${item.date}-${index}`}>
                      <TableCell className="font-medium">
                        {new Date(item.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          weekday: 'short'
                        })}
                      </TableCell>
                      <TableCell className="font-mono">{item.booked}</TableCell>
                      <TableCell className="font-mono text-success">{item.completed}</TableCell>
                      <TableCell className="font-mono text-destructive">{item.missed}</TableCell>
                      <TableCell>
                        <Badge variant={getCompletionRateBadge(item.completion_rate)}>
                          {item.completion_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ReportCard>

        {/* Consultation Trends Chart */}
        <ReportCard
          title="Consultation Trends"
          description="Daily consultation activity over time"
        >
          {chartData.length === 0 ? (
            <EmptyState title="No trend data" />
          ) : (
            <ChartContainer
              config={{
                booked: { label: "Booked", color: "hsl(var(--chart-1))" },
                completed: { label: "Completed", color: "hsl(var(--chart-2))" },
                missed: { label: "Missed", color: "hsl(var(--chart-3))" },
              }}
              className="h-[400px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="date_short" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="booked" stackId="consultations" fill="var(--color-booked)" />
                  <Bar dataKey="completed" stackId="consultations" fill="var(--color-completed)" />
                  <Bar dataKey="missed" stackId="consultations" fill="var(--color-missed)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </ReportCard>

        {/* Performance Insights */}
        <ReportCard
          title="Performance Insights"
          description="Key metrics and patterns"
        >
          <div className="space-y-4">
            {consultationData.length > 0 && (
              <>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Best Completion Day:</div>
                  <div className="text-lg font-semibold text-success">
                    {consultationData.reduce((best, current) => 
                      current.completion_rate > best.completion_rate ? current : best
                    ).completion_rate}% 
                    ({consultationData.reduce((best, current) => 
                      current.completion_rate > best.completion_rate ? current : best
                    ).date})
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Average Daily Bookings:</div>
                  <div className="text-lg font-semibold">
                    {Math.round(totalBooked / Math.max(consultationData.length, 1))} per day
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Busiest Day:</div>
                  <div className="text-lg font-semibold text-primary">
                    {consultationData.reduce((busiest, current) => 
                      current.booked > busiest.booked ? current : busiest
                    ).booked} consultations
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Days Above 80% Rate:</div>
                  <div className="text-lg font-semibold">
                    {consultationData.filter(d => d.completion_rate >= 80).length} of {consultationData.length}
                  </div>
                </div>
              </>
            )}
          </div>
        </ReportCard>

        {/* Weekly Summary */}
        <ReportCard
          title="Recent Trends"
          description="Patterns in the last week of data"
        >
          {consultationData.length === 0 ? (
            <EmptyState title="No recent data" />
          ) : (
            <div className="space-y-4">
              {consultationData
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 7)
                .map((item, index) => (
                <div key={`trend-${item.date}-${index}`} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {new Date(item.date).getDate()}
                    </div>
                    <div>
                      <div className="font-medium">
                        {new Date(item.date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.completed}/{item.booked} completed
                      </div>
                    </div>
                  </div>
                  <Badge variant={getCompletionRateBadge(item.completion_rate)} className="ml-2">
                    {item.completion_rate}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ReportCard>
      </div>
    </ReportLayout>
  );
}