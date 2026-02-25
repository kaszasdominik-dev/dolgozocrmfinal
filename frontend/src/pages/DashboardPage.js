import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, FolderKanban, TrendingUp, Calendar, 
  ArrowRight, Plus, BarChart3, Loader2,
  CheckCircle, Clock, Ban, AlertCircle, AlertTriangle,
  FileSpreadsheet, MapPin, Info, ArrowUpDown
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ComposedChart, Line, CartesianGrid, ReferenceLine
} from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Toborzó state
  const [recruiterStats, setRecruiterStats] = useState(null);
  const [recruiterMonthly, setRecruiterMonthly] = useState([]);
  const [recruiterTodos, setRecruiterTodos] = useState(null);
  
  // Admin state
  const [adminStats, setAdminStats] = useState(null);
  const [recruiterPerformance, setRecruiterPerformance] = useState([]);
  const [adminMonthlyTrend, setAdminMonthlyTrend] = useState([]);
  const [adminAlerts, setAdminAlerts] = useState(null);
  const [sortField, setSortField] = useState("monthly_placements");
  const [sortDirection, setSortDirection] = useState("desc");

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (user?.role === "admin") {
        // Admin dashboard data
        const [statsRes, performanceRes, trendRes, alertsRes] = await Promise.all([
          axios.get(`${API}/dashboard/admin-stats`),
          axios.get(`${API}/dashboard/admin-recruiter-performance`),
          axios.get(`${API}/dashboard/admin-monthly-trend`),
          axios.get(`${API}/dashboard/admin-alerts`)
        ]);
        
        setAdminStats(statsRes.data);
        setRecruiterPerformance(performanceRes.data);
        setAdminMonthlyTrend(trendRes.data);
        setAdminAlerts(alertsRes.data);
      } else {
        // Toborzó dashboard data
        const [statsRes, monthlyRes, todosRes] = await Promise.all([
          axios.get(`${API}/dashboard/recruiter-stats`),
          axios.get(`${API}/dashboard/recruiter-monthly-performance`),
          axios.get(`${API}/dashboard/recruiter-todos`)
        ]);
        
        setRecruiterStats(statsRes.data);
        setRecruiterMonthly(monthlyRes.data);
        setRecruiterTodos(todosRes.data);
      }
    } catch (e) {
      console.error("Dashboard error:", e);
      toast.error("Hiba az adatok betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const handleExportMyWorkers = async () => {
    try {
      const response = await axios.get(`${API}/export/workers`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `dolgozok_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Letöltve");
    } catch (e) {
      toast.error("Hiba az exportáláskor");
    }
  };

  const sortRecruiterPerformance = (field) => {
    const newDirection = sortField === field && sortDirection === "desc" ? "asc" : "desc";
    setSortField(field);
    setSortDirection(newDirection);
    
    const sorted = [...recruiterPerformance].sort((a, b) => {
      const valA = a[field];
      const valB = b[field];
      return newDirection === "desc" ? valB - valA : valA - valB;
    });
    
    setRecruiterPerformance(sorted);
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2">
          <p className="text-sm font-medium text-foreground">{payload[0].name}</p>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{payload[0].value}</span> fő
          </p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ==================== TOBORZÓ DASHBOARD ====================
  if (user?.role === "user" && recruiterStats) {
    const statusData = [
      { name: "Feldolgozatlan", value: recruiterStats.status_counts.Feldolgozatlan || 0, color: "#9CA3AF" },
      { name: "Próbára vár", value: recruiterStats.status_counts["Próbára vár"] || 0, color: "#F97316" },
      { name: "Próba megbeszélve", value: recruiterStats.status_counts["Próba megbeszélve"] || 0, color: "#8B5CF6" },
      { name: "Dolgozik", value: recruiterStats.status_counts.Dolgozik || 0, color: "#10B981" },
      { name: "Tiltólista", value: recruiterStats.status_counts.Tiltólista || 0, color: "#EF4444" }
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Üdv, {user?.name || "Toborzó"}! Itt a teljesítményed áttekintése.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/workers/new")} data-testid="quick-add-worker">
              <Plus className="w-4 h-4 mr-2" />
              Új dolgozó
            </Button>
          </div>
        </div>

        {/* KPI Kártyák (7 db) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/workers")} data-testid="stat-total-workers">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dolgozóim</p>
                  <p className="text-2xl font-bold text-foreground">{recruiterStats.total_workers}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/workers?global_status=Feldolgozatlan")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Feldolgozatlan</p>
                  <p className="text-2xl font-bold text-foreground">{recruiterStats.status_counts.Feldolgozatlan || 0}</p>
                </div>
                <div className="w-10 h-10 bg-slate-500/10 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-slate-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/workers?global_status=Próbára vár")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Próbára vár</p>
                  <p className="text-2xl font-bold text-foreground">{recruiterStats.status_counts["Próbára vár"] || 0}</p>
                </div>
                <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/workers?global_status=Próba megbeszélve")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Próba megbeszélve</p>
                  <p className="text-2xl font-bold text-foreground">{recruiterStats.status_counts["Próba megbeszélve"] || 0}</p>
                </div>
                <div className="w-10 h-10 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-green-200 dark:border-green-800" onClick={() => navigate("/workers?global_status=Dolgozik")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Dolgozik</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{recruiterStats.status_counts.Dolgozik || 0}</p>
                </div>
                <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate("/workers?global_status=Tiltólista")}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tiltólista</p>
                  <p className="text-2xl font-bold text-foreground">{recruiterStats.status_counts.Tiltólista || 0}</p>
                </div>
                <div className="w-10 h-10 bg-red-500/10 rounded-full flex items-center justify-center">
                  <Ban className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 cursor-pointer hover:shadow-md transition-shadow border-2 border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Projektek száma</p>
                  <p className="text-3xl font-bold text-primary">{recruiterStats.assigned_projects_count || 0}</p>
                  <p className="text-xs text-muted-foreground mt-1">Hozzám rendelt projektek</p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                  <FolderKanban className="w-6 h-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Grafikonok */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Kördiagram */}
          <Card data-testid="chart-status-distribution">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Dolgozóim státusz szerint
              </CardTitle>
              <CardDescription>5 globális státusz eloszlás</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.some(s => s.value > 0) ? (
                <div className="flex flex-col lg:flex-row items-center gap-4">
                  <div className="w-full lg:w-1/2 h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData.filter(s => s.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {statusData.filter(s => s.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full lg:w-1/2 space-y-2">
                    {statusData.map((stat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stat.color }} />
                          <span className="text-sm text-foreground">{stat.name}</span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">{stat.value}</span>
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

          {/* Oszlopdiagram */}
          <Card data-testid="chart-monthly-performance">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-500" />
                Havi teljesítményem
              </CardTitle>
              <CardDescription>Placements az elmúlt 6 hónapban</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={recruiterMonthly}>
                  <XAxis dataKey="month_name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="placements" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded text-center">
                <p className="text-sm text-muted-foreground">
                  Összesen 6 hónap: 
                  <span className="font-bold text-green-600 ml-2 text-xl">
                    {recruiterMonthly.reduce((sum, m) => sum + m.placements, 0)} placement
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Jó úton vagy! 🎉</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teendők */}
        {recruiterTodos && (
          <Card data-testid="todos-panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Teendők</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recruiterTodos.unprocessed_leads > 0 && (
                  <div 
                    className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => navigate("/projects")}
                  >
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-500">{recruiterTodos.unprocessed_leads}</Badge>
                      <span className="text-sm">Új űrlap jelentkezés</span>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}

                {recruiterTodos.upcoming_trials && recruiterTodos.upcoming_trials.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Közelgő próbák (7 napon belül):</p>
                    {recruiterTodos.upcoming_trials.slice(0, 3).map(trial => (
                      <div 
                        key={trial.id}
                        className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors"
                        onClick={() => navigate(`/projects/${trial.project_id}`)}
                      >
                        <div>
                          <p className="text-sm font-medium">{trial.notes || "Próba"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(trial.date).toLocaleDateString('hu-HU')} {trial.time && `- ${trial.time}`}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    ))}
                  </div>
                )}

                {recruiterTodos.stale_workers_60plus > 0 && (
                  <div 
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => navigate("/workers?global_status=Feldolgozatlan")}
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium">{recruiterTodos.stale_workers_60plus} dolgozó</p>
                        <p className="text-xs text-muted-foreground">60+ napja feldolgozatlan (opcionális átnézés)</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}

                {recruiterTodos.unprocessed_leads === 0 && 
                 (!recruiterTodos.upcoming_trials || recruiterTodos.upcoming_trials.length === 0) &&
                 recruiterTodos.stale_workers_60plus === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>Minden teendő kész! 🎉</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gyors gombok */}
        <Card data-testid="quick-actions">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Gyors műveletek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/workers/new")}
              >
                <Plus className="w-5 h-5 text-primary" />
                <span>Új dolgozó</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/projects")}
              >
                <FolderKanban className="w-5 h-5 text-green-500" />
                <span>Projektjeim</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={handleExportMyWorkers}
              >
                <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                <span>Export</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ==================== ADMIN DASHBOARD ====================
  if (user?.role === "admin" && adminStats) {
    const adminStatusData = [
      { name: "Feldolgozatlan", value: adminStats.status_counts.Feldolgozatlan || 0, color: "#9CA3AF" },
      { name: "Próbára vár", value: adminStats.status_counts["Próbára vár"] || 0, color: "#F97316" },
      { name: "Próba megbeszélve", value: adminStats.status_counts["Próba megbeszélve"] || 0, color: "#8B5CF6" },
      { name: "Dolgozik", value: adminStats.status_counts.Dolgozik || 0, color: "#10B981" },
      { name: "Tiltólista", value: adminStats.status_counts.Tiltólista || 0, color: "#EF4444" }
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Teljes cég áttekintés és toborzói teljesítmény</p>
        </div>

        {/* KPI Kártyák (6 db) */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate("/workers")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Összes dolgozó</p>
              <p className="text-3xl font-bold text-foreground">{adminStats.total_workers}</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate("/workers?global_status=Feldolgozatlan")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Feldolgozatlan</p>
              <p className="text-2xl font-bold" style={{ color: "#9CA3AF" }}>
                {adminStats.status_counts.Feldolgozatlan || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate("/workers?global_status=Próbára vár")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Próbára vár</p>
              <p className="text-2xl font-bold" style={{ color: "#F97316" }}>
                {adminStats.status_counts["Próbára vár"] || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate("/workers?global_status=Próba megbeszélve")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Próba megbeszélve</p>
              <p className="text-2xl font-bold" style={{ color: "#8B5CF6" }}>
                {adminStats.status_counts["Próba megbeszélve"] || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md border-green-200" onClick={() => navigate("/workers?global_status=Dolgozik")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Dolgozik</p>
              <p className="text-3xl font-bold text-green-600">
                {adminStats.status_counts.Dolgozik || 0}
              </p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md" onClick={() => navigate("/workers?global_status=Tiltólista")}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Tiltólista</p>
              <p className="text-2xl font-bold" style={{ color: "#EF4444" }}>
                {adminStats.status_counts.Tiltólista || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Kördiagram + Toborzónkénti tábla */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Kördiagram */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Teljes cég státusz eloszlás</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={adminStatusData.filter(s => s.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {adminStatusData.filter(s => s.value > 0).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {adminStatusData.map((stat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stat.color }} />
                      <span>{stat.name}</span>
                    </div>
                    <span className="font-semibold">{stat.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Toborzónkénti tábla */}
          <Card className="col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Toborzónkénti teljesítmény</CardTitle>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" size="sm" onClick={() => sortRecruiterPerformance("monthly_placements")}>
                  📈 Placements
                </Button>
                <Button variant="outline" size="sm" onClick={() => sortRecruiterPerformance("avg_conversion_days")}>
                  ⚡ Átfutás
                </Button>
                <Button variant="outline" size="sm" onClick={() => sortRecruiterPerformance("feldolgozatlan")}>
                  📋 Feldolgozatlan
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-background">Toborzó</TableHead>
                      <TableHead className="sticky top-0 bg-background text-center">Összes</TableHead>
                      <TableHead className="sticky top-0 bg-background text-center">Havi pl.</TableHead>
                      <TableHead className="sticky top-0 bg-background text-center">Átfutás</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recruiterPerformance.slice(0, 10).map(r => (
                      <TableRow key={r.recruiter_id}>
                        <TableCell>
                          <Link to={`/workers?owner_id=${r.recruiter_id}`} className="hover:text-primary font-medium text-sm">
                            {r.recruiter_name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-center font-semibold">{r.total_workers}</TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-600">{r.monthly_placements}</Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm">{r.avg_conversion_days} nap</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Havi trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Havi teljesítmény trend (6 hónap)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={adminMonthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month_name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="added_workers" fill="#3B82F6" name="Felvitt dolgozók" />
                <Line yAxisId="right" type="monotone" dataKey="placements" stroke="#10B981" strokeWidth={3} name="Placements" />
                <ReferenceLine yAxisId="right" y={150} stroke="#EF4444" strokeDasharray="5 5" label="Cél: 150" />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="text-sm text-muted-foreground">Összes felvitt (6 hónap)</p>
                <p className="text-2xl font-bold text-blue-600">
                  {adminMonthlyTrend.reduce((sum, m) => sum + m.added_workers, 0)} fő
                </p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded">
                <p className="text-sm text-muted-foreground">Összes placement (6 hónap)</p>
                <p className="text-2xl font-bold text-green-600">
                  {adminMonthlyTrend.reduce((sum, m) => sum + m.placements, 0)} fő
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Figyelmeztetések */}
        {adminAlerts && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Figyelmeztetések</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {adminAlerts.stale_workers_90plus > 0 && (
                  <div 
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => navigate("/workers?global_status=Feldolgozatlan")}
                  >
                    <div className="flex items-center gap-2">
                      <Info className="w-5 h-5 text-slate-500" />
                      <div>
                        <p className="text-sm font-medium">{adminAlerts.stale_workers_90plus} dolgozó</p>
                        <p className="text-xs text-muted-foreground">90+ napja feldolgozatlan</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}

                {adminAlerts.stale_trials > 0 && (
                  <div 
                    className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg cursor-pointer"
                    onClick={() => navigate("/workers?global_status=Próba megbeszélve")}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">{adminAlerts.stale_trials} dolgozó</p>
                        <p className="text-xs text-muted-foreground">Próba megbeszélve, 48+ órája nincs frissítés</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}

                {adminAlerts.new_blacklist > 0 && (
                  <div 
                    className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg cursor-pointer"
                    onClick={() => navigate("/workers?global_status=Tiltólista")}
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                      <div>
                        <p className="text-sm font-medium">{adminAlerts.new_blacklist} dolgozó</p>
                        <p className="text-xs text-muted-foreground">Tiltólistára került az elmúlt héten</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}

                {adminAlerts.top_feldolgozatlan && adminAlerts.top_feldolgozatlan.count > 50 && (
                  <div 
                    className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg cursor-pointer"
                    onClick={() => navigate(`/workers?owner_id=${adminAlerts.top_feldolgozatlan.recruiter_id}`)}
                  >
                    <p className="text-sm font-medium">Legtöbb feldolgozatlan:</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-bold">{adminAlerts.top_feldolgozatlan.name}</span> - {adminAlerts.top_feldolgozatlan.count} fő
                    </p>
                  </div>
                )}

                {adminAlerts.stale_workers_90plus === 0 && 
                 adminAlerts.stale_trials === 0 && 
                 adminAlerts.new_blacklist === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                    <p>Minden rendben! 🎉</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gyors műveletek */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Gyors műveletek</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/projects/new")}
              >
                <Plus className="w-5 h-5 text-primary" />
                <span>Új projekt</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={handleExportMyWorkers}
              >
                <FileSpreadsheet className="w-5 h-5 text-green-500" />
                <span>Összes export</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/admin")}
              >
                <Users className="w-5 h-5 text-purple-500" />
                <span>Toborzók</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate("/workers")}
              >
                <BarChart3 className="w-5 h-5 text-orange-500" />
                <span>Dolgozók</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
