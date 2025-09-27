import { useState } from 'react';
import { Download, FileSpreadsheet, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface ExportButtonProps {
  data: any[];
  filename: string;
  type: 'table' | 'chart';
  chartRef?: React.RefObject<any>;
}

export const ExportButton = ({ data, filename, type, chartRef }: ExportButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const exportToCSV = () => {
    try {
      setLoading(true);
      
      if (!data || data.length === 0) {
        toast({
          title: 'Export Failed',
          description: 'No data available to export',
          variant: 'destructive'
        });
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = row[header];
            // Handle values that might contain commas or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${filename}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: 'Export Successful',
          description: `Data exported to ${filename}.csv`
        });
      }
    } catch (error) {
      console.error('CSV export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export data to CSV',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportChartAsPNG = async () => {
    try {
      setLoading(true);
      
      if (!chartRef?.current) {
        toast({
          title: 'Export Failed',
          description: 'Chart not available for export',
          variant: 'destructive'
        });
        return;
      }

      // For Recharts, we need to get the SVG element
      const svgElement = chartRef.current.querySelector('svg');
      if (!svgElement) {
        toast({
          title: 'Export Failed',
          description: 'Chart SVG not found',
          variant: 'destructive'
        });
        return;
      }

      // Convert SVG to PNG using canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      const img = document.createElement('img');
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const link = document.createElement('a');
            link.download = `${filename}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            
            toast({
              title: 'Export Successful',
              description: `Chart exported to ${filename}.png`
            });
          }
        });
        
        URL.revokeObjectURL(svgUrl);
      };
      
      img.src = svgUrl;
    } catch (error) {
      console.error('PNG export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export chart as PNG',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (type === 'table') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={exportToCSV}
        disabled={loading}
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        CSV
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={loading}>
          <Download className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportChartAsPNG}>
          <Image className="h-4 w-4 mr-2" />
          Export as PNG
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};