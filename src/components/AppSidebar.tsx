import { Home, BarChart3, Users, Car, Truck, CreditCard, AlertCircle, ChevronDown, FolderOpen } from "lucide-react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Profit & Loss", url: "/profit-loss", icon: BarChart3 },
];

const managerItems = [
  { title: "Vehicle Manager", url: "/vehicle-manager", icon: Truck },
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
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";
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
    "PayTap Dashboard": "PayTap Dashboard",
    "Challans Dashboard": "Challans Dashboard",
    "Vehicle Operators": t("nav.manageOperators"),
    "Trip Manager": t("nav.tripManager"),
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50 glass-effect">
      <SidebarContent className="py-6">
        {/* Main Navigation Items */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider px-4 mb-4">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-3">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={isActive(item.url)}
                    size="lg"
                    className="rounded-xl hover:bg-secondary/80 active:scale-95 transition-all duration-200 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground apple-shadow-sm"
                  >
                    <NavLink to={item.url} end className={getNavCls} onClick={handleNavClick}>
                      <item.icon className="h-5 w-5" />
                      {state !== "collapsed" && <span className="font-medium">{mainLabelMap[item.title]}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Manager Section */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-3">
              <SidebarMenuItem>
                <Collapsible 
                  open={isManagerOpen || isAnyManagerItemActive} 
                  onOpenChange={setIsManagerOpen}
                  className="w-full"
                >
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton 
                      size="lg"
                      className="rounded-xl hover:bg-secondary/80 active:scale-95 transition-all duration-200 w-full justify-between"
                    >
                      <div className="flex items-center">
                        <FolderOpen className="h-5 w-5" />
                        {state !== "collapsed" && <span className="font-medium">MANAGER</span>}
                      </div>
                      {state !== "collapsed" && (
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isManagerOpen || isAnyManagerItemActive ? 'rotate-180' : ''}`} />
                      )}
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 mt-1">
                    <div className="pl-6 space-y-1">
                      {managerItems.map((item) => (
                        <SidebarMenuItem key={item.title}>
                          <SidebarMenuButton 
                            asChild 
                            isActive={isActive(item.url)}
                            size="lg"
                            className="rounded-xl hover:bg-secondary/80 active:scale-95 transition-all duration-200 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground apple-shadow-sm"
                          >
                            <NavLink to={item.url} end className={getNavCls} onClick={handleNavClick}>
                              <item.icon className="h-4 w-4" />
                              {state !== "collapsed" && <span className="font-medium text-sm">{managerLabelMap[item.title]}</span>}
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
      </SidebarContent>
    </Sidebar>
  );
}
