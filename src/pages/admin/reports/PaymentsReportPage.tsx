import { useState } from 'react';
import { ReportLayout } from '@/components/reports/shared/ReportLayout';
import { ReportCard } from '@/components/reports/shared/ReportCard';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import { LoadingState } from '@/components/reports/shared/LoadingState';
import { useReportsData, ReportFilters } from '@/hooks/useReportsData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function PaymentsReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      to: new Date(),
    },
    currency: 'USD',
  });

  const { paymentsData, loading, error, formatCurrency } = useReportsData(filters);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-destructive p-6">Error: {error}</div>;

  // Process data for charts
  const statusCounts = paymentsData.reduce((acc, payment) => {
    acc[payment.status] = (acc[payment.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const monthlyData = paymentsData.reduce((acc, payment) => {
    const month = new Date(payment.created_at).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short' 
    });
    
    if (!acc[month]) {
      acc[month] = { month, paid: 0, pending: 0, overdue: 0, total: 0 };
    }
    
    acc[month][payment.status as keyof typeof acc[typeof month]]++;
    acc[month].total += payment.amount;
    
    return acc;
  }, {} as Record<string, any>);

  const chartData = Object.values(monthlyData);
  const statusData = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <ReportLayout
      title="Payments Report"
      description="Comprehensive overview of all payments, including status breakdown and trends"
      filters={filters}
      onFiltersChange={setFilters}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Payments Table */}
        <ReportCard
          title="Payment Details"
          description="Complete list of all payments by client and lawyer"
          exportData={paymentsData}
          exportFilename="payments-report"
          className="md:col-span-2"
        >
          {paymentsData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Lawyer</TableHead>
                    <TableHead>Case</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentsData.slice(0, 10).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.client_name}</TableCell>
                      <TableCell>{payment.lawyer_name}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{payment.case_title}</TableCell>
                      <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(payment.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ReportCard>

        {/* Stacked Bar Chart - Payments by Month */}
        <ReportCard
          title="Payment Trends"
          description="Monthly payment volume and status breakdown"
        >
          {chartData.length === 0 ? (
            <EmptyState title="No trend data" />
          ) : (
            <ChartContainer
              config={{
                paid: { label: "Paid", color: "hsl(var(--chart-1))" },
                pending: { label: "Pending", color: "hsl(var(--chart-2))" },
                overdue: { label: "Overdue", color: "hsl(var(--chart-3))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="paid" stackId="status" fill="var(--color-paid)" />
                  <Bar dataKey="pending" stackId="status" fill="var(--color-pending)" />
                  <Bar dataKey="overdue" stackId="status" fill="var(--color-overdue)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </ReportCard>

        {/* Total Volume Line Chart */}
        <ReportCard
          title="Payment Volume"
          description="Total payment amounts over time"
        >
          {chartData.length === 0 ? (
            <EmptyState title="No volume data" />
          ) : (
            <ChartContainer
              config={{
                total: { label: "Total Volume", color: "hsl(var(--chart-4))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => [formatCurrency(value as number), 'Total Volume']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="var(--color-total)" 
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