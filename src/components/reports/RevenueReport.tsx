import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { RevenueData } from '@/hooks/useReportsData';
import { ReportCard } from './ReportCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface RevenueReportProps {
  data: RevenueData[];
  currency: string;
  onExport: () => void;
}

export const RevenueReport = ({ data, currency, onExport }: RevenueReportProps) => {
  const [trendPeriod, setTrendPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  const topCasesData = useMemo(() => {
    return [...data]
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 10);
  }, [data]);

  const trendData = useMemo(() => {
    // Group by the selected period
    const groupBy = (date: string) => {
      const d = new Date(date);
      switch (trendPeriod) {
        case 'daily':
          return d.toISOString().split('T')[0];
        case 'weekly':
          const weekStart = new Date(d.setDate(d.getDate() - d.getDay()));
          return weekStart.toISOString().split('T')[0];
        case 'monthly':
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        default:
          return date;
      }
    };

    const grouped = data.reduce((acc, item) => {
      const period = groupBy(item.created_at);
      if (!acc[period]) {
        acc[period] = { period, revenue: 0, cases: 0 };
      }
      acc[period].revenue += item.total_revenue;
      acc[period].cases += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(grouped).sort((a: any, b: any) => a.period.localeCompare(b.period));
  }, [data, trendPeriod]);

  const formatCurrency = (amount: number) => {
    const symbols = { USD: '$', EUR: '€', EGP: '£' };
    return `${symbols[currency as keyof typeof symbols] || '$'}${amount.toLocaleString()}`;
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'active': return 'secondary';
      case 'closed': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <ReportCard
      title="Revenue by Case"
      description="Total revenue generated per case with trend analysis"
      onExport={onExport}
    >
      <div className="space-y-6">
        {/* Top Cases Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Top Earning Cases</h4>
          <div className="h-64">
            <ChartContainer
              config={{
                total_revenue: { label: 'Revenue', color: 'hsl(var(--primary))' }
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCasesData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="case_number" type="category" width={80} />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="total_revenue" fill="var(--color-total_revenue)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Trend Chart */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium">Revenue Trend</h4>
            <Select value={trendPeriod} onValueChange={(value: any) => setTrendPeriod(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="h-64">
            <ChartContainer
              config={{
                revenue: { label: 'Revenue', color: 'hsl(var(--primary))' }
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="var(--color-revenue)" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Case Number</TableHead>
                <TableHead>Case Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Date Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topCasesData.map((case_item) => (
                <TableRow key={case_item.case_id}>
                  <TableCell className="font-medium">{case_item.case_number}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{case_item.case_title}</TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(case_item.status)}>
                      {case_item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{formatCurrency(case_item.total_revenue)}</TableCell>
                  <TableCell>{new Date(case_item.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </ReportCard>
  );
};