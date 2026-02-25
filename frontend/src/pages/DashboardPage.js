import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, FolderKanban, TrendingUp, Calendar, 
  ArrowRight, Plus, BarChart3, Activity, Loader2,
  CheckCircle, Clock, XCircle, Briefcase
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [projectStats, setProjectStats] = useState({ active: 0, closed: 0, total: 0 });
  const [workerStats, setWorkerStats] = useState({ total: 0, byStatus: [] });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [projectsRes, workersRes, statusesRes] = await Promise.all([
        axios.get(`${API}/projects`),
        axios.get(`${API}/workers`),
        axios.get(`${API}/statuses`)
      ]);
      
      const projects = projectsRes.data;
      setProjectStats({
        active: projects.filter(p => !p.is_closed).length,
        closed: projects.filter(p => p.is_closed).length,
        total: projects.length
      });
      
      // Calculate worker stats by global_status
      const workers = workersRes.data;
      const statusCounts = {};
      workers.forEach(w => {
        const status = w.global_status || "Feldolgozatlan";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      const statusColors = {
        "Feldolgozatlan": "#9CA3AF",
        "Próbára vár": "#F97316",
        "Próba megbeszélve": "#8B5CF6",
        "Dolgozik": "#10B981",
        "Tiltólista": "#EF4444"
      };
      
      const byStatus = Object.entries(statusCounts).map(([name, count]) => ({
        name,
        count,
        color: statusColors[name] || "#9CA3AF"
      }));
      
      setWorkerStats({ total: workers.length, byStatus });
      setStats({ total_workers: workers.length });
    } catch (e) {
      toast.error("Hiba az adatok betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2">
          <p className="text-sm font-medium text-foreground">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{payload[0].value}</span> dolgozó
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Üdv, {user?.name || "Admin"}! Itt a CRM áttekintése.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/workers/new")} data-testid="quick-add-worker">
            <Plus className="w-4 h-4 mr-2" />
            Új dolgozó
          </Button>
          {user?.role === "admin" && (
            <Button onClick={() => navigate("/projects/new")} className="bg-primary" data-testid="quick-add-project">
              <Plus className="w-4 h-4 mr-2" />
              Új projekt
            </Button>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/workers")} data-testid="stat-total-workers">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Összes dolgozó</p>
                <p className="text-2xl font-bold text-foreground">{workerStats.total || 0}</p>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/projects")} data-testid="stat-active-projects">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Aktív projektek</p>
                <p className="text-2xl font-bold text-foreground">{projectStats.active}</p>
              </div>
              <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                <FolderKanban className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/workers?global_status=Dolgozik")} data-testid="stat-working">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Dolgozik</p>
                <p className="text-2xl font-bold text-foreground">
                  {workerStats.byStatus?.find(s => s.name === "Dolgozik")?.count || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/workers?global_status=Feldolgozatlan")} data-testid="stat-pending">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Feldolgozatlan</p>
                <p className="text-2xl font-bold text-foreground">
                  {workerStats.byStatus?.find(s => s.name === "Feldolgozatlan")?.count || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-slate-500/10 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie Chart - Status Distribution */}
        <Card data-testid="chart-status-distribution">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Dolgozók státusz szerint
            </CardTitle>
            <CardDescription>Globális státusz eloszlás</CardDescription>
          </CardHeader>
          <CardContent>
            {workerStats.byStatus && workerStats.byStatus.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <div className="w-full lg:w-1/2 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={workerStats.byStatus.filter(c => c.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="name"
                      >
                        {workerStats.byStatus.filter(c => c.count > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full lg:w-1/2 space-y-2">
                  {workerStats.byStatus.map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-sm text-foreground truncate">
                          {stat.name === "Feldolgozatlan" && "⚪ "}
                          {stat.name === "Próbára vár" && "🟠 "}
                          {stat.name === "Próba megbeszélve" && "🟣 "}
                          {stat.name === "Dolgozik" && "🟢 "}
                          {stat.name === "Tiltólista" && "🔴 "}
                          {stat.name}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{stat.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                Nincsenek dolgozók
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Project Stats */}
        <Card data-testid="chart-project-stats">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Projekt statisztika
            </CardTitle>
            <CardDescription>Aktív és lezárt projektek</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] flex flex-col justify-center">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FolderKanban className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Aktív projektek</p>
                      <p className="text-2xl font-bold text-foreground">{projectStats.active}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-500/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-8 h-8 text-gray-500" />
                    <div>
                      <p className="text-sm text-muted-foreground">Lezárt projektek</p>
                      <p className="text-2xl font-bold text-foreground">{projectStats.closed}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Összes projekt</p>
                      <p className="text-2xl font-bold text-foreground">{projectStats.total}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card data-testid="quick-actions">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Gyors műveletek</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2 hover:bg-primary/5 hover:border-primary/50"
              onClick={() => navigate("/workers")}
              data-testid="action-view-workers"
            >
              <Users className="w-5 h-5 text-primary" />
              <span>Dolgozók</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2 hover:bg-green-500/5 hover:border-green-500/50"
              onClick={() => navigate("/projects")}
              data-testid="action-view-projects"
            >
              <FolderKanban className="w-5 h-5 text-green-500" />
              <span>Projektek</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex-col gap-2 hover:bg-purple-500/5 hover:border-purple-500/50"
              onClick={() => navigate("/workers/import")}
              data-testid="action-import"
            >
              <TrendingUp className="w-5 h-5 text-purple-500" />
              <span>Importálás</span>
            </Button>
            {user?.role === "admin" && (
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2 hover:bg-orange-500/5 hover:border-orange-500/50"
                onClick={() => navigate("/settings")}
                data-testid="action-settings"
              >
                <BarChart3 className="w-5 h-5 text-orange-500" />
                <span>Beállítások</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
