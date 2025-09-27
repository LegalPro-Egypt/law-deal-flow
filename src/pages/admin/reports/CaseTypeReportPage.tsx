import { useState } from 'react';
import { ReportLayout } from '@/components/reports/shared/ReportLayout';
import { ReportCard } from '@/components/reports/shared/ReportCard';
import { EmptyState } from '@/components/reports/shared/EmptyState';
import { LoadingState } from '@/components/reports/shared/LoadingState';
import { useReportsData, ReportFilters } from '@/hooks/useReportsData';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function CaseTypeReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({
    dateRange: {
      from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      to: new Date(),
    },
    currency: 'USD',
  });

  const { caseTypeData, loading, error } = useReportsData(filters);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-destructive p-6">Error: {error}</div>;

  // Colors for different case types
  const typeColors = [
    'hsl(var(--chart-1))',
    'hsl(var(--chart-2))',
    'hsl(var(--chart-3))',
    'hsl(var(--chart-4))',
    'hsl(var(--chart-5))',
  ];

  const totalCases = caseTypeData.reduce((sum, item) => sum + item.count, 0);

  return (
    <ReportLayout
      title="Case Type Report"
      description="Analysis of cases by category and type distribution"
      filters={filters}
      onFiltersChange={setFilters}
    >
      <div className="grid gap-6 md:grid-cols-2">
        {/* Case Type Table */}
        <ReportCard
          title="Case Types"
          description={`Total cases: ${totalCases}`}
          exportData={caseTypeData}
          exportFilename="case-types"
        >
          {caseTypeData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {caseTypeData.map((item) => (
                    <TableRow key={item.category}>
                      <TableCell className="font-medium capitalize">
                        {item.category.replace('_', ' ')}
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

        {/* Case Type Bar Chart */}
        <ReportCard
          title="Cases by Category"
          description="Bar chart showing case distribution by type"
        >
          {caseTypeData.length === 0 ? (
            <EmptyState title="No case type data" />
          ) : (
            <ChartContainer
              config={{
                count: { label: "Cases", color: "hsl(var(--chart-1))" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={caseTypeData}>
                  <XAxis 
                    dataKey="category" 
                    tick={{ fontSize: 12 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </ReportCard>

        {/* Case Type Donut Chart */}
        <ReportCard
          title="Category Share"
          description="Percentage distribution of case categories"
        >
          {caseTypeData.length === 0 ? (
            <EmptyState title="No share data" />
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
                    data={caseTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={100}
                    dataKey="count"
                    label={({ category, percentage }) => 
                      `${category.replace('_', ' ')} (${percentage}%)`
                    }
                  >
                    {caseTypeData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={typeColors[index % typeColors.length]}
                      />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    formatter={(value) => [`${value} cases`, 'Count']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </ReportCard>

        {/* Summary Stats */}
        <ReportCard
          title="Summary Statistics"
          description="Key metrics for case types"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{caseTypeData.length}</div>
                <div className="text-sm text-muted-foreground">Different Categories</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">{totalCases}</div>
                <div className="text-sm text-muted-foreground">Total Cases</div>
              </div>
            </div>

            {caseTypeData.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Most Common Category:</div>
                <div className="text-lg font-semibold text-primary capitalize">
                  {caseTypeData[0]?.category.replace('_', ' ')} ({caseTypeData[0]?.count} cases)
                </div>
              </div>
            )}

            {caseTypeData.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Average per Category:</div>
                <div className="text-lg font-semibold">
                  {Math.round(totalCases / caseTypeData.length)} cases
                </div>
              </div>
            )}
          </div>
        </ReportCard>
      </div>
    </ReportLayout>
  );
}