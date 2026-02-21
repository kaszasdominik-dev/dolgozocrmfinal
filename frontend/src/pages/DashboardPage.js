import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Users, FolderKanban, TrendingUp, Calendar, 
  ArrowRight, Plus, BarChart3, Activity, Loader2
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

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [categoryStatsRes, projectsRes] = await Promise.all([
        axios.get(`${API}/categories/stats`),
        axios.get(`${API}/projects`)
      ]);
      
      setStats(categoryStatsRes.data);
      
      const projects = projectsRes.data;
      setProjectStats({
        active: projects.filter(p => !p.is_closed).length,
        closed: projects.filter(p => p.is_closed).length,
        total: projects.length
      });
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
                <p className="text-2xl font-bold text-foreground">{stats?.total_workers || 0}</p>
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

        <Card className="hover:shadow-md transition-shadow" data-testid="stat-categories">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kategóriák</p>
                <p className="text-2xl font-bold text-foreground">{stats?.categories_count || 0}</p>
              </div>
              <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow" data-testid="stat-recent">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Utolsó 7 nap</p>
                <p className="text-2xl font-bold text-foreground">
                  {stats?.recent_activity?.reduce((sum, r) => sum + r.count, 0) || 0}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                <Activity className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Pie Chart - Category Distribution */}
        <Card data-testid="chart-category-distribution">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Dolgozók kategória szerint
            </CardTitle>
            <CardDescription>Eloszlás az összes kategóriában</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.category_stats && stats.category_stats.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <div className="w-full lg:w-1/2 h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.category_stats.filter(c => c.count > 0)}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="count"
                        nameKey="name"
                      >
                        {stats.category_stats.filter(c => c.count > 0).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full lg:w-1/2 space-y-2">
                  {stats.category_stats.map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-sm text-foreground truncate">{cat.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground">{cat.count}</span>
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

        {/* Bar Chart - Recent Activity */}
        <Card data-testid="chart-recent-activity">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Elmúlt 7 nap aktivitás
            </CardTitle>
            <CardDescription>Új dolgozók kategóriánként</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recent_activity && stats.recent_activity.some(r => r.count > 0) ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={stats.recent_activity.filter(r => r.count > 0)} 
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis type="number" />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      width={100}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stats.recent_activity.filter(r => r.count > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[250px] text-muted-foreground">
                <Calendar className="w-12 h-12 mb-2 opacity-50" />
                <p>Nincs aktivitás az elmúlt 7 napban</p>
              </div>
            )}
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
