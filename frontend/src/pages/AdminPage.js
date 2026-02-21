import { useState, useEffect } from "react";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Briefcase,
  BarChart3,
  Tag,
  Users,
  Plus,
  Trash2,
  Shield,
  User,
  ChevronRight,
  Cloud,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";

export default function AdminPage() {
  const [workerTypes, setWorkerTypes] = useState([]);
  const [positions, setPositions] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [tags, setTags] = useState([]);
  const [users, setUsers] = useState([]);
  const [userStats, setUserStats] = useState([]);
  
  const [newType, setNewType] = useState("");
  const [newPosition, setNewPosition] = useState({ name: "", worker_type_id: "" });
  const [newStatus, setNewStatus] = useState("");
  const [newTag, setNewTag] = useState({ name: "", color: "#6366f1" });
  const [newUser, setNewUser] = useState({ email: "", password: "", role: "user" });
  
  const [loading, setLoading] = useState(true);
  const [ftpStatus, setFtpStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchAllData();
    fetchFtpStatus();
  }, []);

  const fetchFtpStatus = async () => {
    try {
      const res = await axios.get(`${API}/sync/status`);
      setFtpStatus(res.data);
    } catch (e) {
      console.error("FTP status error:", e);
    }
  };

  const handleFtpSync = async () => {
    setSyncing(true);
    try {
      const res = await axios.post(`${API}/sync/ftp`);
      if (res.data.status === "success") {
        toast.success(`Szinkronizálva: ${res.data.synced_files?.length || 0} fájl`);
      } else {
        toast.error(res.data.message || "Hiba a szinkronizálás során");
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a szinkronizálás során");
    } finally {
      setSyncing(false);
    }
  };

  const fetchAllData = async () => {
    try {
      const [typesRes, positionsRes, statusesRes, tagsRes, usersRes, statsRes] = await Promise.all([
        axios.get(`${API}/worker-types`),
        axios.get(`${API}/positions`),
        axios.get(`${API}/statuses`),
        axios.get(`${API}/tags`),
        axios.get(`${API}/users`),
        axios.get(`${API}/users/stats`)
      ]);
      setWorkerTypes(typesRes.data);
      setPositions(positionsRes.data);
      setStatuses(statusesRes.data);
      setTags(tagsRes.data);
      setUsers(usersRes.data);
      setUserStats(statsRes.data);
    } catch (e) {
      toast.error("Hiba az adatok betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  // Worker Types
  const handleAddType = async () => {
    if (!newType.trim()) return;
    try {
      await axios.post(`${API}/worker-types`, { name: newType });
      toast.success("Típus létrehozva");
      setNewType("");
      fetchAllData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  const handleDeleteType = async (id) => {
    if (!window.confirm("Biztosan törlöd? A típushoz tartozó pozíciók is törlődnek!")) return;
    try {
      await axios.delete(`${API}/worker-types/${id}`);
      toast.success("Típus törölve");
      fetchAllData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  // Positions
  const handleAddPosition = async () => {
    if (!newPosition.name.trim() || !newPosition.worker_type_id) {
      toast.error("Add meg a pozíció nevét és válassz típust");
      return;
    }
    try {
      await axios.post(`${API}/positions`, newPosition);
      toast.success("Pozíció létrehozva");
      setNewPosition({ name: "", worker_type_id: "" });
      fetchAllData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  const handleDeletePosition = async (id) => {
    if (!window.confirm("Biztosan törlöd?")) return;
    try {
      await axios.delete(`${API}/positions/${id}`);
      toast.success("Pozíció törölve");
      fetchAllData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  // Statuses
  const handleAddStatus = async () => {
    if (!newStatus.trim()) return;
    try {
      await axios.post(`${API}/statuses`, { name: newStatus });
      toast.success("Státusz létrehozva");
      setNewStatus("");
      fetchAllData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  const handleDeleteStatus = async (id) => {
    if (!window.confirm("Biztosan törlöd?")) return;
    try {
      await axios.delete(`${API}/statuses/${id}`);
      toast.success("Státusz törölve");
      fetchAllData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  // Tags
  const handleAddTag = async () => {
    if (!newTag.name.trim()) return;
    try {
      await axios.post(`${API}/tags`, newTag);
      toast.success("Jellemző létrehozva");
      setNewTag({ name: "", color: "#6366f1" });
      fetchAllData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  const handleDeleteTag = async (id) => {
    if (!window.confirm("Biztosan törlöd?")) return;
    try {
      await axios.delete(`${API}/tags/${id}`);
      toast.success("Jellemző törölve");
      fetchAllData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  // Users
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password) {
      toast.error("Email és jelszó kötelező");
      return;
    }
    if (newUser.password.length < 8) {
      toast.error("A jelszó minimum 8 karakter legyen");
      return;
    }
    try {
      await axios.post(`${API}/auth/register`, newUser);
      toast.success(`Felhasználó létrehozva: ${newUser.email}`);
      setNewUser({ email: "", password: "", role: "user" });
      fetchAllData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba történt");
    }
  };

  // Group positions by type
  const positionsByType = workerTypes.map(type => ({
    ...type,
    positions: positions.filter(p => p.worker_type_id === type.id)
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-0">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 sm:w-8 h-6 sm:h-8 text-primary" />
          Admin Panel
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Rendszer beállítások kezelése</p>
      </div>

      {/* FTP Sync Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Automatikus Backup (FTP)
          </CardTitle>
          <CardDescription>
            Dolgozók automatikus mentése tárhely.eu-ra toborzónként
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              {ftpStatus?.ftp_configured ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">FTP konfigurálva</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">FTP nincs konfigurálva</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Host: {ftpStatus?.ftp_host || "N/A"} | Mappa: {ftpStatus?.ftp_folder || "N/A"}
              </p>
            </div>
            <Button 
              onClick={handleFtpSync} 
              disabled={syncing || !ftpStatus?.ftp_configured}
              className="bg-primary"
              data-testid="ftp-sync-btn"
            >
              {syncing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Szinkronizálás...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Szinkronizálás most
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            A rendszer naponta egyszer automatikusan feltölti a dolgozókat Excel fájlokba toborzónként.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="types" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="types" className="text-xs sm:text-sm py-2" data-testid="admin-types-tab">
            <Briefcase className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Típusok</span>
          </TabsTrigger>
          <TabsTrigger value="statuses" className="text-xs sm:text-sm py-2" data-testid="admin-statuses-tab">
            <BarChart3 className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Státuszok</span>
          </TabsTrigger>
          <TabsTrigger value="tags" className="text-xs sm:text-sm py-2" data-testid="admin-tags-tab">
            <Tag className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Jellemzők</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm py-2" data-testid="admin-users-tab">
            <Users className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Felhasználók</span>
          </TabsTrigger>
        </TabsList>

        {/* Worker Types & Positions */}
        <TabsContent value="types" className="mt-6 space-y-6">
          {/* Add Type */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Új típus hozzáadása</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  placeholder="Típus neve (pl. Szakmunkás)"
                  className="flex-1"
                  data-testid="new-type-input"
                />
                <Button onClick={handleAddType} className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-type-btn">
                  <Plus className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Hozzáad</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Add Position */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Új pozíció hozzáadása</CardTitle>
              <CardDescription>Konkrét munkakör egy típushoz (pl. Szakmunkás → Hegesztő)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select 
                  value={newPosition.worker_type_id} 
                  onValueChange={(v) => setNewPosition({...newPosition, worker_type_id: v})}
                >
                  <SelectTrigger className="w-full sm:w-[200px]" data-testid="position-type-select">
                    <SelectValue placeholder="Válassz típust" />
                  </SelectTrigger>
                  <SelectContent>
                    {workerTypes.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={newPosition.name}
                  onChange={(e) => setNewPosition({...newPosition, name: e.target.value})}
                  placeholder="Pozíció neve (pl. Hegesztő)"
                  className="flex-1"
                  data-testid="new-position-input"
                />
                <Button onClick={handleAddPosition} className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-position-btn">
                  <Plus className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Hozzáad</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Types & Positions List */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Típusok és pozíciók</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {positionsByType.map(type => (
                  <div key={type.id} className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between p-3 bg-slate-50">
                      <span className="font-semibold text-slate-800">{type.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{type.positions.length} pozíció</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteType(type.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          data-testid={`delete-type-${type.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {type.positions.length > 0 && (
                      <div className="p-2 space-y-1">
                        {type.positions.map(pos => (
                          <div 
                            key={pos.id}
                            className="flex items-center justify-between p-2 rounded hover:bg-slate-50"
                          >
                            <span className="flex items-center gap-2 text-sm text-slate-600">
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                              {pos.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePosition(pos.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7 w-7 p-0"
                              data-testid={`delete-position-${pos.id}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statuses */}
        <TabsContent value="statuses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Projekt státuszok</CardTitle>
              <CardDescription>Dolgozó-projekt kapcsolat állapotai</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-6">
                <Input
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  placeholder="Új státusz neve"
                  data-testid="new-status-input"
                />
                <Button onClick={handleAddStatus} className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-status-btn">
                  <Plus className="w-4 h-4 mr-1" /> Hozzáad
                </Button>
              </div>
              <div className="space-y-2">
                {statuses.map(status => (
                  <div 
                    key={status.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    data-testid={`status-item-${status.id}`}
                  >
                    <span className="font-medium text-slate-700">{status.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteStatus(status.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      data-testid={`delete-status-${status.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tags */}
        <TabsContent value="tags" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Jellemzők (Tags)</CardTitle>
              <CardDescription>Dolgozókhoz rendelhető címkék</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-2 mb-6">
                <Input
                  value={newTag.name}
                  onChange={(e) => setNewTag({...newTag, name: e.target.value})}
                  placeholder="Új jellemző neve"
                  className="flex-1"
                  data-testid="new-tag-input"
                />
                <input
                  type="color"
                  value={newTag.color}
                  onChange={(e) => setNewTag({...newTag, color: e.target.value})}
                  className="w-12 h-10 rounded border cursor-pointer"
                  data-testid="new-tag-color"
                />
                <Button onClick={handleAddTag} className="bg-indigo-600 hover:bg-indigo-700" data-testid="add-tag-btn">
                  <Plus className="w-4 h-4 mr-1" /> Hozzáad
                </Button>
              </div>
              <div className="space-y-2">
                {tags.map(tag => (
                  <div 
                    key={tag.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{backgroundColor: `${tag.color}15`}}
                    data-testid={`tag-item-${tag.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <span 
                        className="w-5 h-5 rounded-full"
                        style={{backgroundColor: tag.color}}
                      ></span>
                      <span className="font-medium" style={{color: tag.color}}>{tag.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      data-testid={`delete-tag-${tag.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users" className="mt-6 space-y-6">
          {/* User Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Toborzó statisztikák</CardTitle>
              <CardDescription>Ki hány dolgozót vitt fel</CardDescription>
            </CardHeader>
            <CardContent>
              {userStats.length > 0 ? (
                <div className="space-y-2">
                  {userStats.sort((a, b) => b.worker_count - a.worker_count).map(stat => (
                    <div 
                      key={stat.user_id}
                      className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    >
                      <div className="min-w-0">
                        <span className="font-medium text-slate-700">{stat.user_name}</span>
                        <span className="text-sm text-slate-500 ml-2 hidden sm:inline">({stat.user_email})</span>
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-700 border-0 shrink-0">
                        {stat.worker_count} dolgozó
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Még nincs adat</p>
              )}
            </CardContent>
          </Card>

          {/* Users List */}
          <Card>
            <CardHeader>
              <CardTitle>Felhasználók</CardTitle>
              <CardDescription>Regisztrált fiókok</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-6">
                {users.map(u => (
                  <div 
                    key={u.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                    data-testid={`user-item-${u.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-700 truncate">{u.name || u.email}</p>
                        <p className="text-sm text-slate-500 truncate">{u.email}</p>
                      </div>
                    </div>
                    <Badge className={`shrink-0 ${u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"} border-0`}>
                      {u.role === "admin" ? "Admin" : "Toborzó"}
                    </Badge>
                  </div>
                ))}
              </div>

              {/* Add User Form */}
              <div className="border-t pt-6">
                <h3 className="font-semibold text-slate-800 mb-4">Új felhasználó létrehozása</h3>
                <form onSubmit={handleAddUser} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="user-email">Email cím *</Label>
                      <Input
                        id="user-email"
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                        placeholder="felhasznalo@email.hu"
                        required
                        data-testid="new-user-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user-password">Jelszó *</Label>
                      <Input
                        id="user-password"
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        placeholder="Minimum 8 karakter"
                        required
                        minLength={8}
                        data-testid="new-user-password"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Szerepkör</Label>
                    <Select value={newUser.role} onValueChange={(v) => setNewUser({...newUser, role: v})}>
                      <SelectTrigger data-testid="new-user-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">Toborzó (user)</SelectItem>
                        <SelectItem value="admin">Adminisztrátor (admin)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 w-full sm:w-auto" data-testid="create-user-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Felhasználó létrehozása
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
