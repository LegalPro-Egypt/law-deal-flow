import { useState } from 'react';
import { Calendar, Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ReportsFilters } from '@/hooks/useReportsData';

interface ReportsHeaderProps {
  filters: ReportsFilters;
  onFiltersChange: (filters: ReportsFilters) => void;
  onExportAll: () => void;
}

export const ReportsHeader = ({ filters, onFiltersChange, onExportAll }: ReportsHeaderProps) => {
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  const handleDateRangeChange = (range: ReportsFilters['dateRange']) => {
    if (range === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
      onFiltersChange({ ...filters, dateRange: range });
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      onFiltersChange({
        ...filters,
        dateRange: 'custom',
        startDate: customStartDate.toISOString().split('T')[0],
        endDate: customEndDate.toISOString().split('T')[0]
      });
      setShowCustomDatePicker(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Date Range Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Date Range</label>
              <Select value={filters.dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7">Last 7 days</SelectItem>
                  <SelectItem value="last30">Last 30 days</SelectItem>
                  <SelectItem value="last90">Last 90 days</SelectItem>
                  <SelectItem value="ytd">Year to date</SelectItem>
                  <SelectItem value="custom">Custom range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Picker */}
            {showCustomDatePicker && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-foreground">Custom Range</label>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-[120px] justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'MMM dd') : 'Start'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-[120px] justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'MMM dd') : 'End'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Button
                    onClick={handleCustomDateApply}
                    size="sm"
                    disabled={!customStartDate || !customEndDate}
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}

            {/* Currency Selector */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-foreground">Currency</label>
              <Select value={filters.currency} onValueChange={(value: any) => onFiltersChange({ ...filters, currency: value })}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="EGP">EGP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onExportAll}>
              <Download className="h-4 w-4 mr-2" />
              Export All
            </Button>
          </div>
        </div>

        {/* Applied Filters Display */}
        {(filters.lawyerId || filters.caseType || filters.status) && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              <span>Active filters:</span>
              {filters.lawyerId && <span className="bg-secondary px-2 py-1 rounded">Lawyer filtered</span>}
              {filters.caseType && <span className="bg-secondary px-2 py-1 rounded">Case type: {filters.caseType}</span>}
              {filters.status && <span className="bg-secondary px-2 py-1 rounded">Status: {filters.status}</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};