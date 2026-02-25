import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  FileText,
  Tag,
  X,
  Plus,
  FolderKanban,
  History,
  AlertCircle,
  MessageSquare
} from "lucide-react";

const getStatusColor = (statusName) => {
  const negativeStatuses = ["Nem jelent meg", "Nem felelt meg", "Lemondta"];
  const positiveStatuses = ["Megfelelt", "Dolgozik", "Megerősítve"];
  
  if (negativeStatuses.includes(statusName)) return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  if (positiveStatuses.includes(statusName)) return "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
  return "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700";
};

export default function WorkerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [worker, setWorker] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("info");

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [workerRes, tagsRes] = await Promise.all([
        axios.get(`${API}/workers/${id}`),
        axios.get(`${API}/tags`)
      ]);
      setWorker(workerRes.data);
      setAllTags(tagsRes.data);
    } catch (e) {
      toast.error("Dolgozó nem található");
      navigate("/workers");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Biztosan törlöd ezt a dolgozót?")) return;
    try {
      await axios.delete(`${API}/workers/${id}`);
      toast.success("Dolgozó törölve");
      navigate("/workers");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a törléskor");
    }
  };

  const handleAddTag = async (tagId) => {
    try {
      await axios.post(`${API}/workers/${id}/tags/${tagId}`);
      toast.success("Jellemző hozzáadva");
      fetchData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  const handleRemoveTag = async (tagId) => {
    try {
      await axios.delete(`${API}/workers/${id}/tags/${tagId}`);
      toast.success("Jellemző eltávolítva");
      fetchData();
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!worker) return null;

  const availableTags = allTags.filter(t => !worker.tags?.some(wt => wt.id === t.id));
  const negativeStatuses = worker.project_statuses?.filter(ps => 
    ["Nem jelent meg", "Nem felelt meg", "Lemondta"].includes(ps.status_name)
  ) || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/workers")}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground" data-testid="worker-name">
            {worker.name}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge 
              className="border-0 text-white" 
              style={{
                backgroundColor: worker.global_status === "Dolgozik" ? "#10B981" : 
                                worker.global_status === "Próbára vár" ? "#F97316" :
                                worker.global_status === "Próba megbeszélve" ? "#8B5CF6" :
                                worker.global_status === "Tiltólista" ? "#EF4444" : "#9CA3AF"
              }}
            >
              {worker.global_status === "Feldolgozatlan" && "⚪ "}
              {worker.global_status === "Próbára vár" && "🟠 "}
              {worker.global_status === "Próba megbeszélve" && "🟣 "}
              {worker.global_status === "Dolgozik" && "🟢 "}
              {worker.global_status === "Tiltólista" && "🔴 "}
              {worker.global_status || "Feldolgozatlan"}
            </Badge>
            {worker.worker_type_name && (
              <Badge variant="outline" className="dark:border-slate-600 dark:text-slate-300">{worker.worker_type_name}</Badge>
            )}
            {worker.position && (
              <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700">{worker.position}</Badge>
            )}
            {negativeStatuses.length > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800 gap-1">
                <AlertCircle className="w-3 h-3" />
                {negativeStatuses.length}x probléma
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => navigate(`/workers/${id}/edit`)}
            data-testid="edit-worker-btn"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Szerkesztés
          </Button>
          {user?.role === "admin" && (
            <Button 
              variant="outline"
              onClick={handleDelete}
              className="text-red-600 hover:bg-red-50"
              data-testid="delete-worker-btn"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Törlés
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[300px]">
          <TabsTrigger value="info" className="gap-2">
            <Briefcase className="w-4 h-4" />
            Adatok
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2" data-testid="history-tab">
            <History className="w-4 h-4" />
            Előzmények
            {worker.project_statuses?.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 justify-center">
                {worker.project_statuses.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Info Tab */}
        <TabsContent value="info">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Main info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-semibold text-foreground mb-4">Elérhetőségek</h2>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Telefon</p>
                      <a href={`tel:${worker.phone}`} className="font-medium text-foreground hover:text-primary" data-testid="worker-phone">{worker.phone}</a>
                    </div>
                  </div>
                  {worker.email && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <a href={`mailto:${worker.email}`} className="font-medium text-foreground hover:text-primary">{worker.email}</a>
                      </div>
                    </div>
                  )}
                  {worker.address && (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Lakóhely</p>
                        <p className="font-medium text-foreground">{worker.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Munkavégzés infó - ÚJ */}
              {(worker.work_type || worker.has_car) && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <h2 className="font-semibold text-foreground mb-4">Munkavégzés részletei</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {worker.work_type && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Munkavégzés típusa</p>
                        <Badge variant="outline" className="text-sm dark:border-slate-600 dark:text-slate-300">
                          {worker.work_type}
                        </Badge>
                      </div>
                    )}
                    {worker.has_car && (
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Saját autó</p>
                        <Badge 
                          variant="outline" 
                          className={`text-sm ${worker.has_car === 'Van' ? 'bg-green-500/10 text-green-600 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' : 'bg-red-500/10 text-red-600 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'}`}
                        >
                          {worker.has_car}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Position Experience */}
              {worker.position_experience && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <h3 className="font-medium text-foreground">Pozíció tapasztalat</h3>
                  </div>
                  <p className="text-muted-foreground whitespace-pre-wrap">{worker.position_experience}</p>
                </div>
              )}

              {/* Experience & Notes */}
              {(worker.experience || worker.notes) && (
                <div className="bg-card rounded-xl border border-border p-6">
                  {worker.experience && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium text-foreground">Általános tapasztalat</h3>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{worker.experience}</p>
                    </div>
                  )}
                  {worker.notes && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <h3 className="font-medium text-foreground">Megjegyzések</h3>
                      </div>
                      <p className="text-muted-foreground whitespace-pre-wrap">{worker.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Tags */}
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Jellemzők</h2>
                </div>
                
                {worker.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {worker.tags.map(tag => (
                      <span 
                        key={tag.id}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full text-white"
                        style={{backgroundColor: tag.color}}
                      >
                        {tag.name}
                        <button 
                          onClick={() => handleRemoveTag(tag.id)}
                          className="ml-1 hover:bg-white/20 rounded-full p-0.5"
                          data-testid={`remove-tag-${tag.id}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {availableTags.length > 0 && (
                  <Select onValueChange={handleAddTag}>
                    <SelectTrigger data-testid="add-tag-select">
                      <SelectValue placeholder="Jellemző hozzáadása" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTags.map(tag => (
                        <SelectItem key={tag.id} value={tag.id}>
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{backgroundColor: tag.color}}></span>
                            {tag.name}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Meta */}
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-semibold text-foreground mb-4">Részletek</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Felvéve</span>
                    <span className="text-foreground">
                      {new Date(worker.created_at).toLocaleDateString('hu-HU')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Felvitte</span>
                    <span className="text-foreground">{worker.owner_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Projektek</span>
                    <span className="text-foreground">{worker.project_statuses?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center gap-2 mb-6">
              <History className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Projekt előzmények</h2>
            </div>
            
            {worker.project_statuses?.length > 0 ? (
              <div className="space-y-4">
                {worker.project_statuses.map((ps, i) => (
                  <div
                    key={`${ps.project_id}-${i}`}
                    className="p-4 rounded-lg border bg-card border-border"
                    data-testid={`history-entry-${i}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link 
                            to={`/projects/${ps.project_id}`}
                            className="font-semibold text-foreground hover:text-primary"
                          >
                            {ps.project_name}
                          </Link>
                          <Badge className={getStatusColor(ps.status_name)}>
                            {ps.status_name}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {ps.project_date ? new Date(ps.project_date).toLocaleDateString('hu-HU') : '-'}
                          </span>
                          {ps.updated_at && (
                            <span className="text-xs text-muted-foreground/70">
                              Frissítve: {new Date(ps.updated_at).toLocaleDateString('hu-HU')}
                            </span>
                          )}
                        </div>
                        
                        {ps.notes && (
                          <div className="mt-2 p-2 bg-muted/50 rounded text-sm text-foreground flex items-start gap-2">
                            <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <span>{ps.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FolderKanban className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">Még nincs projekthez rendelve</p>
                <p className="text-sm text-muted-foreground/70 mt-1">A projekt részvételek és státuszok itt fognak megjelenni</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
