import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { CaseTypeData } from '@/hooks/useReportsData';
import { ReportCard } from './ReportCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface CaseTypeReportProps {
  data: CaseTypeData[];
  onExport: () => void;
}

const CATEGORY_COLORS = {
  'divorce': '#ef4444',
  'contracts': '#3b82f6',
  'real_estate': '#10b981',
  'employment': '#f59e0b',
  'criminal': '#8b5cf6',
  'family': '#ec4899',
  'corporate': '#06b6d4',
  'intellectual_property': '#84cc16',
  'immigration': '#f97316',
  'other': '#6b7280'
};

export const CaseTypeReport = ({ data, onExport }: CaseTypeReportProps) => {
  const barData = useMemo(() => {
    return [...data].sort((a, b) => b.count - a.count);
  }, [data]);

  const pieData = useMemo(() => {
    return data.map((item, index) => ({
      ...item,
      fill: CATEGORY_COLORS[item.category.toLowerCase().replace(' ', '_') as keyof typeof CATEGORY_COLORS] || 
            `hsl(${index * 137.5 % 360}, 70%, 50%)`
    }));
  }, [data]);

  const formatCategoryLabel = (category: string) => {
    return category.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <ReportCard
      title="Case Type Analysis"
      description="Distribution of cases by legal category"
      onExport={onExport}
    >
      <div className="space-y-6">
        {/* Bar Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Cases by Category</h4>
          <div className="h-64">
            <ChartContainer
              config={{
                count: { label: 'Cases', color: 'hsl(var(--primary))' }
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="category" 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    tickFormatter={formatCategoryLabel}
                  />
                  <YAxis />
                  <Tooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(label) => formatCategoryLabel(label as string)}
                  />
                  <Bar dataKey="count" fill="var(--color-count)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Category Share</h4>
          <div className="h-64">
            <ChartContainer
              config={Object.fromEntries(
                Object.entries(CATEGORY_COLORS).map(([key, color]) => [
                  key.replace('_', ' '),
                  { label: formatCategoryLabel(key), color }
                ])
              )}
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(label) => formatCategoryLabel(label as string)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead>Cases</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Share</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {barData.map((item) => (
                <TableRow key={item.category}>
                  <TableCell className="font-medium">
                    {formatCategoryLabel(item.category)}
                  </TableCell>
                  <TableCell className="font-semibold">{item.count}</TableCell>
                  <TableCell>{item.percentage.toFixed(1)}%</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ 
                          backgroundColor: CATEGORY_COLORS[item.category.toLowerCase().replace(' ', '_') as keyof typeof CATEGORY_COLORS] || '#6b7280'
                        }}
                      />
                      <div className="flex-1 bg-secondary rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${item.percentage}%`,
                            backgroundColor: CATEGORY_COLORS[item.category.toLowerCase().replace(' ', '_') as keyof typeof CATEGORY_COLORS] || '#6b7280'
                          }}
                        />
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </ReportCard>
  );
};