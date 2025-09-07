import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { VehicleProvider } from "@/contexts/VehicleContext";
import { DriverProvider } from "@/contexts/DriverContext";
import { ManualTransactionProvider } from "@/contexts/ManualTransactionContext";
import { TripProvider } from "@/contexts/TripContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import SettingsPage from "./pages/SettingsPage";
import ProfitLossPage from "./pages/ProfitLossPage";
import TripManagerPage from "./pages/TripManagerPage";
import SupportPage from "./pages/SupportPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsConditionsPage from "./pages/TermsConditionsPage";
import NotFound from "./pages/NotFound";
import SubscriptionPage from "./pages/SubscriptionPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import ManageOperatorsPage from "./pages/ManageOperatorsPage";
import VehicleManagerPage from "./pages/VehicleManagerPage";
import GpsManagerPage from "./pages/GpsManagerPage";
import PayTapDashboardPage from "./pages/PayTapDashboardPage";
import ChallansDashboardPage from "./pages/ChallansDashboardPage";
import AppLayout from "./components/AppLayout";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, isLoading, emailUnverified } = useAuth();
  const isActiveSub = user?.subscribed && (!user?.subscriptionEnd || new Date(user.subscriptionEnd) > new Date());

  console.log('AppRoutes render - user:', user?.email, 'isLoading:', isLoading, 'isOnboarded:', user?.isOnboarded);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <div className="w-8 h-8 bg-primary-foreground rounded"></div>
          </div>
          <p className="text-muted-foreground">Loading MyFleet AI...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show auth page directly
  if (!user) {
    console.log('No user - showing auth page');
    return (
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-conditions" element={<TermsConditionsPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }


  // Subscription gate for onboarded users without active plan
  if (!isActiveSub) {
    console.log('No active subscription - showing subscription page');
    return (
      <Routes>
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/payment/success" element={<PaymentSuccessPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-conditions" element={<TermsConditionsPage />} />
        <Route path="*" element={<SubscriptionPage />} />
      </Routes>
    );
  }

  // Fully authenticated, onboarded, and subscribed
  console.log('Fully authenticated - showing main app');
  return (
    <div>
      {emailUnverified && <EmailVerificationBanner />}
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Index />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/profit-loss" element={<ProfitLossPage />} />
          <Route path="/vehicle-manager" element={<VehicleManagerPage />} />
          <Route path="/gps-manager" element={<GpsManagerPage />} />
          <Route path="/trip-manager" element={<TripManagerPage />} />
          <Route path="/manage-operators" element={<ManageOperatorsPage />} />
            <Route path="/paytap-dashboard" element={<PayTapDashboardPage />} />
            <Route path="/challans-dashboard" element={<ChallansDashboardPage />} />
          <Route path="/support" element={<SupportPage />} />
        </Route>
        <Route path="/login" element={<Index />} /> {/* Redirect authenticated users to dashboard */}
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DriverProvider>
        <VehicleProvider>
          <ManualTransactionProvider>
            <TripProvider>
              <WalletProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <AppRoutes />
                  </BrowserRouter>
                </TooltipProvider>
              </WalletProvider>
            </TripProvider>
          </ManualTransactionProvider>
        </VehicleProvider>
      </DriverProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
