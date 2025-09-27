import { useState } from 'react';
import { ReportLayout } from '@/components/reports/shared/ReportLayout';
import { ReportCard } from '@/components/reports/shared/ReportCard';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import { LoadingState } from '@/components/reports/shared/LoadingState';
import { useReportsData, ReportFilters } from '@/hooks/useReportsData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function RevenueReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    currency: 'USD',
  });

  const { revenueData, loading, error, formatCurrency } = useReportsData(filters);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-destructive p-6">Error: {error}</div>;

  // Process data for charts
  const topCases = revenueData.slice(0, 10);
  
  const dailyRevenue = revenueData.reduce((acc, item) => {
    const date = new Date(item.created_at).toLocaleDateString();
    acc[date] = (acc[date] || 0) + item.total_revenue;
    return acc;
  }, {} as Record<string, number>);

  const trendData = Object.entries(dailyRevenue)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <ReportLayout
      title="Revenue by Case Report"
      description="Total revenue generated per case with trend analysis"
      filters={filters}
      onFiltersChange={setFilters}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Table */}
        <ReportCard
          title="Revenue by Case"
          description="Top earning cases sorted by total revenue"
          exportData={revenueData}
          exportFilename="revenue-by-case"
          className="md:col-span-2"
        >
          {revenueData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Case Title</TableHead>
                    <TableHead>Lawyer</TableHead>
                    <TableHead>Total Revenue</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {revenueData.slice(0, 10).map((item) => (
                    <TableRow key={item.case_id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {item.case_title}
                      </TableCell>
                      <TableCell>{item.lawyer_name}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(item.total_revenue, item.currency)}
                      </TableCell>
                      <TableCell>
                        {new Date(item.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ReportCard>

        {/* Top Earning Cases Bar Chart */}
        <ReportCard
          title="Top Earning Cases"
          description="Horizontal bar chart of highest revenue cases"
        >
          {topCases.length === 0 ? (
            <EmptyState title="No revenue data" />
          ) : (
            <ChartContainer
              config={{
                revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
              }}
              className="h-[400px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCases} layout="horizontal" margin={{ left: 50 }}>
                  <XAxis type="number" />
                  <YAxis 
                    type="category" 
                    dataKey="case_title" 
                    width={150}
                    tick={{ fontSize: 12 }}
                  />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                  />
                  <Bar dataKey="total_revenue" fill="var(--color-revenue)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </ReportCard>

        {/* Revenue Trend Line Chart */}
        <ReportCard
          title="Revenue Trend"
          description="Daily revenue progression over time"
        >
          {trendData.length === 0 ? (
            <EmptyState title="No trend data" />
          ) : (
            <ChartContainer
              config={{
                revenue: { label: "Daily Revenue", color: "hsl(var(--chart-2))" },
              }}
              className="h-[400px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--color-revenue)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </ReportCard>
      </div>
    </ReportLayout>
  );
}