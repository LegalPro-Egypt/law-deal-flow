import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useVisitorTracking } from "@/hooks/useVisitorTracking";
import { SiteProtectionProvider, useSiteProtection } from "@/contexts/SiteProtectionContext";
import { LaunchingSoon } from "@/components/LaunchingSoon";
import { SitePasswordProtection } from "@/components/SitePasswordProtection";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Intake from "./pages/Intake";
import Index from "./pages/Index";
import LegalDatabase from "./pages/LegalDatabase";
import LegalArticle from "./pages/LegalArticle";
import ClientDashboard from "./pages/ClientDashboard";
import LawyerDashboard from "./pages/LawyerDashboard";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminHomePage from "@/pages/admin/AdminHomePage";
import AdminClientsPage from "@/pages/admin/AdminClientsPage";
import AdminLawyersPage from "@/pages/admin/AdminLawyersPage";
import AdminLawyerRequestsPage from "@/pages/admin/AdminLawyerRequestsPage";
import AdminSupportPage from "@/pages/admin/AdminSupportPage";
import AdminAIIntakesPage from "@/pages/admin/AdminAIIntakesPage";
import AdminAnalyticsPage from "@/pages/admin/AdminAnalyticsPage";
import AdminProBonoPage from "@/pages/admin/AdminProBonoPage";
import AdminWaitingListPage from "@/pages/admin/AdminWaitingListPage";
import AdminAnonymousPage from "@/pages/admin/AdminAnonymousPage";
import AdminCasesReviewPage from "@/pages/admin/AdminCasesReviewPage";
import AdminProposalsReviewPage from "@/pages/admin/AdminProposalsReviewPage";
import PaymentsReportPage from "@/pages/admin/reports/PaymentsReportPage";
import RevenueReportPage from "@/pages/admin/reports/RevenueReportPage";
import CaseStatusReportPage from "@/pages/admin/reports/CaseStatusReportPage";
import CaseTypeReportPage from "@/pages/admin/reports/CaseTypeReportPage";
import ProposalsReportPage from "@/pages/admin/reports/ProposalsReportPage";
import ConsultationsReportPage from "@/pages/admin/reports/ConsultationsReportPage";
import LawyerFormsPage from "@/pages/admin/forms-policies/LawyerFormsPage";
import ClientFormsPage from "@/pages/admin/forms-policies/ClientFormsPage";
import ClientPoliciesPage from "@/pages/admin/forms-policies/ClientPoliciesPage";
import LawyerPoliciesPage from "@/pages/admin/forms-policies/LawyerPoliciesPage";
import HelpCenter from "./pages/HelpCenter";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ProBono from "./pages/ProBono";
import Payment from "./pages/Payment";
import NotFound from "./pages/NotFound";
import { useState } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

import { useAuth } from "@/hooks/useAuth";

function AppContent() {
  const { profile } = useAuth();
  const { 
    isProtectionEnabled, 
    showLaunchingPage, 
    hasValidSession, 
    isAdminBypassed,
    grantAccess 
  } = useSiteProtection();
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  
  useVisitorTracking(profile);

  // If protection is enabled and user doesn't have valid session or admin bypass
  if (isProtectionEnabled && !hasValidSession && !isAdminBypassed) {
    // Show password screen if requested
    if (showPasswordScreen) {
      return (
        <SitePasswordProtection 
          onSuccess={() => {
            grantAccess();
            setShowPasswordScreen(false);
          }} 
        />
      );
    }
    
    // Show launching soon page by default
    if (showLaunchingPage) {
      return (
        <LaunchingSoon 
          onPasswordAccess={() => setShowPasswordScreen(true)} 
        />
      );
    }
    
    // If launching page is disabled, show password screen directly
    return (
      <SitePasswordProtection 
        onSuccess={grantAccess} 
      />
    );
  }

  // Normal application flow
  return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/pro-bono" element={<ProBono />} />
        <Route path="/intake" element={
          <ProtectedRoute>
            <Intake />
          </ProtectedRoute>
        } />
        <Route path="/legal-database" element={<LegalDatabase />} />
        <Route path="/legal-database/article/:id" element={<LegalArticle />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />
        <Route path="/client" element={
          <ProtectedRoute requiredRole="client">
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="/lawyer" element={
          <ProtectedRoute requiredRole="lawyer">
            <LawyerDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminHomePage />} />
          <Route path="clients" element={<AdminClientsPage />} />
          <Route path="lawyers" element={<AdminLawyersPage />} />
          <Route path="lawyers/requests" element={<AdminLawyerRequestsPage />} />
          <Route path="support" element={<AdminSupportPage />} />
          <Route path="intakes/ai" element={<AdminAIIntakesPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="lawyers/pro-bono" element={<AdminProBonoPage />} />
          <Route path="lawyers/waiting-list" element={<AdminWaitingListPage />} />
          <Route path="anonymous" element={<AdminAnonymousPage />} />
          <Route path="cases/review" element={<AdminCasesReviewPage />} />
          <Route path="proposals/review" element={<AdminProposalsReviewPage />} />
          <Route path="reports/payments" element={<PaymentsReportPage />} />
          <Route path="reports/revenue" element={<RevenueReportPage />} />
          <Route path="reports/case-status" element={<CaseStatusReportPage />} />
          <Route path="reports/case-type" element={<CaseTypeReportPage />} />
          <Route path="reports/proposals" element={<ProposalsReportPage />} />
          <Route path="reports/consultations" element={<ConsultationsReportPage />} />
          <Route path="forms-policies/lawyer-forms" element={<LawyerFormsPage />} />
          <Route path="forms-policies/client-forms" element={<ClientFormsPage />} />
          <Route path="forms-policies/client-policies" element={<ClientPoliciesPage />} />
          <Route path="forms-policies/lawyer-policies" element={<LawyerPoliciesPage />} />
        </Route>
        <Route path="/client-dashboard" element={<Navigate to="/client" replace />} />
        <Route path="/payment" element={
          <ProtectedRoute requiredRole="client">
            <Payment />
          </ProtectedRoute>
        } />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <HashRouter>
        <SiteProtectionProvider>
          <AppContent />
        </SiteProtectionProvider>
      </HashRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
