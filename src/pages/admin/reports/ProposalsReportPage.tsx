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

export default function ProposalsReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    currency: 'USD',
  });

  const { proposalData, loading, error } = useReportsData(filters);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-destructive p-6">Error: {error}</div>;

  // Calculate overall metrics
  const totalSent = proposalData.reduce((sum, item) => sum + item.sent_count, 0);
  const totalAccepted = proposalData.reduce((sum, item) => sum + item.accepted_count, 0);
  const overallAcceptanceRate = totalSent > 0 ? Math.round((totalAccepted / totalSent) * 100) : 0;

  // Prepare data for grouped bar chart
  const chartData = proposalData.map(item => ({
    lawyer: item.lawyer_name.split(' ')[0], // Use first name for cleaner display
    sent: item.sent_count,
    accepted: item.accepted_count,
    rate: item.acceptance_rate,
  }));

  const getAcceptanceRateBadge = (rate: number) => {
    if (rate >= 75) return 'default';
    if (rate >= 50) return 'secondary';
    if (rate >= 25) return 'outline';
    return 'destructive';
  };

  return (
    <ReportLayout
      title="Proposals Sent vs Accepted Report"
      description="Analysis of proposal success rates by lawyer"
      filters={filters}
      onFiltersChange={setFilters}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Overall KPI Cards */}
        <ReportCard
          title="Overall Statistics"
          description="Summary of all proposal activity"
          className="md:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-foreground">{totalSent}</div>
              <div className="text-sm text-muted-foreground">Total Proposals Sent</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-primary">{totalAccepted}</div>
              <div className="text-sm text-muted-foreground">Total Accepted</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-success">{overallAcceptanceRate}%</div>
              <div className="text-sm text-muted-foreground">Overall Acceptance Rate</div>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl font-bold text-foreground">{proposalData.length}</div>
              <div className="text-sm text-muted-foreground">Active Lawyers</div>
            </div>
          </div>
        </ReportCard>

        {/* Proposals by Lawyer Table */}
        <ReportCard
          title="Lawyer Performance"
          description="Detailed breakdown per lawyer"
          exportData={proposalData}
          exportFilename="proposals-by-lawyer"
        >
          {proposalData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lawyer</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Accepted</TableHead>
                    <TableHead>Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposalData
                    .sort((a, b) => b.acceptance_rate - a.acceptance_rate)
                    .map((item) => (
                    <TableRow key={item.lawyer_id}>
                      <TableCell className="font-medium">{item.lawyer_name}</TableCell>
                      <TableCell className="font-mono">{item.sent_count}</TableCell>
                      <TableCell className="font-mono">{item.accepted_count}</TableCell>
                      <TableCell>
                        <Badge variant={getAcceptanceRateBadge(item.acceptance_rate)}>
                          {item.acceptance_rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ReportCard>

        {/* Sent vs Accepted Comparison Chart */}
        <ReportCard
          title="Sent vs Accepted Comparison"
          description="Visual comparison of proposals sent and accepted by lawyer"
        >
          {chartData.length === 0 ? (
            <EmptyState title="No proposal data" />
          ) : (
            <ChartContainer
              config={{
                sent: { label: "Sent", color: "hsl(var(--chart-1))" },
                accepted: { label: "Accepted", color: "hsl(var(--chart-2))" },
              }}
              className="h-[400px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ bottom: 60 }}>
                  <XAxis 
                    dataKey="lawyer" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sent" fill="var(--color-sent)" name="Sent" />
                  <Bar dataKey="accepted" fill="var(--color-accepted)" name="Accepted" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </ReportCard>

        {/* Top Performers */}
        <ReportCard
          title="Top Performers"
          description="Lawyers with highest acceptance rates"
        >
          {proposalData.length === 0 ? (
            <EmptyState title="No performance data" />
          ) : (
            <div className="space-y-4">
              {proposalData
                .filter(item => item.sent_count >= 3) // Only include lawyers with at least 3 proposals
                .sort((a, b) => b.acceptance_rate - a.acceptance_rate)
                .slice(0, 5)
                .map((item, index) => (
                <div key={item.lawyer_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{item.lawyer_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.accepted_count}/{item.sent_count} proposals
                      </div>
                    </div>
                  </div>
                  <Badge variant={getAcceptanceRateBadge(item.acceptance_rate)} className="ml-2">
                    {item.acceptance_rate}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </ReportCard>

        {/* Acceptance Rate Insights */}
        <ReportCard
          title="Insights"
          description="Key observations about proposal performance"
        >
          <div className="space-y-4">
            {proposalData.length > 0 && (
              <>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Highest Acceptance Rate:</div>
                  <div className="text-lg font-semibold text-success">
                    {Math.max(...proposalData.map(p => p.acceptance_rate))}%
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Average Acceptance Rate:</div>
                  <div className="text-lg font-semibold">
                    {Math.round(proposalData.reduce((sum, p) => sum + p.acceptance_rate, 0) / proposalData.length)}%
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Most Active Lawyer:</div>
                  <div className="text-lg font-semibold text-primary">
                    {proposalData.reduce((max, p) => p.sent_count > max.sent_count ? p : max, proposalData[0])?.lawyer_name}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Lawyers Above 70% Rate:</div>
                  <div className="text-lg font-semibold">
                    {proposalData.filter(p => p.acceptance_rate >= 70).length} of {proposalData.length}
                  </div>
                </div>
              </>
            )}
          </div>
        </ReportCard>
      </div>
    </ReportLayout>
  );
}