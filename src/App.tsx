import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import AdminDashboard from "./pages/AdminDashboard";
import HelpCenter from "./pages/HelpCenter";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ProBono from "./pages/ProBono";
import Payment from "./pages/Payment";
import NotFound from "./pages/NotFound";
import { useState } from "react";

const queryClient = new QueryClient();

function AppContent() {
  const { 
    isProtectionEnabled, 
    showLaunchingPage, 
    hasValidSession, 
    isAdminBypassed,
    grantAccess 
  } = useSiteProtection();
  const [showPasswordScreen, setShowPasswordScreen] = useState(false);
  
  useVisitorTracking();

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
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/client-dashboard" element={<Navigate to="/client" replace />} />
      <Route path="/payment" element={
        <ProtectedRoute requiredRole="client">
          <Payment />
        </ProtectedRoute>
      } />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <SiteProtectionProvider>
          <AppContent />
        </SiteProtectionProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
