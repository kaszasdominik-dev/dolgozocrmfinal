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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Save, Calendar, Car, Briefcase, FolderPlus, MapPin, X, Hash } from "lucide-react";

export default function WorkerFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;
  
  const [workerTypes, setWorkerTypes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [globalStatuses, setGlobalStatuses] = useState([]);
  const [trials, setTrials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    worker_type_id: "",
    position: "",
    position_experience: "",
    global_status: "Feldolgozatlan", // Alapértelmezett: még nem volt kommunikáció
    address: "",
    email: "",
    experience: "",
    notes: "",
    work_type: "",
    has_car: "",
    latitude: null,
    longitude: null,
    properties: [] // Tulajdonságok: megbízható, jó munkaerő, stb.
  });
  
  // Elérhető tulajdonságok
  const availableProperties = [
    { id: "megbizhato", label: "Megbízható", color: "bg-green-500" },
    { id: "jo_munkaero", label: "Jó munkaerő", color: "bg-blue-500" },
    { id: "rossz_minoseg", label: "Rossz minőség", color: "bg-red-500" },
    { id: "rovidtavu", label: "Rövidtávú munkaerő", color: "bg-orange-500" }
  ];
  
  // Project assignment state
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedTrial, setSelectedTrial] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [addToProject, setAddToProject] = useState("waitlist");
  
  // ÚJ: Projekt választó dialog státuszhoz
  const [projectSelectDialog, setProjectSelectDialog] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedPositionIds, setSelectedPositionIds] = useState([]); // Pozíciók
  const [projectPositions, setProjectPositions] = useState([]); // Projekt pozíciói
  const [pendingStatus, setPendingStatus] = useState("");
  const [pendingProjectAssignment, setPendingProjectAssignment] = useState(null); // Új dolgozóhoz
  
  // Map dialog state
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  useEffect(() => {
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
      const [typesRes, projectsRes, statusesRes, globalStatusesRes] = await Promise.all([
        axios.get(`${API}/worker-types`),
        axios.get(`${API}/projects`),
        axios.get(`${API}/statuses`),
        axios.get(`${API}/global-statuses`) // ÚJ: Globális státuszok lekérése
      ]);
      setWorkerTypes(typesRes.data);
      setProjects(projectsRes.data.filter(p => !p.is_closed));
      setStatuses(statusesRes.data);
      setGlobalStatuses(globalStatusesRes.data || []); // ÚJ: Globális státuszok
      
      if (isEdit) {
        const workerRes = await axios.get(`${API}/workers/${id}`);
        setFormData({
          name: workerRes.data.name || "",
          phone: workerRes.data.phone || "",
          worker_type_id: workerRes.data.worker_type_id || "",
          position: workerRes.data.position || "",
          position_experience: workerRes.data.position_experience || "",
          global_status: workerRes.data.global_status || "Feldolgozatlan",
          address: workerRes.data.address || "",
          email: workerRes.data.email || "",
          experience: workerRes.data.experience || "",
          notes: workerRes.data.notes || "",
          work_type: workerRes.data.work_type || "",
          has_car: workerRes.data.has_car || "",
          latitude: workerRes.data.latitude || null,
          longitude: workerRes.data.longitude || null,
          properties: workerRes.data.properties || []
        });
      }
    } catch (e) {
      toast.error("Hiba");
      if (isEdit) navigate("/workers");
    }
  };

  // Geocode search
  const handleMapSearch = async () => {
    if (!mapSearchQuery.trim()) return;
    setGeocoding(true);
    try {
      const res = await axios.post(`${API}/geocode`, { address: mapSearchQuery });
      if (res.data.latitude && res.data.longitude) {
        setMapSearchResults([{
          display_name: res.data.display_name || mapSearchQuery,
          lat: res.data.latitude,
          lon: res.data.longitude,
          county: res.data.county || ""
        }]);
      } else {
        setMapSearchResults([]);
        toast.error("Nem található a cím");
      }
    } catch (e) {
      toast.error("Hiba a keresésben");
      setMapSearchResults([]);
    } finally {
      setGeocoding(false);
    }
  };

  const selectLocationFromMap = (location) => {
    setSelectedLocation(location);
    setFormData(prev => ({
      ...prev,
      address: location.display_name,
      latitude: parseFloat(location.lat),
      longitude: parseFloat(location.lon)
    }));
    setMapDialogOpen(false);
    toast.success("Hely kiválasztva");
  };

  // ÚJ: Státusz választáskor ellenőrzés
  const handleStatusChange = (newStatus) => {
    // Ha projekt-specifikus státusz, akkor projekt és pozíció választás kell
    const projectStatuses = ["Dolgozik", "Próbára vár", "Próba megbeszélve"];
    if (projectStatuses.includes(newStatus)) {
      setPendingStatus(newStatus);
      setSelectedProjectId("");
      setSelectedPositionIds([]);
      setProjectPositions([]);
      setProjectSelectDialog(true);
    } else {
      // Globális státusz (Feldolgozatlan, Tiltólista) - csak beállítás, nincs projekt/pozíció
      setFormData({...formData, global_status: newStatus});
    }
  };
  
  // Projekt változáskor pozíciók betöltése
  const handleProjectChange = async (projectId) => {
    setSelectedProjectId(projectId);
    setSelectedPositionIds([]);
    if (projectId) {
      try {
        const res = await axios.get(`${API}/projects/${projectId}/positions`);
        setProjectPositions(res.data || []);
      } catch (e) {
        console.error("Error fetching positions:", e);
        setProjectPositions([]);
      }
    } else {
      setProjectPositions([]);
    }
  };
  
  // Projekt választás megerősítése
  const handleProjectSelection = async () => {
    if (!selectedProjectId) {
      toast.error("Válassz projektet!");
      return;
    }
    
    // Pozíció kötelező a projekt-specifikus státuszoknál
    if (selectedPositionIds.length === 0) {
      toast.error(`A "${pendingStatus}" státuszhoz kötelező legalább egy pozíciót választani!`);
      return;
    }
    
    // Státusz ID lekérése a pendingStatus alapján
    const statusObj = statuses.find(s => s.name === pendingStatus);
    if (!statusObj) {
      toast.error("Státusz nem található!");
      return;
    }
    
    // Formdata státusz beállítása
    setFormData({...formData, global_status: pendingStatus});
    
    // Projekt worker kapcsolat létrehozása (ha van dolgozó ID - edit módban)
    if (isEdit && id) {
      try {
        await axios.post(`${API}/projects/${selectedProjectId}/workers`, {
          worker_id: id,
          status_id: statusObj.id,
          position_ids: selectedPositionIds
        });
        toast.success(`Dolgozó hozzáadva a projekthez: ${pendingStatus}`);
      } catch (error) {
        toast.error(error.response?.data?.detail || "Hiba történt");
      }
    } else {
      // Új dolgozónál később használjuk
      setPendingProjectAssignment({
        projectId: selectedProjectId,
        statusId: statusObj.id,
        positionIds: selectedPositionIds
      });
      toast.success("Projekt és pozíció beállítva, mentéskor hozzáadásra kerül");
    }
    
    setProjectSelectDialog(false);
    setSelectedProjectId("");
    setSelectedPositionIds([]);
    setProjectPositions([]);
    setPendingStatus("");
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
      
      // Project assignment
      if (!isEdit && selectedProject && addToProject === "direct" && selectedStatus) {
        payload.project_id = selectedProject;
        payload.initial_status = selectedStatus;
      } else if (!isEdit && selectedProject && addToProject === "waitlist") {
        payload.project_id = selectedProject;
      }
      
      let workerId;
      
      if (isEdit) {
        await axios.put(`${API}/workers/${id}`, payload);
        toast.success("Mentve");
        workerId = id;
      } else {
        const res = await axios.post(`${API}/workers`, payload);
        workerId = res.data.id;
        toast.success("Létrehozva");
        
        // Ha státuszválasztásból jött projekt hozzárendelés
        if (pendingProjectAssignment) {
          try {
            await axios.post(`${API}/projects/${pendingProjectAssignment.projectId}/workers`, {
              worker_id: workerId,
              status_id: pendingProjectAssignment.statusId,
              position_ids: pendingProjectAssignment.positionIds || []
            });
            toast.success("Dolgozó hozzáadva a projekthez");
          } catch (error) {
            toast.error("Hiba a projekthez adásnál: " + (error.response?.data?.detail || ""));
          }
        }
        
        // If trial is selected, add worker to trial
        if (selectedProject && selectedTrial) {
          // First add to project if not already
          if (addToProject === "waitlist") {
            try {
              await axios.post(`${API}/projects/${selectedProject}/workers`, { worker_id: workerId });
            } catch (e) {
              // May already be added
            }
          }
          // Add to trial
          await axios.post(`${API}/projects/${selectedProject}/trials/${selectedTrial}/workers`, { 
            worker_id: workerId 
          });
          toast.success("Dolgozó hozzáadva a próbához is");
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
                <Label className="text-sm">Státusz *</Label>
                <Select value={formData.global_status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Feldolgozatlan" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feldolgozatlan">⚪ Feldolgozatlan</SelectItem>
                    <SelectItem value="Próbára vár">🟠 Próbára vár</SelectItem>
                    <SelectItem value="Próba megbeszélve">🟣 Próba megbeszélve</SelectItem>
                    <SelectItem value="Dolgozik">🟢 Dolgozik</SelectItem>
                    <SelectItem value="Tiltólista">🔴 Tiltólista</SelectItem>
                  </SelectContent>
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

            {/* Tulajdonságok / Hashtagek */}
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-1">
                <Hash className="w-3 h-3" />
                Tulajdonságok
              </Label>
              <div className="flex flex-wrap gap-2">
                {availableProperties.map(prop => {
                  const isSelected = formData.properties?.includes(prop.id);
                  return (
                    <button
                      key={prop.id}
                      type="button"
                      onClick={() => {
                        const newProps = isSelected
                          ? formData.properties.filter(p => p !== prop.id)
                          : [...(formData.properties || []), prop.id];
                        setFormData({...formData, properties: newProps});
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        isSelected 
                          ? `${prop.color} text-white shadow-md` 
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      data-testid={`property-${prop.id}`}
                    >
                      #{prop.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Munkavégzés típusa és Saját autó */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm flex items-center gap-1">
                  <Briefcase className="w-3 h-3" />
                  Munkavégzés típusa
                </Label>
                <Select value={formData.work_type} onValueChange={(v) => setFormData({...formData, work_type: v})}>
                  <SelectTrigger className="h-9" data-testid="worker-work-type-select">
                    <SelectValue placeholder="Válassz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ingázó">Ingázó</SelectItem>
                    <SelectItem value="Szállásos">Szállásos</SelectItem>
                    <SelectItem value="Mindegy">Mindegy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-sm flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  Saját autó
                </Label>
                <Select value={formData.has_car} onValueChange={(v) => setFormData({...formData, has_car: v})}>
                  <SelectTrigger className="h-9" data-testid="worker-has-car-select">
                    <SelectValue placeholder="Válassz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Nincs">Nincs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Pozíció tapasztalat</Label>
              <Textarea value={formData.position_experience} onChange={(e) => setFormData({...formData, position_experience: e.target.value})} placeholder="A pozícióval kapcsolatos tapasztalat, képzettség..." rows={2} data-testid="worker-position-exp-input" />
            </div>

            {/* Lakóhely térkép ikonnal */}
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Lakóhely
              </Label>
              <div className="flex gap-2">
                <Input 
                  value={formData.address} 
                  onChange={(e) => setFormData({...formData, address: e.target.value, latitude: null, longitude: null})} 
                  placeholder="Budapest, Fő utca 1." 
                  className="h-9 flex-1" 
                  data-testid="worker-address-input" 
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="icon" 
                  className="h-9 w-9 shrink-0" 
                  onClick={() => {
                    setMapSearchQuery(formData.address);
                    setMapDialogOpen(true);
                  }}
                  data-testid="open-map-btn"
                >
                  <MapPin className="w-4 h-4 text-primary" />
                </Button>
              </div>
              {formData.latitude && formData.longitude && (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3" />
                  Koordináták: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Általános tapasztalat</Label>
              <Textarea value={formData.experience} onChange={(e) => setFormData({...formData, experience: e.target.value})} placeholder="Korábbi munkatapasztalatok..." rows={2} data-testid="worker-experience-input" />
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Megjegyzések</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Egyéb..." rows={2} data-testid="worker-notes-input" />
            </div>

            {/* Projekt hozzáadás - csak új dolgozónál */}
            {!isEdit && (
              <div className="border-t border-border pt-4 mt-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <FolderPlus className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">Projekt hozzárendelés (opcionális)</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-sm">Projekt</Label>
                    <Select 
                      value={selectedProject} 
                      onValueChange={(val) => {
                        setSelectedProject(val);
                        setSelectedTrial("");
                        setSelectedStatus("");
                      }}
                    >
                      <SelectTrigger className="h-9" data-testid="project-select">
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

                  {selectedProject && (
                    <>
                      {/* Hova adjuk hozzá */}
                      <div className="space-y-1">
                        <Label className="text-sm">Hova kerüljön a dolgozó?</Label>
                        <Select value={addToProject} onValueChange={setAddToProject}>
                          <SelectTrigger className="h-9" data-testid="add-to-project-type">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="waitlist">Várólistára</SelectItem>
                            <SelectItem value="direct">Közvetlenül a projektbe (státusszal)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Ha közvetlen, státusz választás */}
                      {addToProject === "direct" && (
                        <div className="space-y-1">
                          <Label className="text-sm">Kezdő státusz *</Label>
                          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                            <SelectTrigger className="h-9" data-testid="initial-status-select">
                              <SelectValue placeholder="Válassz státuszt..." />
                            </SelectTrigger>
                            <SelectContent>
                              {statuses.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Próba választás - MINDIG megjelenik ha van próba */}
                      {trials.length > 0 && (
                        <div className="space-y-1">
                          <Label className="text-sm flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Próbához csatolás (opcionális)
                          </Label>
                          <Select value={selectedTrial} onValueChange={setSelectedTrial}>
                            <SelectTrigger className="h-9" data-testid="trial-select">
                              <SelectValue placeholder="Válassz próbát..." />
                            </SelectTrigger>
                            <SelectContent>
                              {trials.map(t => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.date} {t.time && `(${t.time})`} - {t.notes || "Próba"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {selectedProject && (
                  <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {addToProject === "direct" 
                      ? selectedStatus 
                        ? `A dolgozó közvetlenül a projekthez kerül "${statuses.find(s => s.id === selectedStatus)?.name || ''}" státusszal.${selectedTrial ? " + Próbához csatolva." : ""}`
                        : "Válassz státuszt a közvetlen hozzáadáshoz."
                      : selectedTrial 
                        ? "A dolgozó a várólistára kerül és a kiválasztott próbához is csatolódik."
                        : "A dolgozó a projekt várólistájára kerül."
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

      {/* Map Dialog */}
      <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Hely kiválasztás térképen
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input 
                value={mapSearchQuery}
                onChange={(e) => setMapSearchQuery(e.target.value)}
                placeholder="Keress címre, városra..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleMapSearch())}
              />
              <Button onClick={handleMapSearch} disabled={geocoding}>
                {geocoding ? "..." : "Keresés"}
              </Button>
            </div>

            {mapSearchResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Találatok:</p>
                {mapSearchResults.map((loc, idx) => (
                  <div 
                    key={idx}
                    className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => selectLocationFromMap(loc)}
                  >
                    <p className="font-medium text-sm">{loc.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                      {loc.county && ` • ${loc.county}`}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Simple map preview using OpenStreetMap embed */}
            {selectedLocation && (
              <div className="mt-4">
                <iframe
                  title="map"
                  width="100%"
                  height="200"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedLocation.lon - 0.01}%2C${selectedLocation.lat - 0.01}%2C${selectedLocation.lon + 0.01}%2C${selectedLocation.lat + 0.01}&layer=mapnik&marker=${selectedLocation.lat}%2C${selectedLocation.lon}`}
                  className="rounded-lg border"
                ></iframe>
              </div>
            )}

            {mapSearchResults.length === 0 && !geocoding && (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Keress rá egy címre vagy városra</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Projekt és pozíció választó dialog státuszhoz */}
      <Dialog open={projectSelectDialog} onOpenChange={(open) => {
        if (!open) {
          setSelectedProjectId("");
          setSelectedPositionIds([]);
          setProjectPositions([]);
          setPendingStatus("");
        }
        setProjectSelectDialog(open);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Projekt és pozíció választás</DialogTitle>
            <DialogDescription>
              A "{pendingStatus}" státuszhoz válaszd ki a projektet és a pozíciót!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Projekt *</Label>
              <Select value={selectedProjectId} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz projektet..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {p.client || ""} ({new Date(p.date).toLocaleDateString('hu-HU')})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Pozíció választó - csak ha van projekt */}
            {selectedProjectId && (
              <div className="space-y-2">
                <Label>Pozíció(k) * <span className="text-xs text-muted-foreground">(kötelező)</span></Label>
                {projectPositions.length > 0 ? (
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                    {projectPositions.map(pos => (
                      <Button
                        key={pos.id}
                        type="button"
                        variant={selectedPositionIds.includes(pos.id) ? "default" : "outline"}
                        size="sm"
                        className={selectedPositionIds.includes(pos.id) ? "bg-indigo-600" : ""}
                        onClick={() => {
                          if (selectedPositionIds.includes(pos.id)) {
                            setSelectedPositionIds(selectedPositionIds.filter(id => id !== pos.id));
                          } else {
                            setSelectedPositionIds([...selectedPositionIds, pos.id]);
                          }
                        }}
                      >
                        {pos.name} ({pos.current_count || 0}/{pos.count})
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 p-2 bg-amber-50 rounded border border-amber-200">
                    Nincs pozíció ehhez a projekthez. Először adj hozzá pozíciókat a projekt beállításoknál!
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setProjectSelectDialog(false);
              setSelectedProjectId("");
              setSelectedPositionIds([]);
              setProjectPositions([]);
              setPendingStatus("");
            }}>
              Mégse
            </Button>
            <Button 
              onClick={handleProjectSelection} 
              disabled={!selectedProjectId || selectedPositionIds.length === 0}
            >
              Megerősítés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
