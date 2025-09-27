import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { PaymentData } from '@/hooks/useReportsData';
import { ReportCard } from './ReportCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface PaymentsReportProps {
  data: PaymentData[];
  currency: string;
  onExport: () => void;
}

export const PaymentsReport = ({ data, currency, onExport }: PaymentsReportProps) => {
  const chartData = useMemo(() => {
    // Group by month and status
    const monthlyData = data.reduce((acc, payment) => {
      const month = new Date(payment.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      if (!acc[month]) {
        acc[month] = { month, paid: 0, pending: 0, overdue: 0, total: 0 };
      }
      acc[month][payment.status as keyof typeof acc[typeof month]] += payment.amount;
      acc[month].total += payment.amount;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(monthlyData).sort((a: any, b: any) => 
      new Date(a.month).getTime() - new Date(b.month).getTime()
    );
  }, [data]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'secondary';
      case 'overdue': return 'destructive';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    const symbols = { USD: '$', EUR: '€', EGP: '£' };
    return `${symbols[currency as keyof typeof symbols] || '$'}${amount.toLocaleString()}`;
  };

  return (
    <ReportCard
      title="Payments Report"
      description="Payment status breakdown by client and lawyer"
      onExport={onExport}
    >
      <div className="space-y-6">
        {/* Chart */}
        <div className="h-80">
          <ChartContainer
            config={{
              paid: { label: 'Paid', color: 'hsl(var(--primary))' },
              pending: { label: 'Pending', color: 'hsl(var(--secondary))' },
              overdue: { label: 'Overdue', color: 'hsl(var(--destructive))' },
              total: { label: 'Total Volume', color: 'hsl(var(--accent))' }
            }}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar dataKey="paid" stackId="a" fill="var(--color-paid)" />
                <Bar dataKey="pending" stackId="a" fill="var(--color-pending)" />
                <Bar dataKey="overdue" stackId="a" fill="var(--color-overdue)" />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="var(--color-total)" 
                  strokeWidth={2}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
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
              {data.slice(0, 10).map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.client_name}</TableCell>
                  <TableCell>{payment.lawyer_name}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{payment.case_title}</TableCell>
                  <TableCell>{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(payment.status)}>
                      {payment.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.length > 10 && (
            <div className="p-4 text-center text-sm text-muted-foreground border-t">
              Showing 10 of {data.length} payments
            </div>
          )}
        </div>
      </div>
    </ReportCard>
  );
};