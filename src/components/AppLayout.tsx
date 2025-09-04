import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/AppSidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { EmailVerificationBanner } from "@/components/EmailVerificationBanner";
import { useAuth } from "@/contexts/AuthContext";

export default function AppLayout() {
  const { session } = useAuth();
  const isEmailUnverified = session?.user && !session.user.email_confirmed_at;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          {isEmailUnverified && <EmailVerificationBanner />}
          <main className="flex-1 p-3 sm:p-4 lg:p-6 bg-secondary/30 overflow-auto">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
