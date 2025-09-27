import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useReportsData, ReportsFilters } from '@/hooks/useReportsData';
import { ReportsHeader } from '@/components/reports/ReportsHeader';
import { PaymentsReport } from '@/components/reports/PaymentsReport';
import { RevenueReport } from '@/components/reports/RevenueReport';
import { CaseStatusReport } from '@/components/reports/CaseStatusReport';
import { CaseTypeReport } from '@/components/reports/CaseTypeReport';
import { ProposalsReport } from '@/components/reports/ProposalsReport';
import { ConsultationReport } from '@/components/reports/ConsultationReport';
import { EmptyStateMessage } from '@/components/reports/EmptyStateMessage';
import { ExportButton } from '@/components/reports/ExportButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { AdminHeader } from '@/components/admin/AdminHeader';

const AdminReportsPage = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const [filters, setFilters] = useState<ReportsFilters>({
    dateRange: 'last30',
    currency: 'USD',
  });

  const {
    loading,
    paymentsData,
    revenueData,
    caseStatusData,
    caseTypeData,
    proposalData,
    consultationData,
    refetch
  } = useReportsData(filters);

  // Admin-only access check
  if (profile?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <EmptyStateMessage
          title="Access Denied"
          description="You need administrator privileges to view reports."
          icon="filter"
        />
      </div>
    );
  }

  const handleExportAll = async () => {
    try {
      const allData = {
        payments: paymentsData,
        revenue: revenueData,
        caseStatus: caseStatusData,
        caseType: caseTypeData,
        proposals: proposalData,
        consultations: consultationData
      };

      const exportData = Object.entries(allData).map(([key, data]) => ({
        report: key,
        data: data || []
      }));

      const csvContent = [
        'Report,Data',
        ...exportData.map(item => `${item.report},"${JSON.stringify(item.data).replace(/"/g, '""')}"`)
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `reports-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: 'Export Successful',
        description: 'All reports have been exported to CSV'
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export reports',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <AdminHeader />
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <Skeleton className="h-24 mb-6" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const hasData = 
    paymentsData.length > 0 ||
    revenueData.length > 0 ||
    caseStatusData.length > 0 ||
    caseTypeData.length > 0 ||
    proposalData.length > 0 ||
    consultationData.length > 0;

  if (!hasData) {
    return (
      <div className="space-y-6">
        <AdminHeader />
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          <ReportsHeader
            filters={filters}
            onFiltersChange={setFilters}
            onExportAll={handleExportAll}
          />
          <EmptyStateMessage
            title="No Data Available"
            description="There's no data to display for the selected filters and date range. Try adjusting your filters or date range."
            actionText="Refresh Data"
            onAction={refetch}
            icon="calendar"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHeader />
      
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <ReportsHeader
          filters={filters}
          onFiltersChange={setFilters}
          onExportAll={handleExportAll}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payments Report */}
          {paymentsData.length > 0 && (
            <PaymentsReport
              data={paymentsData}
              currency={filters.currency}
              onExport={() => {
                // Individual export logic for payments
                const csvData = paymentsData.map(p => ({
                  client: p.client_name,
                  lawyer: p.lawyer_name,
                  case: p.case_title,
                  amount: p.amount,
                  currency: p.currency,
                  status: p.status,
                  date: new Date(p.created_at).toLocaleDateString()
                }));
                
                const csvContent = [
                  Object.keys(csvData[0]).join(','),
                  ...csvData.map(row => Object.values(row).join(','))
                ].join('\n');
                
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'payments-report.csv';
                link.click();
              }}
            />
          )}

          {/* Revenue Report */}
          {revenueData.length > 0 && (
            <RevenueReport
              data={revenueData}
              currency={filters.currency}
              onExport={() => {
                // Export logic for revenue
              }}
            />
          )}

          {/* Case Status Report */}
          {caseStatusData.length > 0 && (
            <CaseStatusReport
              data={caseStatusData}
              onExport={() => {
                // Export logic for case status
              }}
            />
          )}

          {/* Case Type Report */}
          {caseTypeData.length > 0 && (
            <CaseTypeReport
              data={caseTypeData}
              onExport={() => {
                // Export logic for case types
              }}
            />
          )}

          {/* Proposals Report */}
          {proposalData.length > 0 && (
            <ProposalsReport
              data={proposalData}
              onExport={() => {
                // Export logic for proposals
              }}
            />
          )}

          {/* Consultation Report */}
          {consultationData.length > 0 && (
            <ConsultationReport
              data={consultationData}
              onExport={() => {
                // Export logic for consultations
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminReportsPage;