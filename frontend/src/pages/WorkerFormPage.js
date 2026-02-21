import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Calendar } from "lucide-react";

export default function WorkerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [workerTypes, setWorkerTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [categories, setCategories] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    worker_type_id: "",
    position: "",
    position_experience: "",
    category: "Felvitt dolgozók",
    address: "",
    email: "",
    experience: "",
    notes: ""
  });
  
  // Separate state for optional project and trial assignment
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTrial, setSelectedTrial] = useState("");

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  useEffect(() => {
    // Fetch trials when project is selected
    if (selectedProject) {
      fetchProjectTrials(selectedProject);
    } else {
      setTrials([]);
      setSelectedTrial("");
    }
  }, [selectedProject]);

  const fetchProjectTrials = async (projectId) => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/trials`);
      setTrials(res.data);
    } catch (e) {
      console.error("Error fetching trials:", e);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [typesRes, projectsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/worker-types`),
        axios.get(`${API}/projects`),
        axios.get(`${API}/categories`)
      ]);
      setWorkerTypes(typesRes.data);
      setProjects(projectsRes.data.filter(p => !p.is_closed));
      setCategories(categoriesRes.data);
      
      // Set default category to first if available
      if (categoriesRes.data.length > 0 && !isEdit) {
        setFormData(prev => ({
          ...prev,
          category: categoriesRes.data[0].name
        }));
      }
      
      if (isEdit) {
        const workerRes = await axios.get(`${API}/workers/${id}`);
        setFormData({
          name: workerRes.data.name || "",
          phone: workerRes.data.phone || "",
          worker_type_id: workerRes.data.worker_type_id || "",
          position: workerRes.data.position || "",
          position_experience: workerRes.data.position_experience || "",
          category: workerRes.data.category || "Felvitt dolgozók",
          address: workerRes.data.address || "",
          email: workerRes.data.email || "",
          experience: workerRes.data.experience || "",
          notes: workerRes.data.notes || ""
        });
      }
    } catch (e) {
      toast.error("Hiba");
      if (isEdit) navigate("/workers");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.name.length < 2) {
      toast.error("Név minimum 2 karakter");
      return;
    }
    if (!formData.phone) {
      toast.error("Telefonszám kötelező");
      return;
    }
    if (!formData.worker_type_id) {
      toast.error("Válassz típust");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...formData };
      
      let workerId;
      
      if (isEdit) {
        await axios.put(`${API}/workers/${id}`, payload);
        toast.success("Mentve");
        workerId = id;
      } else {
        const res = await axios.post(`${API}/workers`, payload);
        workerId = res.data.id;
        toast.success("Létrehozva");
        
        // If project is selected, add worker to project
        if (selectedProject) {
          await axios.post(`${API}/projects/${selectedProject}/workers`, { worker_id: workerId });
          
          // If trial is selected, add worker to trial
          if (selectedTrial) {
            await axios.post(`${API}/projects/${selectedProject}/trials/${selectedTrial}/workers`, { 
              worker_id: workerId 
            });
            toast.success("Dolgozó hozzáadva a próbához");
          }
        }
      }
      navigate("/workers");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/workers")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">{isEdit ? "Szerkesztés" : "Új dolgozó"}</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Dolgozó adatai</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Név *</Label>
                <Input value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Kiss János" required className="h-9" data-testid="worker-name-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Telefon *</Label>
                <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} placeholder="+36 20 123 4567" required className="h-9" data-testid="worker-phone-input" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Típus *</Label>
                <Select value={formData.worker_type_id} onValueChange={(v) => setFormData({...formData, worker_type_id: v})}>
                  <SelectTrigger className="h-9" data-testid="worker-type-select"><SelectValue placeholder="Válassz" /></SelectTrigger>
                  <SelectContent>{workerTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Kategória</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger className="h-9" data-testid="worker-category-select"><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Pozíció (szabadon beírható)</Label>
                <Input value={formData.position} onChange={(e) => setFormData({...formData, position: e.target.value})} placeholder="pl. Hegesztő, CNC gépkezelő" className="h-9" data-testid="worker-position-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@email.hu" className="h-9" data-testid="worker-email-input" />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Pozíció tapasztalat</Label>
              <Textarea value={formData.position_experience} onChange={(e) => setFormData({...formData, position_experience: e.target.value})} placeholder="A pozícióval kapcsolatos tapasztalat, képzettség..." rows={2} data-testid="worker-position-exp-input" />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Lakcím</Label>
              <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} placeholder="Budapest, Fő utca 1." className="h-9" data-testid="worker-address-input" />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Általános tapasztalat</Label>
              <Textarea value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})} placeholder="Korábbi munkatapasztalatok..." rows={2} data-testid="worker-experience-input" />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Megjegyzések</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Egyéb..." rows={2} data-testid="worker-notes-input" />
            </div>

            {/* Projekt várólista hozzáadás - csak új dolgozónál */}
            {!isEdit && (
              <div className="border-t border-border pt-4 mt-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Projekt és próba hozzárendelés (opcionális)</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Projekt</Label>
                    <Select 
                      value={selectedProject} 
                      onValueChange={(val) => {
                        setSelectedProject(val);
                        setSelectedTrial("");
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Válassz projektet..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} {p.date && `- ${p.date}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedProject && trials.length > 0 && (
                    <div className="space-y-1">
                      <Label className="text-sm">Próba</Label>
                      <Select 
                        value={selectedTrial} 
                        onValueChange={setSelectedTrial}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Válassz próbát..." />
                        </SelectTrigger>
                        <SelectContent>
                          {trials.map(t => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.date} {t.time && `(${t.time})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                {selectedProject && (
                  <p className="text-xs text-muted-foreground">
                    {selectedTrial 
                      ? "A dolgozó létrehozás után automatikusan hozzáadódik a projekthez és a kiválasztott próbához."
                      : trials.length > 0 
                        ? "Válassz próbát, hogy a dolgozót rögtön beoszthasd."
                        : "A dolgozó létrehozás után automatikusan hozzáadódik a projekthez. (Nincs próba ehhez a projekthez)"
                    }
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate("/workers")}>Mégse</Button>
              <Button type="submit" size="sm" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-worker-btn">
                {loading ? "..." : <><Save className="w-4 h-4 mr-1" />{isEdit ? "Mentés" : "Létrehozás"}</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
