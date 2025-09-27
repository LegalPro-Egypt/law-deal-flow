import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { CaseStatusData } from '@/hooks/useReportsData';
import { ReportCard } from './ReportCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface CaseStatusReportProps {
  data: CaseStatusData[];
  onExport: () => void;
}

const STATUS_COLORS = {
  'submitted': '#3b82f6',
  'intake': '#8b5cf6',
  'lawyer_assigned': '#f59e0b',
  'proposal_sent': '#10b981',
  'proposal_accepted': '#06b6d4',
  'active': '#22c55e',
  'in_progress': '#84cc16',
  'completed': '#6366f1',
  'closed': '#6b7280',
  'draft': '#f97316'
};

export const CaseStatusReport = ({ data, onExport }: CaseStatusReportProps) => {
  const pieData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      fill: STATUS_COLORS[item.status as keyof typeof STATUS_COLORS] || `hsl(${index * 137.5 % 360}, 70%, 50%)`
    }));
  }, [data]);

  // Mock trend data - in real implementation, this would come from historical data
  const trendData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        new: Math.floor(Math.random() * 10) + 2,
        active: Math.floor(Math.random() * 15) + 5,
        completed: Math.floor(Math.random() * 8) + 1,
        closed: Math.floor(Math.random() * 5) + 1
      };
    });
    return last30Days;
  }, []);

  const getStatusVariant = (status: string) => {
    const variants: Record<string, any> = {
      'submitted': 'secondary',
      'intake': 'secondary',
      'lawyer_assigned': 'default',
      'proposal_sent': 'outline',
      'proposal_accepted': 'default',
      'active': 'default',
      'in_progress': 'default',
      'completed': 'secondary',
      'closed': 'outline',
      'draft': 'outline'
    };
    return variants[status] || 'outline';
  };

  const formatStatusLabel = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <ReportCard
      title="Case Status Distribution"
      description="Overview of cases by current status with trend analysis"
      onExport={onExport}
    >
      <div className="space-y-6">
        {/* Pie Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Current Distribution</h4>
          <div className="h-64">
            <ChartContainer
              config={Object.fromEntries(
                Object.entries(STATUS_COLORS).map(([key, color]) => [
                  key,
                  { label: formatStatusLabel(key), color }
                ])
              )}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percentage }) => `${formatStatusLabel(status)}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Trend Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Status Trends (Last 30 Days)</h4>
          <div className="h-64">
            <ChartContainer
              config={{
                new: { label: 'New', color: STATUS_COLORS.submitted },
                active: { label: 'Active', color: STATUS_COLORS.active },
                completed: { label: 'Completed', color: STATUS_COLORS.completed },
                closed: { label: 'Closed', color: STATUS_COLORS.closed }
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="new" stroke="var(--color-new)" strokeWidth={2} />
                  <Line type="monotone" dataKey="active" stroke="var(--color-active)" strokeWidth={2} />
                  <Line type="monotone" dataKey="completed" stroke="var(--color-completed)" strokeWidth={2} />
                  <Line type="monotone" dataKey="closed" stroke="var(--color-closed)" strokeWidth={2} />
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
                <TableHead>Status</TableHead>
                <TableHead>Count</TableHead>
                <TableHead>Percentage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item) => (
                <TableRow key={item.status}>
                  <TableCell>
                    <Badge variant={getStatusVariant(item.status)}>
                      {formatStatusLabel(item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold">{item.count}</TableCell>
                  <TableCell>{item.percentage.toFixed(1)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </ReportCard>
  );
};