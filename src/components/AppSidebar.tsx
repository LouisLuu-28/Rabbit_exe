import { Home, ShoppingCart, CalendarDays, Package, DollarSign, User, LogOut, PanelLeftClose, PanelLeft } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import rabbitLogo from "@/assets/rabbit-logo.jpg";
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
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";

const menuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Đơn Hàng", url: "/orders", icon: ShoppingCart },
  { title: "Thực Đơn Tuần", url: "/menu-planning", icon: CalendarDays },
  { title: "Kho Nguyên Liệu", url: "/inventory", icon: Package },
  { title: "Tài Chính", url: "/financial", icon: DollarSign },
  { title: "Tài Khoản", url: "/account", icon: User },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const collapsed = state === "collapsed";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Lỗi",
        description: "Không thể đăng xuất. Vui lòng thử lại.",
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader>
        {!collapsed ? (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src={rabbitLogo} alt="Rabbit Logo" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h2 className="font-bold text-lg">Rabbit EMS</h2>
                  <p className="text-xs text-muted-foreground">System</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleSidebar}
                className="h-8 w-8 shrink-0"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Quản lý doanh nghiệp</p>
          </div>
        ) : (
          <div className="py-4 flex flex-col items-center gap-2">
            <img src={rabbitLogo} alt="Rabbit Logo" className="w-8 h-8 rounded-full object-cover" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar}
              className="h-6 w-6"
            >
              <PanelLeft className="h-3 w-3" />
            </Button>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>

        <SidebarGroup>
          <SidebarGroupLabel>Menu Chính</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const getTutorialAttr = () => {
                  if (item.url === "/dashboard") return "dashboard-nav";
                  if (item.url === "/orders") return "orders-nav";
                  if (item.url === "/menu-planning") return "menu-nav";
                  if (item.url === "/inventory") return "inventory-nav";
                  if (item.url === "/financial") return "financial-nav";
                  if (item.url === "/account") return "account-nav";
                  return undefined;
                };

                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        data-tutorial={getTutorialAttr()}
                        className={({ isActive }) =>
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50"
                        }
                      >
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="h-5 w-5" />
              {!collapsed && <span>Đăng Xuất</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
