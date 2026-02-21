import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth, API } from "@/App";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import axios from "axios";
import {
  Users,
  FolderKanban,
  Settings,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Moon,
  Sun,
  FileSpreadsheet,
  LayoutDashboard,
  Calendar,
  Bell
} from "lucide-react";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await axios.get(`${API}/notifications/unread-count`);
      setUnreadCount(res.data.count);
    } catch (e) {
      console.error("Error fetching notification count");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { to: "/calendar", icon: Calendar, label: "Naptár" },
    { to: "/workers", icon: Users, label: "Dolgozók" },
    { to: "/projects", icon: FolderKanban, label: "Projektek" },
    { to: "/settings", icon: Settings, label: "Beállítások" },
  ];

  if (user?.role === "admin") {
    navItems.push({ to: "/admin", icon: Shield, label: "Admin" });
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static left-0 top-0 z-50
        w-64 h-screen bg-card border-r border-border overflow-hidden
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-foreground">Dolgozó CRM</span>
            </div>
            <button 
              className="lg:hidden p-1 hover:bg-muted rounded"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <ScrollArea className="flex-1 min-h-0 py-4">
            <nav className="px-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) => `
                    sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    ${isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                </NavLink>
              ))}
              
              {/* Notifications link with badge */}
              <NavLink
                to="/notifications"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  ${isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
                data-testid="nav-notifications"
              >
                <div className="relative">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                Értesítések
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </NavLink>
              
              {/* Import link */}
              <NavLink
                to="/workers/import"
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => `
                  sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  ${isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
                data-testid="nav-import"
              >
                <FileSpreadsheet className="w-5 h-5" />
                Excel Import
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </NavLink>
            </nav>
          </ScrollArea>

          {/* Theme toggle & User section */}
          <div className="flex-shrink-0 p-4 border-t border-border space-y-4">
            {/* Theme toggle */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                {theme === "dark" ? (
                  <Moon className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Sun className="w-4 h-4 text-muted-foreground" />
                )}
                <Label className="text-sm text-muted-foreground cursor-pointer" onClick={toggleTheme}>
                  {theme === "dark" ? "Sötét mód" : "Világos mód"}
                </Label>
              </div>
              <Switch 
                checked={theme === "dark"} 
                onCheckedChange={toggleTheme}
                data-testid="theme-toggle"
              />
            </div>
            
            {/* User info */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-muted to-muted-foreground/30 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-muted-foreground">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name || user?.email}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.role === "admin" ? "Adminisztrátor" : "Toborzó"}
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
              Kijelentkezés
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Mobile header */}
        <header className="lg:hidden h-14 bg-card border-b border-border flex items-center justify-between px-3 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <button 
              className="p-1.5 hover:bg-muted rounded-lg"
              onClick={() => setSidebarOpen(true)}
              data-testid="mobile-menu-btn"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-bold text-sm text-foreground">Dolgozó CRM</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* User name on mobile */}
            <div className="flex items-center gap-1.5">
              <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-primary">
                  {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <span className="text-xs font-medium text-foreground max-w-[80px] truncate">
                {user?.name || user?.email?.split('@')[0]}
              </span>
            </div>
            
            {/* Theme toggle */}
            <button 
              className="p-1.5 hover:bg-muted rounded-lg"
              onClick={toggleTheme}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
