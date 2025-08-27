import { 
  Home, 
  BarChart3, 
  Users, 
  Car, 
  Truck, 
  CreditCard, 
  AlertCircle, 
  ChevronDown, 
  FolderOpen, 
  Settings,
  Satellite 
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Profit & Loss", url: "/profit-loss", icon: BarChart3 },
];

const managerItems = [
  { title: "Vehicle Manager", url: "/vehicle-manager", icon: Truck },
  { title: "GPS Manager", url: "/gps-manager", icon: Satellite },
  { title: "PayTap Dashboard", url: "/paytap-dashboard", icon: CreditCard },
  { title: "Challans Dashboard", url: "/challans-dashboard", icon: AlertCircle },
  { title: "Vehicle Operators", url: "/manage-operators", icon: Users },
  { title: "Trip Manager", url: "/trip-manager", icon: Car },
];

export default function AppSidebar() {
  const { t } = useTranslation();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const location = useLocation();
  const [isManagerOpen, setIsManagerOpen] = useState(true);
  
  const isActive = (path: string) => location.pathname === path;
  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  // Check if any manager item is active to keep the group open
  const isAnyManagerItemActive = managerItems.some(item => isActive(item.url));

  const mainLabelMap: Record<string, string> = {
    Dashboard: t("nav.dashboard"),
    "Profit & Loss": t("nav.profitLoss"),
  };

  const managerLabelMap: Record<string, string> = {
    "Vehicle Manager": t("nav.vehicleManager"),
    "GPS Manager": t("nav.gpsManager"),
    "PayTap Dashboard": "PayTap Dashboard",
    "Challans Dashboard": "Challans Dashboard",
    "Vehicle Operators": t("nav.manageOperators"),
    "Trip Manager": t("nav.tripManager"),
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-sidebar-border bg-sidebar/95 backdrop-blur-sm"
    >
      <SidebarContent className="flex flex-col h-full">
        {/* Main Navigation */}
        <div className="flex-1 py-4">
          <SidebarGroup className="px-2">
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {mainItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive(item.url)}
                      size="lg"
                      className={`
                        group relative rounded-xl px-3 py-2.5 transition-all duration-200 
                        hover:bg-sidebar-accent hover:shadow-sm
                        data-[active=true]:bg-primary data-[active=true]:text-primary-foreground 
                        data-[active=true]:shadow-lg data-[active=true]:scale-[0.98]
                        font-medium
                      `}
                    >
                      <NavLink to={item.url} end onClick={handleNavClick}>
                        <item.icon className="h-5 w-5 shrink-0" />
                        {state !== "collapsed" && (
                          <span className="ml-3 text-sm font-medium truncate">
                            {mainLabelMap[item.title]}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Divider */}
          <div className="px-4 my-4">
            <Separator className="bg-sidebar-border" />
          </div>

          {/* Manager Section */}
          <SidebarGroup className="px-2">
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Collapsible 
                    open={isManagerOpen || isAnyManagerItemActive} 
                    onOpenChange={setIsManagerOpen}
                    className="w-full"
                  >
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        size="lg"
                        className={`
                          group relative rounded-xl px-3 py-2.5 w-full justify-between
                          transition-all duration-200 hover:bg-sidebar-accent hover:shadow-sm
                          font-medium text-sidebar-foreground/80
                        `}
                      >
                        <div className="flex items-center">
                          <FolderOpen className="h-5 w-5 shrink-0" />
                          {state !== "collapsed" && (
                            <span className="ml-3 text-sm font-semibold tracking-wide">
                              MANAGER
                            </span>
                          )}
                        </div>
                        {state !== "collapsed" && (
                          <ChevronDown 
                            className={`
                              h-4 w-4 transition-all duration-300 text-sidebar-foreground/60
                              ${(isManagerOpen || isAnyManagerItemActive) ? 'rotate-180' : 'rotate-0'}
                            `} 
                          />
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                      <div className="mt-1 ml-2 space-y-1 border-l border-sidebar-border/50 pl-6">
                        {managerItems.map((item) => (
                          <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton 
                              asChild 
                              isActive={isActive(item.url)}
                              size="default"
                              className={`
                                group relative rounded-lg px-3 py-2 transition-all duration-200
                                hover:bg-sidebar-accent hover:shadow-sm
                                data-[active=true]:bg-primary/10 data-[active=true]:text-primary 
                                data-[active=true]:border-l-2 data-[active=true]:border-primary
                                data-[active=true]:shadow-sm font-medium
                              `}
                            >
                              <NavLink to={item.url} end onClick={handleNavClick}>
                                <item.icon className="h-4 w-4 shrink-0" />
                                {state !== "collapsed" && (
                                  <span className="ml-2.5 text-sm truncate">
                                    {managerLabelMap[item.title]}
                                  </span>
                                )}
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Footer - Settings */}
        <SidebarFooter className="border-t border-sidebar-border bg-sidebar/50 p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton 
                asChild 
                isActive={isActive('/settings')}
                size="lg"
                className={`
                  group relative rounded-xl px-3 py-2.5 transition-all duration-200 
                  hover:bg-sidebar-accent hover:shadow-sm
                  data-[active=true]:bg-primary data-[active=true]:text-primary-foreground 
                  data-[active=true]:shadow-lg font-medium
                `}
              >
                <NavLink to="/settings" onClick={handleNavClick}>
                  <Settings className="h-5 w-5 shrink-0" />
                  {state !== "collapsed" && (
                    <span className="ml-3 text-sm font-medium truncate">
                      {t("nav.settings", "Settings")}
                    </span>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </SidebarContent>
    </Sidebar>
  );
}
