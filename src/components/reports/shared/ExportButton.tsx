import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ExportButtonProps {
  data: any[];
  filename: string;
}

export function ExportButton({ data, filename }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const exportToCSV = () => {
    if (!data || data.length === 0) return;

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
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const exportToPDF = async () => {
    setLoading(true);
    try {
      // Simple PDF export - could be enhanced with proper table formatting
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      doc.setFontSize(16);
      doc.text(filename, 20, 20);
      
      let yPosition = 40;
      const lineHeight = 10;
      
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        
        // Add headers
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        headers.forEach((header, index) => {
          doc.text(header, 20 + (index * 40), yPosition);
        });
        
        yPosition += lineHeight;
        
        // Add data rows
        doc.setFont(undefined, 'normal');
        data.slice(0, 20).forEach((row) => { // Limit to first 20 rows for PDF
          headers.forEach((header, index) => {
            const value = String(row[header] || '').substring(0, 15); // Truncate long values
            doc.text(value, 20 + (index * 40), yPosition);
          });
          yPosition += lineHeight;
          
          if (yPosition > 270) { // Start new page if needed
            doc.addPage();
            yPosition = 20;
          }
        });
      }
      
      doc.save(`${filename}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={!data || data.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF} disabled={loading}>
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}