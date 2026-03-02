import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth, API } from "@/App";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  ChevronLeft,
  Moon,
  Sun,
  FileSpreadsheet,
  LayoutDashboard,
  Calendar,
  Bell,
  PanelLeftClose,
  PanelLeft,
  BookOpen,
  Mail
} from "lucide-react";

// Sidebar collapse state persistence
const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === "true";
  }); // Desktop collapse
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    
    // Hallgatjuk az értesítés frissítés event-et
    const handleNotificationsUpdate = () => {
      fetchUnreadCount();
    };
    window.addEventListener('notificationsUpdated', handleNotificationsUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdate);
    };
  }, []);

  // Save collapse state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed.toString());
  }, [sidebarCollapsed]);

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

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { to: "/calendar", icon: Calendar, label: "Naptár" },
    { to: "/workers", icon: Users, label: "Dolgozók" },
    { to: "/projects", icon: FolderKanban, label: "Projektek" },
    { to: "/bulk-email", icon: Mail, label: "Bulk Email" },
    { to: "/guide", icon: BookOpen, label: "Súgó" },
    { to: "/settings", icon: Settings, label: "Beállítások" },
  ];

  if (user?.role === "admin") {
    navItems.push({ to: "/admin", icon: Shield, label: "Admin" });
  }

  // Nav item component with tooltip when collapsed
  const NavItem = ({ item, onClick }) => {
    const content = (
      <NavLink
        to={item.to}
        end={item.exact}
        onClick={onClick}
        className={({ isActive }) => `
          sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
          ${sidebarCollapsed ? 'justify-center' : ''}
          ${isActive 
            ? 'bg-primary/10 text-primary' 
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }
        `}
        data-testid={`nav-${item.label.toLowerCase()}`}
      >
        <item.icon className="w-5 h-5 flex-shrink-0" />
        {!sidebarCollapsed && (
          <>
            <span className="truncate">{item.label}</span>
            <ChevronRight className="w-4 h-4 ml-auto opacity-50 flex-shrink-0" />
          </>
        )}
      </NavLink>
    );

    if (sidebarCollapsed) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            {content}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background flex">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - always visible on md+ (768px), toggleable on smaller */}
        <aside className={`
          fixed md:static left-0 top-0 z-50
          ${sidebarCollapsed ? 'md:w-[70px]' : 'md:w-64'} w-64
          h-screen bg-card border-r border-border overflow-hidden
          transform transition-all duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <div className="flex flex-col h-full">
            {/* Logo & Collapse button */}
            <div className="h-16 flex items-center justify-between px-3 border-b border-border">
              {!sidebarCollapsed ? (
                <>
                  <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg text-foreground">Dolgozó CRM</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      className="hidden md:flex p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                      onClick={toggleSidebarCollapse}
                      title="Panel behúzása"
                    >
                      <PanelLeftClose className="w-5 h-5" />
                    </button>
                    <button 
                      className="md:hidden p-1 hover:bg-muted rounded"
                      onClick={() => setSidebarOpen(false)}
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="w-full flex flex-col items-center gap-2">
                  <div 
                    className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md cursor-pointer"
                    onClick={() => navigate("/")}
                  >
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <button 
                    className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    onClick={toggleSidebarCollapse}
                    title="Panel kinyitása"
                  >
                    <PanelLeft className="w-5 h-5" />
                  </button>
                </div>
              )}
            </div>

            {/* Navigation */}
            <ScrollArea className="flex-1 min-h-0 py-4">
              <nav className={`${sidebarCollapsed ? 'px-2' : 'px-3'} space-y-1`}>
                {navItems.map((item) => (
                  <NavItem key={item.to} item={item} onClick={() => setSidebarOpen(false)} />
                ))}
                
                {/* Notifications link with badge */}
                {sidebarCollapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/notifications"
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) => `
                          sidebar-link flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium
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
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      Értesítések {unreadCount > 0 && `(${unreadCount})`}
                    </TooltipContent>
                  </Tooltip>
                ) : (
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
                )}
                
                {/* Import link */}
                {sidebarCollapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <NavLink
                        to="/workers/import"
                        onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) => `
                          sidebar-link flex items-center justify-center px-3 py-2.5 rounded-lg text-sm font-medium
                          ${isActive 
                            ? 'bg-primary/10 text-primary' 
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }
                        `}
                        data-testid="nav-import"
                      >
                        <FileSpreadsheet className="w-5 h-5" />
                      </NavLink>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      Excel/CV Import
                    </TooltipContent>
                  </Tooltip>
                ) : (
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
                    Excel/CV Import
                    <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
                  </NavLink>
                )}
              </nav>
            </ScrollArea>

            {/* Theme toggle & User section */}
            <div className={`flex-shrink-0 p-3 border-t border-border space-y-3 ${sidebarCollapsed ? 'items-center' : ''}`}>
              {/* Theme toggle */}
              {sidebarCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button 
                      className="w-full flex items-center justify-center p-2 hover:bg-muted rounded-lg text-muted-foreground"
                      onClick={toggleTheme}
                    >
                      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {theme === "dark" ? "Világos mód" : "Sötét mód"}
                  </TooltipContent>
                </Tooltip>
              ) : (
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
              )}
              
              {/* User info */}
              {sidebarCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-full flex justify-center">
                      <div className="w-10 h-10 bg-gradient-to-br from-muted to-muted-foreground/30 rounded-full flex items-center justify-center cursor-default">
                        <span className="text-sm font-semibold text-muted-foreground">
                          {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="text-sm">
                      <p className="font-medium">{user?.name || user?.email}</p>
                      <p className="text-muted-foreground text-xs">
                        {user?.role === "admin" ? "Adminisztrátor" : "Toborzó"}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-3 mb-2">
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
              )}
              
              {/* Logout button */}
              {sidebarCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      className="w-full text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10"
                      onClick={handleLogout}
                      data-testid="logout-btn"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Kijelentkezés
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/50 hover:bg-destructive/10"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                  Kijelentkezés
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col min-h-screen">
          {/* Header - always visible on mobile (below md breakpoint), contains toggle */}
          <header className="md:hidden h-14 bg-card border-b border-border flex items-center justify-between px-3 sticky top-0 z-30">
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
              
              <button 
                className="p-1.5 hover:bg-muted rounded-lg"
                onClick={toggleTheme}
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </header>

          {/* Page content */}
          <div className="flex-1 p-4 md:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
