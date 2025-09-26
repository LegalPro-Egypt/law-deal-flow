import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useAdminData } from "@/hooks/useAdminData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Eye,
  Scale,
  Briefcase
} from "lucide-react";
// Import existing components
import { LawyerRequestsManager } from "@/components/LawyerRequestsManager";
import { AdminAnalytics } from "@/components/AdminAnalytics";
import AnonymousQAManager from "@/components/AnonymousQAManager";
import { ProBonoApplicationsManager } from "@/components/ProBonoApplicationsManager";
// Import tab components
import { ClientsTab } from "@/components/admin/ClientsTab";
import { SupportTicketsTab } from "@/components/admin/SupportTicketsTab";

// Dashboard Overview Component
const DashboardOverview = () => {
  const { stats, loading } = useAdminData();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-32 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of system status and pending actions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCases}</div>
            <p className="text-xs text-muted-foreground">
              All cases in the system
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCases}</div>
            <p className="text-xs text-muted-foreground">
              Cases currently being worked on
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Intakes</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingIntakes}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review and processing
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Lawyers</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLawyers}</div>
            <p className="text-xs text-muted-foreground">
              Verified legal professionals
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">
              Registered client accounts
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReviews}</div>
            <p className="text-xs text-muted-foreground">
              Items requiring admin review
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Placeholder components for routes
const ClientsPage = () => <div className="p-6"><ClientsTab /></div>;
const LawyersPage = () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Lawyers</h1><p>Lawyers management coming soon...</p></div>;
const LawyerRequestsPage = () => <div className="p-6"><LawyerRequestsManager /></div>;
const SupportTicketsPage = () => <div className="p-6"><SupportTicketsTab /></div>;
const AIIntakesPage = () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">AI Intakes</h1><p>AI Intakes management coming soon...</p></div>;
const AnalyticsPage = () => <div className="p-6"><AdminAnalytics /></div>;
const ProBonoPage = () => <div className="p-6"><ProBonoApplicationsManager /></div>;
const WaitingListPage = () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Waiting List</h1><p>Waiting list management coming soon...</p></div>;
const AnonymousQAPage = () => <div className="p-6"><AnonymousQAManager /></div>;
const CasesReviewPage = () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Cases for Review</h1><p>Case review management coming soon...</p></div>;
const ProposalsReviewPage = () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Proposals for Review</h1><p>Proposal review management coming soon...</p></div>;
const ReportsPage = () => <div className="p-6"><h1 className="text-2xl font-bold mb-4">Reports</h1><p>Reports coming soon...</p></div>;

const AdminDashboard = () => {
  const location = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with trigger */}
          <header className="h-12 flex items-center border-b px-4">
            <SidebarTrigger />
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<div className="p-6"><DashboardOverview /></div>} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/lawyers" element={<LawyersPage />} />
              <Route path="/lawyers/requests" element={<LawyerRequestsPage />} />
              <Route path="/support" element={<SupportTicketsPage />} />
              <Route path="/intakes/ai" element={<AIIntakesPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/lawyers/pro-bono" element={<ProBonoPage />} />
              <Route path="/lawyers/waiting-list" element={<WaitingListPage />} />
              <Route path="/anonymous" element={<AnonymousQAPage />} />
              <Route path="/cases/review" element={<CasesReviewPage />} />
              <Route path="/proposals/review" element={<ProposalsReviewPage />} />
              <Route path="/reports/*" element={<ReportsPage />} />
              {/* Redirect any unknown admin routes to dashboard */}
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;