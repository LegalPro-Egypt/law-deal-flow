import { useState } from 'react';
import { ReportLayout } from '@/components/reports/shared/ReportLayout';
import { ReportCard } from '@/components/reports/shared/ReportCard';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import { LoadingState } from '@/components/reports/shared/LoadingState';
import { useReportsData, ReportFilters } from '@/hooks/useReportsData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from 'recharts';

export default function CaseStatusReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days for better trend
      to: new Date(),
    },
    currency: 'USD',
  });

  const { caseStatusData, loading, error } = useReportsData(filters);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-destructive p-6">Error: {error}</div>;

  // Colors for different statuses
  const statusColors = {
    'draft': 'hsl(var(--chart-1))',
    'intake': 'hsl(var(--chart-2))',
    'submitted': 'hsl(var(--chart-3))',
    'lawyer_assigned': 'hsl(var(--chart-4))',
    'in_progress': 'hsl(var(--chart-5))',
    'completed': 'hsl(var(--success))',
    'closed': 'hsl(var(--muted))',
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'in_progress': return 'secondary';
      case 'submitted': return 'outline';
      case 'closed': return 'destructive';
      default: return 'secondary';
    }
  };

  const totalCases = caseStatusData.reduce((sum, item) => sum + item.count, 0);

  // Mock trend data (in real implementation, this would be fetched separately)
  const trendData = [
    { period: 'Week 1', new: 5, active: 12, completed: 3, closed: 1 },
    { period: 'Week 2', new: 8, active: 15, completed: 5, closed: 2 },
    { period: 'Week 3', new: 6, active: 18, completed: 7, closed: 1 },
    { period: 'Week 4', new: 10, active: 20, completed: 8, closed: 3 },
  ];

  return (
    <ReportLayout
      title="Case Status Report"
      description="Distribution and trends of cases by their current status"
      filters={filters}
      onFiltersChange={setFilters}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Status Distribution Table */}
        <ReportCard
          title="Case Status Distribution"
          description={`Total cases: ${totalCases}`}
          exportData={caseStatusData}
          exportFilename="case-status-distribution"
        >
          {caseStatusData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caseStatusData.map((item) => (
                    <TableRow key={item.status}>
                      <TableCell>
                        <Badge variant={getStatusVariant(item.status)}>
                          {item.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{item.count}</TableCell>
                      <TableCell>{item.percentage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ReportCard>

        {/* Status Distribution Pie Chart */}
        <ReportCard
          title="Status Distribution"
          description="Visual breakdown of case statuses"
        >
          {caseStatusData.length === 0 ? (
            <EmptyState title="No distribution data" />
          ) : (
            <ChartContainer
              config={{
                count: { label: "Cases" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={caseStatusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ status, percentage }) => `${status} (${percentage}%)`}
                  >
                    {caseStatusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={statusColors[entry.status as keyof typeof statusColors] || 'hsl(var(--chart-1))'}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value, name) => [`${value} cases`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </ReportCard>

        {/* Status Trends */}
        <ReportCard
          title="Status Trends"
          description="Weekly progression of case statuses"
          className="md:col-span-2"
        >
          <ChartContainer
            config={{
              new: { label: "New", color: "hsl(var(--chart-1))" },
              active: { label: "Active", color: "hsl(var(--chart-2))" },
              completed: { label: "Completed", color: "hsl(var(--chart-3))" },
              closed: { label: "Closed", color: "hsl(var(--chart-4))" },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <XAxis dataKey="period" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line 
                  type="monotone" 
                  dataKey="new" 
                  stroke="var(--color-new)" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="active" 
                  stroke="var(--color-active)" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="var(--color-completed)" 
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="closed" 
                  stroke="var(--color-closed)" 
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </ReportCard>
      </div>
    </ReportLayout>
  );
}