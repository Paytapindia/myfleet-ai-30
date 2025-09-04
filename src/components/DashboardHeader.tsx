import { Bell, User, LogOut, LifeBuoy, AlertTriangle, Car, FileText, CreditCard, Mail, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const DashboardHeader = () => {
  const { user, logout, session, resendVerificationEmail } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  const handleResendEmail = async () => {
    if (!session?.user?.email) return;
    setIsResendingEmail(true);
    await resendVerificationEmail(session.user.email);
    setIsResendingEmail(false);
  };

  const isEmailUnverified = session?.user && !session.user.email_confirmed_at;

  // Mock vehicle alerts - replace with real data later
  const vehicleAlerts = [
    { id: 1, vehicle: "MH12AB1234", message: "Service due in 2 days", type: "warning", time: "2 hours ago" },
    { id: 2, vehicle: "MH12CD5678", message: "Insurance expires tomorrow", type: "urgent", time: "5 hours ago" },
    { id: 3, vehicle: "MH12EF9012", message: "Fuel level low", type: "info", time: "1 day ago" },
  ];

  // Include email verification in alerts if needed
  const allAlerts = isEmailUnverified 
    ? [
        {
          id: 'email-verification',
          type: 'email',
          vehicle: 'Email Verification',
          message: 'Please verify your email address',
          time: 'Action needed'
        },
        ...vehicleAlerts
      ]
    : vehicleAlerts;

  const unreadCount = allAlerts.length;

  return (
    <header className="sticky top-0 z-40 glass-effect border-b border-border/50 px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
          <SidebarTrigger className="apple-button shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-foreground tracking-tight truncate">{t('app.name')}</h1>
            <p className="hidden sm:block text-sm text-muted-foreground font-medium truncate">
              {t('header.welcomeBack', { name: user?.fullName || t('roles.fleetManager') })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          <DropdownMenu open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={`relative apple-button rounded-xl h-11 w-11 hover:bg-primary/10 ${isEmailUnverified ? 'animate-pulse' : ''}`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant={isEmailUnverified ? "destructive" : "secondary"}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-2xl apple-shadow glass-effect border-border/50">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Badge variant="secondary">{unreadCount} new</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allAlerts.length > 0 ? (
                allAlerts.map((alert) => (
                  <DropdownMenuItem 
                    key={alert.id} 
                    className="flex items-start gap-3 p-4 cursor-pointer"
                    onClick={alert.id === 'email-verification' ? handleResendEmail : undefined}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {alert.type === 'email' && <Mail className="h-4 w-4 text-orange-500" />}
                      {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      {alert.type === 'urgent' && <AlertTriangle className="h-4 w-4 text-red-500" />}
                      {alert.type === 'info' && <Car className="h-4 w-4 text-blue-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-medium text-sm truncate">{alert.vehicle}</span>
                        <Badge 
                          variant={alert.type === 'urgent' || alert.type === 'email' ? 'destructive' : alert.type === 'warning' ? 'default' : 'secondary'}
                          className="text-xs ml-2"
                        >
                          {alert.type === 'email' ? 'urgent' : alert.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">{alert.message}</p>
                      <span className="text-xs text-muted-foreground">
                        {alert.id === 'email-verification' && isResendingEmail 
                          ? 'Sending...' 
                          : alert.time
                        }
                        {alert.id === 'email-verification' && !isResendingEmail && (
                          <span className="ml-2 text-blue-600">Click to resend</span>
                        )}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem disabled>
                  <span className="text-sm text-muted-foreground">No alerts</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="apple-button rounded-xl h-11 w-11">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-2xl apple-shadow glass-effect border-border/50">
              <DropdownMenuLabel>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.fullName || 'Fleet Manager'}</p>
                    <p className="text-xs text-muted-foreground">+91 {user?.phone}</p>
                    {user?.companyName && (
                      <p className="text-xs text-muted-foreground">{user.companyName}</p>
                    )}
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/support')}>
                <LifeBuoy className="mr-2 h-4 w-4" />
                {t('nav.support')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('auth.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;