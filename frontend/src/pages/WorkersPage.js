import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Phone,
  Edit2,
  Trash2,
  FolderPlus,
  User,
  X,
  FileSpreadsheet,
  Eye,
  MapPin,
  Navigation,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  Car,
  Briefcase,
  Filter,
  Users
} from "lucide-react";

// Helper to load/save filters from localStorage
const FILTERS_STORAGE_KEY = "workers_filters";

const loadSavedFilters = () => {
  try {
    const saved = localStorage.getItem(FILTERS_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const saveFilters = (filters) => {
  try {
    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {}
};

export default function WorkersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [workers, setWorkers] = useState([]);
  const [workerTypes, setWorkerTypes] = useState([]);
  const [tags, setTags] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [counties, setCounties] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  
  // Load saved filters on mount
  const savedFilters = loadSavedFilters();
  
  // Basic filters
  const [search, setSearch] = useState(savedFilters?.search || "");
  const [typeFilter, setTypeFilter] = useState(savedFilters?.typeFilter || "");
  const [tagFilter, setTagFilter] = useState(savedFilters?.tagFilter || "");
  const [ownerFilter, setOwnerFilter] = useState(savedFilters?.ownerFilter || "");
  
  // Advanced filters
  const [advancedOpen, setAdvancedOpen] = useState(savedFilters?.advancedOpen || false);
  const [countyFilter, setCountyFilter] = useState(savedFilters?.countyFilter || "");
  const [positionFilter, setPositionFilter] = useState(savedFilters?.positionFilter || "");
  const [workTypeFilter, setWorkTypeFilter] = useState(savedFilters?.workTypeFilter || "");
  const [hasCarFilter, setHasCarFilter] = useState(savedFilters?.hasCarFilter || "");
  const [globalStatusFilter, setGlobalStatusFilter] = useState(savedFilters?.globalStatusFilter || "");
  const [propertyFilter, setPropertyFilter] = useState(savedFilters?.propertyFilter || "");
  const [genderFilter, setGenderFilter] = useState(savedFilters?.genderFilter || "");  // ÚJ: Nem szűrő
  const [dateFrom, setDateFrom] = useState(savedFilters?.dateFrom || "");
  const [dateTo, setDateTo] = useState(savedFilters?.dateTo || "");
  
  // Projekt státusz szűrő - projekt dolgozók szűréséhez
  const [projectStatusFilter, setProjectStatusFilter] = useState("");
  const [filterProjectId, setFilterProjectId] = useState("");
  
  // Elérhető tulajdonságok
  const availableProperties = [
    { id: "megbizhato", label: "Megbízható", color: "bg-green-500" },
    { id: "jo_munkaero", label: "Jó munkaerő", color: "bg-blue-500" },
    { id: "rossz_minoseg", label: "Rossz minőség", color: "bg-red-500" },
    { id: "rovidtavu", label: "Rövidtávú", color: "bg-orange-500" }
  ];
  
  // Location filter
  const [locationSearch, setLocationSearch] = useState(savedFilters?.locationSearch || "");
  const [centerLat, setCenterLat] = useState(savedFilters?.centerLat || null);
  const [centerLon, setCenterLon] = useState(savedFilters?.centerLon || null);
  const [radiusKm, setRadiusKm] = useState(savedFilters?.radiusKm || 30);
  const [locationEnabled, setLocationEnabled] = useState(savedFilters?.locationEnabled || false);
  const [geocoding, setGeocoding] = useState(false);
  
  // Save filters whenever they change
  useEffect(() => {
    if (filtersLoaded) {
      saveFilters({
        search, typeFilter, tagFilter, ownerFilter, advancedOpen,
        countyFilter, positionFilter, workTypeFilter, hasCarFilter, globalStatusFilter, propertyFilter,
        dateFrom, dateTo, locationSearch, centerLat, centerLon, radiusKm, locationEnabled
      });
    }
  }, [search, typeFilter, tagFilter, ownerFilter, advancedOpen,
      countyFilter, positionFilter, workTypeFilter, hasCarFilter, globalStatusFilter, propertyFilter,
      dateFrom, dateTo, locationSearch, centerLat, centerLon, radiusKm, locationEnabled, filtersLoaded]);
  
  useEffect(() => {
    setFiltersLoaded(true);
  }, []);
  
  // Geocode stats
  const [geocodeStats, setGeocodeStats] = useState(null);
  const [bulkGeocodeJob, setBulkGeocodeJob] = useState(null);
  
  // Manual geocode dialog - üres címek kezelése
  const [manualGeocodeDialog, setManualGeocodeDialog] = useState(false);
  const [workersWithoutAddress, setWorkersWithoutAddress] = useState([]);
  const [manualAddresses, setManualAddresses] = useState({});
  const [savingManualGeocode, setSavingManualGeocode] = useState(false);
  
  // Map dialog
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapSearchResults, setMapSearchResults] = useState([]);
  
  // Add to project dialog
  const [addToProjectOpen, setAddToProjectOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedStatusId, setSelectedStatusId] = useState(""); // ÚJ
  const [selectedTrialId, setSelectedTrialId] = useState(""); // ÚJ
  const [selectedTrialPositionId, setSelectedTrialPositionId] = useState(""); // ÚJ
  const [projectTrials, setProjectTrials] = useState([]); // ÚJ: A kiválasztott projekt próbái
  const [selectedPositionIds, setSelectedPositionIds] = useState([]); // ÚJ: Többszörös pozíció
  const [projectPositions, setProjectPositions] = useState([]); // Projekt-specifikus pozíciók

  // Debounced fetch
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (typeFilter) params.append("worker_type_id", typeFilter);
      if (tagFilter) params.append("tag_id", tagFilter);
      if (ownerFilter) params.append("owner_id", ownerFilter);
      if (countyFilter) params.append("county", countyFilter);
      if (positionFilter) params.append("position_filter", positionFilter);
      if (workTypeFilter) params.append("work_type", workTypeFilter);
      if (hasCarFilter) params.append("has_car", hasCarFilter);
      if (globalStatusFilter) params.append("global_status", globalStatusFilter);
      if (propertyFilter) params.append("property_filter", propertyFilter);
      if (genderFilter) params.append("gender", genderFilter);  // ÚJ: Nem szűrő
      if (dateFrom) params.append("date_from", dateFrom);
      if (dateTo) params.append("date_to", dateTo);
      // Projekt státusz szűrő
      if (filterProjectId) params.append("project_id", filterProjectId);
      if (projectStatusFilter) params.append("project_status", projectStatusFilter);
      if (locationEnabled && centerLat && centerLon) {
        params.append("center_lat", centerLat);
        params.append("center_lon", centerLon);
        params.append("radius_km", radiusKm);
      }

      const [workersRes, typesRes, tagsRes, projectsRes, statusesRes] = await Promise.all([
        axios.get(`${API}/workers?${params}`),
        axios.get(`${API}/worker-types`),
        axios.get(`${API}/tags`),
        axios.get(`${API}/projects`),
        axios.get(`${API}/statuses`)
      ]);
      
      setWorkers(workersRes.data);
      setWorkerTypes(typesRes.data);
      setTags(tagsRes.data);
      setProjects(projectsRes.data.filter(p => !p.is_closed));
      setStatuses(statusesRes.data);

      if (user?.role === "admin") {
        const usersRes = await axios.get(`${API}/users`);
        setUsers(usersRes.data);
      }
    } catch (e) {
      toast.error("Hiba az adatok betöltésekor");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, tagFilter, ownerFilter, countyFilter, positionFilter, 
      workTypeFilter, hasCarFilter, globalStatusFilter, propertyFilter, genderFilter, dateFrom, dateTo, centerLat, centerLon, 
      radiusKm, locationEnabled, filterProjectId, projectStatusFilter, user?.role]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [fetchData, location.key]); // location.key változik minden navigáláskor

  useEffect(() => {
    fetchCounties();
    fetchGeocodeStats();
  }, []);

  const fetchCounties = async () => {
    try {
      const res = await axios.get(`${API}/counties`);
      setCounties(res.data);
    } catch (e) {
      console.error("Error fetching counties:", e);
    }
  };

  const fetchGeocodeStats = async () => {
    try {
      const res = await axios.get(`${API}/workers/geocode-stats`);
      setGeocodeStats(res.data);
    } catch (e) {
      console.error("Error fetching geocode stats:", e);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Biztosan törlöd?")) return;
    try {
      await axios.delete(`${API}/workers/${id}`);
      toast.success("Dolgozó törölve");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };

  const handleAddToProject = async () => {
    if (!selectedProjectId || !selectedWorker) {
      toast.error("Válassz projektet!");
      return;
    }
    
    if (!selectedStatusId) {
      toast.error("Válassz státuszt!");
      return;
    }
    
    // Kötelező pozíció választás bizonyos státuszoknál
    const selectedStatus = statuses?.find(s => s.id === selectedStatusId);
    const requiredPositionStatuses = ["Próbára vár", "Dolgozik", "Próba megbeszélve", "Feldolgozatlan"];
    
    if (requiredPositionStatuses.includes(selectedStatus?.name) && selectedPositionIds.length === 0) {
      toast.error(`A "${selectedStatus?.name}" státuszhoz kötelező legalább egy pozíciót választani!`);
      return;
    }
    
    // Ha "Próba megbeszélve" és nincs próba kiválasztva
    if (selectedStatus?.name === "Próba megbeszélve" && !selectedTrialId) {
      toast.error("Válassz próbát!");
      return;
    }
    
    try {
      const requestData = {
        worker_id: selectedWorker.id,
        status_id: selectedStatusId,
        position_ids: selectedPositionIds
      };
      
      if (selectedTrialId) {
        requestData.trial_id = selectedTrialId;
      }
      
      if (selectedTrialPositionId) {
        requestData.trial_position_id = selectedTrialPositionId;
      }
      
      await axios.post(`${API}/projects/${selectedProjectId}/workers`, requestData);
      toast.success(`${selectedWorker.name} hozzáadva: ${selectedStatus?.name}`);
      
      // Frissítjük az adatokat
      await fetchData();
      
      // Dialog bezárása
      setAddToProjectOpen(false);
      setSelectedWorker(null);
      setSelectedProjectId("");
      setSelectedStatusId("");
      setSelectedTrialId("");
      setSelectedTrialPositionId("");
      setSelectedPositionIds([]);
      setProjectTrials([]);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };
  
  // ÚJ: Projekt kiválasztásakor lekérjük a próbáit
  const handleProjectSelect = async (projectId) => {
    setSelectedProjectId(projectId);
    setSelectedTrialId("");
    setSelectedTrialPositionId("");
    setSelectedPositionIds([]); // Reset position selection
    
    if (projectId) {
      try {
        // Load trials
        const trialsRes = await axios.get(`${API}/projects/${projectId}/trials`);
        setProjectTrials(trialsRes.data || []);
        
        // Load PROJECT positions (not global positions!)
        const positionsRes = await axios.get(`${API}/projects/${projectId}/positions`);
        setProjectPositions(positionsRes.data || []);
      } catch (e) {
        console.error("Failed to load project data:", e);
        setProjectTrials([]);
        setProjectPositions([]);
      }
    } else {
      setProjectTrials([]);
      setProjectPositions([]);
    }
  };

  const handleExportExcel = async () => {
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
      toast.error("Hiba");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("");
    setTagFilter("");
    setOwnerFilter("");
    setCountyFilter("");
    setPositionFilter("");
    setWorkTypeFilter("");
    setHasCarFilter("");
    setGlobalStatusFilter("");
    setPropertyFilter("");
    setGenderFilter("");  // ÚJ
    setDateFrom("");
    setDateTo("");
    setLocationEnabled(false);
    setCenterLat(null);
    setCenterLon(null);
    setLocationSearch("");
    setFilterProjectId("");
    setProjectStatusFilter("");
  };

  const hasFilters = search || typeFilter || tagFilter || ownerFilter || 
                     countyFilter || positionFilter || workTypeFilter || hasCarFilter || 
                     globalStatusFilter || propertyFilter || dateFrom || dateTo || locationEnabled ||
                     filterProjectId || projectStatusFilter;

  const hasAdvancedFilters = countyFilter || positionFilter || workTypeFilter || hasCarFilter || 
                             globalStatusFilter || genderFilter || dateFrom || dateTo || locationEnabled ||
                             filterProjectId || projectStatusFilter;

  const handleLocationSearch = async () => {
    if (!locationSearch.trim()) return;
    setGeocoding(true);
    try {
      const res = await axios.post(`${API}/geocode`, { address: locationSearch });
      if (res.data.latitude && res.data.longitude) {
        setCenterLat(res.data.latitude);
        setCenterLon(res.data.longitude);
        setLocationEnabled(true);
        toast.success(`Találat: ${res.data.display_name || locationSearch}`);
      } else {
        toast.error("Nem található a cím");
      }
    } catch (e) {
      toast.error("Hiba a keresésben");
    } finally {
      setGeocoding(false);
    }
  };

  const handleMapSearchInDialog = async () => {
    if (!locationSearch.trim()) return;
    setGeocoding(true);
    try {
      const res = await axios.post(`${API}/geocode`, { address: locationSearch });
      if (res.data.latitude && res.data.longitude) {
        setMapSearchResults([{
          display_name: res.data.display_name || locationSearch,
          lat: res.data.latitude,
          lon: res.data.longitude
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

  const selectLocationFromMapDialog = (location) => {
    setCenterLat(parseFloat(location.lat));
    setCenterLon(parseFloat(location.lon));
    setLocationEnabled(true);
    setMapDialogOpen(false);
    setMapSearchResults([]);
    toast.success(`Szűrés beállítva: ${location.display_name}`);
  };

  const handleBulkGeocode = async () => {
    if (!window.confirm(`${geocodeStats?.not_geocoded || 0} dolgozó címét geocodoljuk? Ez eltarthat egy ideig.`)) return;
    try {
      const res = await axios.post(`${API}/workers/bulk-geocode`);
      setBulkGeocodeJob(res.data);
      toast.success(`Geocodolás elindítva: ${res.data.total} dolgozó`);
      
      // Poll for status
      const pollStatus = async () => {
        try {
          const statusRes = await axios.get(`${API}/workers/geocode-status/${res.data.job_id}`);
          setBulkGeocodeJob(statusRes.data);
          if (statusRes.data.status === "running") {
            setTimeout(pollStatus, 3000);
          } else {
            fetchGeocodeStats();
            fetchData();
            
            // Ha voltak sikertelen geocodolások, kérdezzük meg manuális megadásról
            if (statusRes.data.failed > 0) {
              const shouldManual = window.confirm(
                `Geocodolás kész!\n\n✅ Sikeres: ${statusRes.data.success}\n❌ Sikertelen: ${statusRes.data.failed}\n\nSzeretnéd manuálisan megadni a sikertelen címeket?`
              );
              if (shouldManual) {
                openManualGeocodeDialog();
              }
            } else {
              toast.success(`Kész! ${statusRes.data.success} sikeres`);
            }
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
      };
      setTimeout(pollStatus, 3000);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };

  // Manuális geocodolás - üres/sikertelen címekhez
  const openManualGeocodeDialog = async () => {
    try {
      const res = await axios.get(`${API}/workers/no-address`);
      setWorkersWithoutAddress(res.data.workers || []);
      setManualAddresses({});
      setManualGeocodeDialog(true);
    } catch (e) {
      toast.error("Hiba a lista lekérésekor");
    }
  };

  const handleSaveManualAddresses = async () => {
    setSavingManualGeocode(true);
    let success = 0;
    let failed = 0;
    
    for (const [workerId, address] of Object.entries(manualAddresses)) {
      if (!address?.trim()) continue;
      try {
        await axios.put(`${API}/workers/${workerId}`, { address: address.trim() });
        success++;
      } catch (e) {
        failed++;
      }
    }
    
    setSavingManualGeocode(false);
    setManualGeocodeDialog(false);
    toast.success(`${success} cím mentve${failed > 0 ? `, ${failed} sikertelen` : ""}`);
    fetchGeocodeStats();
    fetchData();
  };

  const skipManualGeocode = () => {
    setManualGeocodeDialog(false);
    toast.info("Lakóhely nélküli dolgozók a CRM-ben maradnak");
  };

  if (loading && workers.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dolgozók</h1>
          <p className="text-muted-foreground text-sm">{workers.length} {hasFilters ? "(szűrve)" : "összesen"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel} data-testid="export-excel-btn">
            <FileSpreadsheet className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => navigate("/workers/new")} className="bg-primary hover:bg-primary/90" data-testid="add-worker-btn">
            <Plus className="w-4 h-4 mr-1" />Új
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-3 space-y-3">
        {/* Row 1: Basic filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Keresés..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9" data-testid="search-input" />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-[130px] h-9" data-testid="type-filter"><SelectValue placeholder="Típus" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Mindegy</SelectItem>
              {workerTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={globalStatusFilter} onValueChange={(v) => setGlobalStatusFilter(v === "_all" ? "" : v)}>
            <SelectTrigger className="w-[180px] h-9" data-testid="status-filter">
              <SelectValue placeholder="Státusz" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">Minden státusz</SelectItem>
              <SelectItem value="Feldolgozatlan">⚪ Feldolgozatlan</SelectItem>
              <SelectItem value="Próbára vár">🟠 Próbára vár</SelectItem>
              <SelectItem value="Próba megbeszélve">🟣 Próba megbeszélve</SelectItem>
              <SelectItem value="Dolgozik">🟢 Dolgozik</SelectItem>
              <SelectItem value="Tiltólista">🔴 Tiltólista</SelectItem>
            </SelectContent>
          </Select>
          {/* Toborzó szűrő - csak admin látja, mert a toborzó csak a saját dolgozóit látja */}
          {user?.role === "admin" && (
            <Select value={ownerFilter} onValueChange={(v) => setOwnerFilter(v === "_all" ? "" : v)}>
              <SelectTrigger className="w-[130px] h-9" data-testid="owner-filter"><SelectValue placeholder="Toborzó" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">Mindegy</SelectItem>
                {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name || u.email}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Button 
            variant={advancedOpen || hasAdvancedFilters ? "default" : "outline"} 
            size="sm" 
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className={hasAdvancedFilters ? "bg-primary" : ""}
          >
            <Filter className="w-4 h-4 mr-1" />
            Részletes
            {advancedOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X className="w-4 h-4" /></Button>}
        </div>

        {/* Advanced filters (collapsible) */}
        <Collapsible open={advancedOpen}>
          <CollapsibleContent className="pt-3 border-t border-border space-y-3">
            {/* Row 1: Project status filters */}
            <div className="flex flex-wrap items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-1 text-sm font-medium text-blue-700 dark:text-blue-300">
                <Briefcase className="w-4 h-4" />
                <span>Projekt szűrő:</span>
              </div>
              <Select value={filterProjectId} onValueChange={(v) => {
                setFilterProjectId(v === "_all" ? "" : v);
                if (v === "_all") setProjectStatusFilter("");
              }}>
                <SelectTrigger className="w-[180px] h-9" data-testid="project-filter">
                  <SelectValue placeholder="Projekt..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Összes projekt</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              
              <Select value={projectStatusFilter} onValueChange={(v) => setProjectStatusFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="w-[160px] h-9" data-testid="project-status-filter">
                  <SelectValue placeholder="Projekt státusz..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Minden státusz</SelectItem>
                  {statuses.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              
              {(filterProjectId || projectStatusFilter) && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  {filterProjectId && projectStatusFilter 
                    ? `${projects.find(p => p.id === filterProjectId)?.name || 'Projekt'}: ${projectStatusFilter}`
                    : filterProjectId 
                      ? projects.find(p => p.id === filterProjectId)?.name
                      : projectStatusFilter
                  }
                </Badge>
              )}
            </div>
            
            {/* Row 2: Advanced filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={countyFilter} onValueChange={(v) => setCountyFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="w-[140px] h-9" data-testid="county-filter">
                  <SelectValue placeholder="Megye" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Mindegy</SelectItem>
                  {counties.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              <Input 
                placeholder="Pozíció..." 
                value={positionFilter} 
                onChange={(e) => setPositionFilter(e.target.value)} 
                className="w-[130px] h-9" 
                data-testid="position-filter" 
              />

              <Select value={workTypeFilter} onValueChange={(v) => setWorkTypeFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="w-[130px] h-9" data-testid="work-type-filter">
                  <SelectValue placeholder="Munka típus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Mindegy</SelectItem>
                  <SelectItem value="Ingázó">Ingázó</SelectItem>
                  <SelectItem value="Szállásos">Szállásos</SelectItem>
                </SelectContent>
              </Select>

              <Select value={hasCarFilter} onValueChange={(v) => setHasCarFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="w-[120px] h-9" data-testid="has-car-filter">
                  <SelectValue placeholder="Saját autó" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Mindegy</SelectItem>
                  <SelectItem value="Van">Van autó</SelectItem>
                  <SelectItem value="Nincs">Nincs autó</SelectItem>
                </SelectContent>
              </Select>

              <Select value={genderFilter} onValueChange={(v) => setGenderFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="w-[110px] h-9" data-testid="gender-filter">
                  <SelectValue placeholder="Nem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Mindegy</SelectItem>
                  <SelectItem value="férfi">👨 Férfi</SelectItem>
                  <SelectItem value="nő">👩 Nő</SelectItem>
                </SelectContent>
              </Select>

              <Select value={propertyFilter} onValueChange={(v) => setPropertyFilter(v === "_all" ? "" : v)}>
                <SelectTrigger className="w-[150px] h-9" data-testid="property-filter">
                  <SelectValue placeholder="Tulajdonság" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">Minden tulajdonság</SelectItem>
                  {availableProperties.map(prop => (
                    <SelectItem key={prop.id} value={prop.id}>#{prop.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Row 3: Date filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Felvétel dátuma:</span>
              </div>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)} 
                className="w-[140px] h-9" 
                data-testid="date-from"
              />
              <span className="text-muted-foreground">-</span>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)} 
                className="w-[140px] h-9" 
                data-testid="date-to"
              />
            </div>

            {/* Row 4: Location filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>Hely szűrés:</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Input 
                  placeholder="Város/cím..." 
                  value={locationSearch} 
                  onChange={(e) => setLocationSearch(e.target.value)} 
                  className="w-[180px] h-9" 
                  onKeyDown={(e) => e.key === "Enter" && handleLocationSearch()}
                  data-testid="location-search"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLocationSearch} 
                  disabled={geocoding || !locationSearch.trim()}
                  className="h-9"
                  title="Keresés"
                >
                  {geocoding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setMapDialogOpen(true)}
                  className="h-9"
                  title="Térkép megnyitása"
                  data-testid="open-map-filter-btn"
                >
                  <MapPin className="w-4 h-4 text-primary" />
                </Button>
              </div>

              {locationEnabled && centerLat && (
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-lg">
                  <span className="text-sm text-primary font-medium">{radiusKm} km</span>
                  <Slider
                    value={[radiusKm]}
                    onValueChange={([val]) => setRadiusKm(val)}
                    min={5}
                    max={100}
                    step={5}
                    className="w-[100px]"
                  />
                  <Button variant="ghost" size="sm" onClick={() => { setLocationEnabled(false); setCenterLat(null); setCenterLon(null); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Geocode status bar */}
        {user?.role === "admin" && geocodeStats && (
          <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Geocodolt: {geocodeStats.geocoded}/{geocodeStats.total}</span>
              {geocodeStats.not_geocoded > 0 && (
                <span className="text-amber-500">{geocodeStats.not_geocoded} feldolgozatlan</span>
              )}
              {geocodeStats.no_address > 0 && (
                <span className="text-red-500">{geocodeStats.no_address} lakóhely nélkül</span>
              )}
            </div>
            <div className="flex gap-2">
              {geocodeStats.no_address > 0 && (
                <Button variant="outline" size="sm" onClick={openManualGeocodeDialog}>
                  <Edit2 className="w-3 h-3 mr-1" />Manuális
                </Button>
              )}
              {geocodeStats.not_geocoded > 0 && (
                <Button variant="outline" size="sm" onClick={handleBulkGeocode} disabled={bulkGeocodeJob?.status === "running"}>
                  {bulkGeocodeJob?.status === "running" ? (
                    <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />{bulkGeocodeJob.processed}/{bulkGeocodeJob.total}</>
                  ) : (
                    <><MapPin className="w-3 h-3 mr-1" />Címek feldolgozása</>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 border-border">
                <TableHead className="font-semibold text-foreground">Név</TableHead>
                <TableHead className="font-semibold text-foreground">Telefon</TableHead>
                <TableHead className="font-semibold text-foreground hidden sm:table-cell">Pozíció</TableHead>
                <TableHead className="font-semibold text-foreground hidden md:table-cell">Lakóhely</TableHead>
                <TableHead className="font-semibold text-foreground hidden lg:table-cell">Státusz</TableHead>
                <TableHead className="font-semibold text-foreground hidden md:table-cell">Tulajdonságok</TableHead>
                {locationEnabled && <TableHead className="font-semibold text-foreground">Távolság</TableHead>}
                <TableHead className="font-semibold text-foreground hidden xl:table-cell">Munka/Autó</TableHead>
                {user?.role === "admin" && <TableHead className="font-semibold text-foreground hidden xl:table-cell">Toborzó</TableHead>}
                <TableHead className="font-semibold text-foreground hidden lg:table-cell">Felvétel</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workers.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="text-center py-8 text-muted-foreground">Nincs találat</TableCell></TableRow>
              ) : (
                workers.map((w) => (
                  <TableRow key={w.id} className="hover:bg-muted/50 cursor-pointer border-border" onClick={() => navigate(`/workers/${w.id}`)} data-testid={`worker-row-${w.id}`}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                          {w.name.charAt(0)}
                        </div>
                        <span className="truncate max-w-[120px]">{w.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <a href={`tel:${w.phone}`} onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-primary flex items-center gap-1 whitespace-nowrap">
                        <Phone className="w-3 h-3 shrink-0" /><span className="text-sm">{w.phone}</span>
                      </a>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-foreground">
                      {w.position && <span className="text-sm">{w.position}</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {w.address ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">{w.address}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Nincs megadva</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {/* Globális státusz VAGY Projekt + státusz */}
                      {(() => {
                        // Ha van aktív projekt státusz (nem Feldolgozatlan)
                        const activeProjectStatus = w.project_statuses?.find(ps => 
                          ps.status_name && ps.status_name !== "Kuka"
                        );
                        
                        if (activeProjectStatus) {
                          // Projekt név + státusz
                          const statusColors = {
                            "Feldolgozatlan": "#9CA3AF",
                            "Próbára vár": "#F97316",
                            "Próba megbeszélve": "#8B5CF6",
                            "Dolgozik": "#10B981",
                            "Tiltólista": "#EF4444"
                          };
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/projects/${activeProjectStatus.project_id}`);
                              }}
                              className="text-left hover:underline"
                            >
                              <Badge 
                                className="text-xs border-0 text-white cursor-pointer" 
                                style={{ backgroundColor: statusColors[activeProjectStatus.status_name] || "#6B7280" }}
                              >
                                {activeProjectStatus.project_name}: {activeProjectStatus.status_name}
                              </Badge>
                            </button>
                          );
                        }
                        
                        // Alapértelmezett globális státusz
                        // Egységes státuszok: Feldolgozatlan, Próbára vár, Próba megbeszélve, Dolgozik, Tiltólista
                        const globalColors = {
                          "Feldolgozatlan": "#9CA3AF",
                          "Próbára vár": "#F97316",
                          "Próba megbeszélve": "#8B5CF6",
                          "Dolgozik": "#10B981",
                          "Tiltólista": "#EF4444"
                        };
                        return (
                          <Badge 
                            className="text-xs border-0 text-white" 
                            style={{ backgroundColor: globalColors[w.global_status] || "#9CA3AF" }}
                          >
                            {w.global_status === "Feldolgozatlan" && "⚪ "}
                            {w.global_status === "Próbára vár" && "🟠 "}
                            {w.global_status === "Próba megbeszélve" && "🟣 "}
                            {w.global_status === "Dolgozik" && "🟢 "}
                            {w.global_status === "Tiltólista" && "🔴 "}
                            {w.global_status || "Feldolgozatlan"}
                          </Badge>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {/* Tulajdonságok */}
                      <div className="flex flex-wrap gap-1">
                        {w.properties?.map(propId => {
                          const prop = availableProperties.find(p => p.id === propId);
                          if (!prop) return null;
                          return (
                            <span key={propId} className={`text-[10px] px-1.5 py-0.5 rounded-full text-white ${prop.color}`}>
                              #{prop.label}
                            </span>
                          );
                        })}
                        {(!w.properties || w.properties.length === 0) && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                    {locationEnabled && (
                      <TableCell>
                        {w.distance_km !== null && w.distance_km !== undefined ? (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                            <MapPin className="w-3 h-3 mr-1" />
                            {w.distance_km} km
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="hidden xl:table-cell">
                      <div className="flex flex-col gap-0.5">
                        {w.work_type && (
                          <Badge variant="outline" className="text-xs w-fit">
                            <Briefcase className="w-3 h-3 mr-1" />
                            {w.work_type}
                          </Badge>
                        )}
                        {w.has_car && (
                          <Badge variant="outline" className={`text-xs w-fit ${w.has_car === 'Van' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                            <Car className="w-3 h-3 mr-1" />
                            {w.has_car}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {user?.role === "admin" && (
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex items-center gap-1.5" title={w.owner_name}>
                          <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-[10px] font-medium text-primary shrink-0">
                            {w.owner_name?.charAt(0) || "?"}
                          </div>
                          <span className="text-xs text-foreground truncate max-w-[100px]">{w.owner_name}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {w.created_at ? new Date(w.created_at).toLocaleDateString('hu-HU') : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/workers/${w.id}`)} data-testid={`view-worker-${w.id}`}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedWorker(w); setAddToProjectOpen(true); }} data-testid={`add-to-project-${w.id}`}>
                          <FolderPlus className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/workers/${w.id}/edit`)} data-testid={`edit-worker-${w.id}`}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        {user?.role === "admin" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={(e) => handleDelete(w.id, e)} data-testid={`delete-worker-${w.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={addToProjectOpen} onOpenChange={setAddToProjectOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Projekthez adás</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Dolgozó neve */}
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="font-medium text-foreground">{selectedWorker?.name}</p>
              <p className="text-sm text-muted-foreground">{selectedWorker?.phone}</p>
            </div>
            
            {/* 1. Projekt kiválasztás */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Projekt *</label>
              <Select value={selectedProjectId} onValueChange={handleProjectSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz projektet..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} - {new Date(p.date).toLocaleDateString('hu-HU')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* 2. Státusz kiválasztás */}
            {selectedProjectId && (
              <div className="space-y-2 border-t pt-4">
                <label className="text-sm font-medium">Státusz *</label>
                <Select value={selectedStatusId} onValueChange={setSelectedStatusId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz státuszt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* 2.5 Pozíció választás - KÖTELEZŐ bizonyos státuszoknál */}
            {selectedStatusId && (
              <div className="space-y-2 border-t pt-4">
                <label className="text-sm font-medium">
                  Pozíció(k) 
                  {["Próbára vár", "Dolgozik", "Próba megbeszélve"].includes(
                    statuses?.find(s => s.id === selectedStatusId)?.name
                  ) && <span className="text-red-500">*</span>}
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded">
                  {projectPositions && projectPositions.length > 0 ? (
                    projectPositions.map(pos => (
                      <div 
                        key={pos.id}
                        className={`p-2 border rounded cursor-pointer transition-all ${
                          selectedPositionIds.includes(pos.id)
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedPositionIds(prev => 
                            prev.includes(pos.id) 
                              ? prev.filter(id => id !== pos.id)
                              : [...prev, pos.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                            selectedPositionIds.includes(pos.id) 
                              ? 'border-blue-500 bg-blue-500' 
                              : 'border-gray-300'
                          }`}>
                            {selectedPositionIds.includes(pos.id) && (
                              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className="font-medium text-sm">{pos.name || pos.position_name || 'Nincs név'}</span>
                          {pos.headcount && (
                            <span className="text-xs text-muted-foreground">({pos.headcount} fő)</span>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4 text-sm">Nincs pozíció a projekthez rendelve</p>
                  )}
                </div>
                {selectedPositionIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPositionIds.length} pozíció kiválasztva
                  </p>
                )}
              </div>
            )}
            
            {/* 3. Ha "Próba megbeszélve", akkor próba választó */}
            {selectedStatusId && statuses?.find(s => s.id === selectedStatusId)?.name === "Próba megbeszélve" && (
              <div className="space-y-2 border-t pt-4">
                <label className="text-sm font-medium">Próba *</label>
                {projectTrials && projectTrials.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {projectTrials.map(trial => (
                      <div 
                        key={trial.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-all ${
                          selectedTrialId === trial.id 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          setSelectedTrialId(trial.id);
                          setSelectedTrialPositionId(""); // Reset position
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-foreground">
                              {trial.notes || "Próba"} 
                            </span>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(trial.date).toLocaleDateString('hu-HU')}
                              {trial.time && <span>({trial.time})</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">Nincs próba létrehozva ehhez a projekthez</p>
                )}
              </div>
            )}
            
            {/* 4. Pozíció kiválasztás (ha van próba és pozíciók) */}
            {selectedTrialId && projectTrials?.find(t => t.id === selectedTrialId)?.positions?.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <label className="text-sm font-medium">Pozíció (opcionális)</label>
                <div className="space-y-2">
                  {projectTrials.find(t => t.id === selectedTrialId).positions.map(pos => (
                    <div 
                      key={pos.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedTrialPositionId === pos.id 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedTrialPositionId(selectedTrialPositionId === pos.id ? "" : pos.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-foreground">{pos.position_name}</span>
                          {pos.hourly_rate && (
                            <span className="text-sm text-green-600 ml-2">
                              {pos.hourly_rate} Ft/óra
                            </span>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {pos.assigned_count || 0}/{pos.headcount} fő
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => {
              setAddToProjectOpen(false);
              setSelectedWorker(null);
              setSelectedProjectId("");
              setSelectedStatusId("");
              setSelectedTrialId("");
              setSelectedTrialPositionId("");
              setProjectTrials([]);
            }}>
              Mégse
            </Button>
            <Button 
              size="sm" 
              onClick={handleAddToProject} 
              disabled={!selectedProjectId || !selectedStatusId || (statuses?.find(s => s.id === selectedStatusId)?.name === "Próba megbeszélve" && !selectedTrialId)}
              className="bg-primary"
            >
              Projekthez adás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Map Dialog for location filter */}
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
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                placeholder="Keress címre, városra..."
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleMapSearchInDialog();
                  }
                }}
              />
              <Button onClick={handleMapSearchInDialog} disabled={geocoding}>
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
                    onClick={() => selectLocationFromMapDialog(loc)}
                  >
                    <p className="font-medium text-sm">{loc.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {loc.lat.toFixed(4)}, {loc.lon.toFixed(4)}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Map preview */}
            {centerLat && centerLon && locationEnabled && (
              <div className="mt-4">
                <p className="text-sm mb-2 text-muted-foreground">Kiválasztott terület ({radiusKm} km sugarú):</p>
                <iframe
                  title="map"
                  width="100%"
                  height="200"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${centerLon - 0.1}%2C${centerLat - 0.1}%2C${centerLon + 0.1}%2C${centerLat + 0.1}&layer=mapnik&marker=${centerLat}%2C${centerLon}`}
                  className="rounded-lg border"
                ></iframe>
              </div>
            )}

            {mapSearchResults.length === 0 && !geocoding && !locationEnabled && (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Keress rá egy címre vagy városra a szűréshez</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Geocode Dialog - lakóhely nélküli dolgozók */}
      <Dialog open={manualGeocodeDialog} onOpenChange={setManualGeocodeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-500" />
              Lakóhely nélküli dolgozók
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A következő dolgozóknak nincs megadva lakóhely. Írd be a címüket sorban, vagy hagyd üresen ha nem tudod.
            </p>
            
            {workersWithoutAddress.length === 0 ? (
              <p className="text-center py-4 text-green-600">Minden dolgozónak van megadva lakóhely!</p>
            ) : (
              <div className="space-y-3">
                {workersWithoutAddress.map((w) => (
                  <div key={w.id} className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{w.name}</p>
                      <p className="text-xs text-muted-foreground">{w.phone}</p>
                    </div>
                    <Input
                      value={manualAddresses[w.id] || ""}
                      onChange={(e) => setManualAddresses({...manualAddresses, [w.id]: e.target.value})}
                      placeholder="Lakóhely címe..."
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={skipManualGeocode}>
              Kihagyás (lakóhely nélkül marad)
            </Button>
            <Button 
              onClick={handleSaveManualAddresses} 
              disabled={savingManualGeocode || Object.keys(manualAddresses).length === 0}
              className="bg-primary"
            >
              {savingManualGeocode ? "Mentés..." : "Címek mentése"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
