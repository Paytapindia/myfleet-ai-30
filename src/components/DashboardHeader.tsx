import { Bell, User, LogOut, LifeBuoy } from "lucide-react";
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  // Mock vehicle alerts - replace with real data later
  const vehicleAlerts = [
    { id: 1, vehicle: "MH12AB1234", message: "Service due in 2 days", type: "warning", time: "2 hours ago" },
    { id: 2, vehicle: "MH12CD5678", message: "Insurance expires tomorrow", type: "urgent", time: "5 hours ago" },
    { id: 3, vehicle: "MH12EF9012", message: "Fuel level low", type: "info", time: "1 day ago" },
  ];

  const unreadCount = vehicleAlerts.length;

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
                className="relative apple-button rounded-xl h-11 w-11 hover:bg-primary/10"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-2xl apple-shadow glass-effect border-border/50">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Vehicle Alerts</span>
                <Badge variant="secondary">{unreadCount} new</Badge>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {vehicleAlerts.length > 0 ? (
                vehicleAlerts.map((alert) => (
                  <DropdownMenuItem key={alert.id} className="flex flex-col items-start p-4">
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-medium text-sm">{alert.vehicle}</span>
                      <Badge 
                        variant={alert.type === 'urgent' ? 'destructive' : alert.type === 'warning' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {alert.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{alert.message}</p>
                    <span className="text-xs text-muted-foreground">{alert.time}</span>
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