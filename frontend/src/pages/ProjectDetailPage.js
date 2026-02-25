import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import FormSettingsDialog from "@/components/FormSettingsDialog";
import FormLeadsTab from "@/components/FormLeadsTab";
import FormShareDialog from "@/components/FormShareDialog";
import DuplicateResolutionModal from "@/components/DuplicateResolutionModal";
import {
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors,
  DragOverlay,
  useDroppable,
  useDraggable
} from '@dnd-kit/core';
import {
  ArrowLeft, Edit2, Calendar, MapPin, Users, Plus, X, Phone,
  Lock, Unlock, Target, UserPlus, MessageSquare, Save,
  Building2, GraduationCap, Briefcase, Clock, Award, Dumbbell,
  ClipboardList, TestTube, Trash2, BarChart3, TrendingUp, Copy, CheckCircle,
  GripVertical, ArrowRight, Ban
} from "lucide-react";

// Draggable Worker Card Component
const DraggableWorkerCard = ({ worker, onKuka, onOpenNotes, onEdit }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: worker.id,
    data: { worker }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 bg-card border border-border rounded-lg mb-2 ${isDragging ? 'opacity-50 shadow-lg' : 'hover:border-primary/50'} transition-all`}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      {/* Worker info */}
      <div className="flex-1 min-w-0">
        <Link to={`/workers/${worker.id}`} className="font-medium text-sm hover:text-primary truncate block">
          {worker.name}
        </Link>
        {worker.position_names && worker.position_names.length > 0 && (
          <div className="text-xs text-blue-600 dark:text-blue-400 truncate">
            {worker.position_names.join(", ")}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <a href={`tel:${worker.phone}`} className="flex items-center gap-1 hover:text-primary">
            <Phone className="w-3 h-3" />{worker.phone}
          </a>
          {worker.from_form && <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1">Űrlap</Badge>}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(worker)} title="Szerkesztés">
          <Edit2 className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenNotes(worker)}>
          <MessageSquare className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => onKuka(worker)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
};

// Droppable Pipeline Column Component
const PipelineColumn = ({ 
  title, 
  statusName, 
  workers, 
  color, 
  icon: Icon, 
  onKuka, 
  onOpenNotes,
  onEdit,
  isOver
}) => {
  const { setNodeRef } = useDroppable({
    id: statusName,
    data: { statusName }
  });

  const filteredWorkers = workers?.filter(w => 
    statusName === "Feldolgozatlan" 
      ? (w.status_name === statusName || !w.status_name)
      : w.status_name === statusName
  ) || [];

  return (
    <div 
      ref={setNodeRef}
      className={`flex-1 min-w-[260px] md:min-w-[280px] transition-all ${isOver ? 'ring-2 ring-primary ring-offset-2 scale-[1.02]' : ''}`}
    >
      <div className={`rounded-t-lg p-3 ${color}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4" />}
            <span className="font-semibold text-sm">{title}</span>
          </div>
          <Badge variant="secondary" className="bg-white/20">{filteredWorkers.length}</Badge>
        </div>
      </div>
      <div className={`bg-muted/30 rounded-b-lg p-2 min-h-[200px] max-h-[60vh] overflow-y-auto border-2 border-dashed ${isOver ? 'border-primary bg-primary/5' : 'border-transparent'}`}>
        {filteredWorkers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>Húzz ide dolgozót</p>
          </div>
        ) : (
          filteredWorkers.map(worker => (
            <DraggableWorkerCard
              key={worker.id}
              worker={worker}
              onKuka={onKuka}
              onOpenNotes={onOpenNotes}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  );
};

const getStatusColor = (statusName) => {
  const negativeStatuses = ["Nem jelent meg", "Nem felelt meg", "Lemondta"];
  const positiveStatuses = ["Megfelelt", "Dolgozik", "Megerősítve"];
  
  if (negativeStatuses.includes(statusName)) return "bg-red-500/20 text-red-600 dark:text-red-400";
  if (positiveStatuses.includes(statusName)) return "bg-green-500/20 text-green-600 dark:text-green-400";
  return "bg-muted text-muted-foreground";
};

export default function ProjectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [workerSearchQuery, setWorkerSearchQuery] = useState("");  // ÚJ: keresés
  const [selectedPositionIds, setSelectedPositionIds] = useState([]);  // ÚJ: többszörös pozíció választás
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddRecruiter, setShowAddRecruiter] = useState(false);
  const [addWorkerStatus, setAddWorkerStatus] = useState("Próbára vár");  // Projekten belül nincs Feldolgozatlan
  
  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Drag & Drop state
  const [activeId, setActiveId] = useState(null);
  const [dropTargetStatus, setDropTargetStatus] = useState(null);
  
  // DnD sensors - touch support for mobile
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 5 }
    }),
    useSensor(KeyboardSensor)
  );
  
  // Position dialog
  const [positionDialog, setPositionDialog] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [positionForm, setPositionForm] = useState({
    name: "", headcount: 1, work_schedule: "", experience_required: "",
    qualifications: "", physical_requirements: "", position_details: "", notes: "",
    salary: "" // Bérezés mező
  });
  
  // Trial dialog
  const [trialDialog, setTrialDialog] = useState(false);
  const [editingTrial, setEditingTrial] = useState(null);
  const [trialForm, setTrialForm] = useState({ date: "", time: "", notes: "" });
  
  // Add worker to trial dialog
  const [addToTrialDialog, setAddToTrialDialog] = useState(false);
  const [selectedTrialId, setSelectedTrialId] = useState(null);
  const [selectedTrialPositionId, setSelectedTrialPositionId] = useState("");
  
  // Trial position dialog
  const [trialPositionDialog, setTrialPositionDialog] = useState(false);
  const [editingTrialPosition, setEditingTrialPosition] = useState(null);
  const [trialPositionForm, setTrialPositionForm] = useState({
    position_name: "",
    headcount: 1,
    hourly_rate: "",
    accommodation: false,
    requirements: "",
    add_to_project: false
  });
  const [selectedTrialForPosition, setSelectedTrialForPosition] = useState(null);
  
  // Status change dialog
  const [statusDialog, setStatusDialog] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  
  // Edit worker in project dialog
  const [editWorkerDialog, setEditWorkerDialog] = useState(false);
  const [editingProjectWorker, setEditingProjectWorker] = useState(null);
  const [editWorkerForm, setEditWorkerForm] = useState({
    phone: "",
    position_ids: []
  });
  
  // Waitlist
  const [waitlist, setWaitlist] = useState([]);
  const [waitlistDialog, setWaitlistDialog] = useState(false);
  const [waitlistWorkerSelect, setWaitlistWorkerSelect] = useState("");
  const [waitlistStartDate, setWaitlistStartDate] = useState("");
  
  // New worker inline form
  const [newWorkerName, setNewWorkerName] = useState("");
  const [newWorkerPhone, setNewWorkerPhone] = useState("");
  
  // Kuka & Summary
  const [archivedWorkers, setArchivedWorkers] = useState([]);
  const [projectSummary, setProjectSummary] = useState(null);
  
  // Kuka dialog - dolgozó kukába rakása indokkal
  const [kukaDialog, setKukaDialog] = useState(false);
  const [kukaWorker, setKukaWorker] = useState(null);
  const [kukaReason, setKukaReason] = useState("");
  const [kukaCustomReason, setKukaCustomReason] = useState("");
  
  // Próba kiválasztó dialog (Próba megbeszélve státuszhoz)
  const [selectTrialDialog, setSelectTrialDialog] = useState(false);
  const [selectTrialWorkerId, setSelectTrialWorkerId] = useState(null);
  const [selectedTrialForStatus, setSelectedTrialForStatus] = useState("");
  
  // Fix kuka indokok
  const KUKA_REASONS = [
    "Nem jelent meg",
    "Megbízhatatlan", 
    "Nem elérhető",
    "Nem alkalmas",
    "Nem érdekli",
    "Felmondott",
    "Egyéb"
  ];
  
  // Mobile resize listener
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Copy trial workers dialog
  const [copyDialog, setCopyDialog] = useState(false);
  const [selectedTrial, setSelectedTrial] = useState(null);
  const [copyFields, setCopyFields] = useState({
    name: true,
    position: true,
    phone: true,
    email: false,
    notes: false
  });
  
  // Forms state
  const [forms, setForms] = useState([]);
  const [formLeads, setFormLeads] = useState([]);
  const [formDialog, setFormDialog] = useState(false);
  const [editingForm, setEditingForm] = useState(null);
  const [formShareDialog, setFormShareDialog] = useState(false);
  const [selectedForm, setSelectedForm] = useState(null);
  const [duplicateLeadDialog, setDuplicateLeadDialog] = useState(false);
  const [selectedDuplicateLead, setSelectedDuplicateLead] = useState(null);
  const [formsLoading, setFormsLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [projectRes, statusesRes, workersRes, waitlistRes, archiveRes, summaryRes, formsRes, formLeadsRes] = await Promise.all([
        axios.get(`${API}/projects/${id}`),
        axios.get(`${API}/statuses`),
        axios.get(`${API}/workers`),
        axios.get(`${API}/projects/${id}/waitlist`),
        axios.get(`${API}/projects/${id}/archive`).catch(() => ({ data: { workers: [] } })),
        axios.get(`${API}/projects/${id}/summary`).catch(() => ({ data: null })),
        axios.get(`${API}/projects/${id}/forms`).catch(() => ({ data: [] })),
        axios.get(`${API}/projects/${id}/form-leads`).catch(() => ({ data: [] }))
      ]);
      
      setProject(projectRes.data);
      setStatuses(statusesRes.data);
      setWaitlist(waitlistRes.data);
      setArchivedWorkers(archiveRes.data.workers || []);
      setProjectSummary(summaryRes.data);
      setForms(formsRes.data);
      setFormLeads(formLeadsRes.data);
      
      const projectWorkerIds = projectRes.data.workers.map(w => w.id);
      const waitlistWorkerIds = waitlistRes.data.map(w => w.worker_id);
      setAvailableWorkers(workersRes.data.filter(w => 
        !projectWorkerIds.includes(w.id) && !waitlistWorkerIds.includes(w.id)
      ));
      
      if (user?.role === "admin") {
        const usersRes = await axios.get(`${API}/users`);
        setAllUsers(usersRes.data.filter(u => u.role === "user"));
      }
    } catch (e) {
      toast.error("Projekt nem található");
      navigate("/projects");
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorker = async (workerId, forceAdd = false) => {
    try {
      await axios.post(`${API}/projects/${id}/workers`, { 
        worker_id: workerId,
        force_add: forceAdd
      });
      toast.success("Hozzáadva");
      fetchData();
    } catch (e) {
      // DUPLIKÁCIÓ FIGYELMEZTETÉS KEZELÉSE
      if (e.response?.status === 409 && e.response?.data?.detail?.type === "kuka_warning") {
        const warning = e.response.data.detail;
        const shouldAdd = window.confirm(
          `⚠️ FIGYELMEZTETÉS!\n\nEz a dolgozó már korábban ebben a projektben kukába került.\n\nIndok: ${warning.reason || "Nincs megadva"}\nDátum: ${warning.date ? new Date(warning.date).toLocaleDateString('hu-HU') : "Ismeretlen"}\n\nBiztosan hozzáadod?`
        );
        if (shouldAdd) {
          handleAddWorker(workerId, true);
        }
      } else {
        toast.error(e.response?.data?.detail || "Hiba");
      }
    }
  };

  // Dolgozó hozzáadása választott státusszal
  const handleAddWorkerWithStatus = async (workerId, forceAdd = false) => {
    // Validáció: kötelező pozíció választás
    if (selectedPositionIds.length === 0) {
      toast.error("Legalább 1 pozíciót kötelező választani!");
      return;
    }

    try {
      // Státusz ID lekérése
      const statusObj = statuses.find(s => s.name === addWorkerStatus);
      
      // Dolgozó hozzáadása pozíciókkal
      await axios.post(`${API}/projects/${id}/workers`, { 
        worker_id: workerId,
        status_id: statusObj?.id,
        position_ids: selectedPositionIds,  // Többszörös pozíció
        force_add: forceAdd
      });
      
      toast.success(`Hozzáadva: ${addWorkerStatus}`);
      setSelectedPositionIds([]);  // Reset pozíciók
      setWorkerSearchQuery("");  // Reset keresés
      fetchData();
    } catch (e) {
      if (e.response?.status === 409 && e.response?.data?.detail?.type === "kuka_warning") {
        const warning = e.response.data.detail;
        const shouldAdd = window.confirm(
          `⚠️ FIGYELMEZTETÉS!\n\nEz a dolgozó már korábban ebben a projektben kukába került.\n\nIndok: ${warning.reason || "Nincs megadva"}\nDátum: ${warning.date ? new Date(warning.date).toLocaleDateString('hu-HU') : "Ismeretlen"}\n\nBiztosan hozzáadod?`
        );
        if (shouldAdd) {
          handleAddWorkerWithStatus(workerId, true);
        }
      } else {
        toast.error(e.response?.data?.detail || "Hiba a hozzáadáskor");
      }
    }
  };

  const handleRemoveWorker = async (workerId) => {
    try {
      await axios.delete(`${API}/projects/${id}/workers/${workerId}`);
      toast.success("Eltávolítva");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  const openStatusDialog = (worker) => {
    setSelectedWorker(worker);
    setSelectedStatus(worker.status_id || "");
    setStatusNotes(worker.notes || "");
    setStatusDialog(true);
  };

  const handleSaveStatus = async () => {
    if (!selectedWorker || !selectedStatus) return;
    try {
      await axios.put(`${API}/projects/${id}/workers/${selectedWorker.id}/status`, { 
        status_id: selectedStatus,
        notes: statusNotes 
      });
      toast.success("Státusz mentve");
      setStatusDialog(false);
      setSelectedWorker(null);
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };
  
  // Waitlist handlers
  const handleAddToWaitlist = async () => {
    if (!waitlistWorkerSelect) return;
    try {
      await axios.post(`${API}/projects/${id}/waitlist`, {
        worker_id: waitlistWorkerSelect,
        trial_date: waitlistStartDate  // ÚJ: trial_date
      });
      toast.success("Dolgozó hozzáadva a várólistához");
      setWaitlistDialog(false);
      setWaitlistWorkerSelect("");
      setWaitlistStartDate("");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };
  
  const handleRemoveFromWaitlist = async (workerId) => {
    try {
      await axios.delete(`${API}/projects/${id}/waitlist/${workerId}`);
      toast.success("Eltávolítva a várólistáról");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };
  
  const handleMoveToProject = async (workerId) => {
    try {
      await axios.post(`${API}/projects/${id}/workers`, { worker_id: workerId });
      await axios.delete(`${API}/projects/${id}/waitlist/${workerId}`);
      toast.success("Dolgozó hozzáadva a projekthez");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };

  // DRAG & DROP KEZELŐK
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { over } = event;
    if (over) {
      // Az over.id most a statusName lesz (a PipelineColumn id-ja)
      setDropTargetStatus(over.id);
    } else {
      setDropTargetStatus(null);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setDropTargetStatus(null);
    
    if (!over) return;
    
    const draggedWorkerId = active.id;
    const targetStatusName = over.id; // Ez most a státusz neve (pl. "Próbára vár")
    
    // Ellenőrizzük, hogy érvényes státusz-e
    const validStatuses = ["Feldolgozatlan", "Próbára vár", "Próba megbeszélve", "Dolgozik", "Tiltólista"];
    if (!validStatuses.includes(targetStatusName)) return;
    
    const draggedWorker = project.workers?.find(w => w.id === draggedWorkerId);
    if (!draggedWorker) return;
    
    const currentStatus = draggedWorker.status_name || "Feldolgozatlan";
    if (currentStatus === targetStatusName) return; // Nincs változás
    
    // Apply status change with validation
    await handleStatusChangeWithValidation(draggedWorkerId, targetStatusName);
  };

  const getActiveWorker = () => {
    if (!activeId) return null;
    return project.workers?.find(w => w.id === activeId);
  };

  const handleQuickStatusChange = async (workerId, statusId) => {
    try {
      await axios.put(`${API}/projects/${id}/workers/${workerId}/status`, { status_id: statusId });
      toast.success("Mentve");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  // Státusz váltás validációval - név alapján
  const handleStatusChangeWithValidation = async (workerId, statusName, notes = "", trialId = null) => {
    const targetStatus = statuses.find(s => s.name === statusName);
    if (!targetStatus) {
      toast.error(`Státusz nem található: ${statusName}`);
      return;
    }
    
    // "Próba megbeszélve" esetén próba kiválasztása szükséges
    if (statusName === "Próba megbeszélve") {
      // Ha nincs próba a projektben, ne engedjük
      if (!project.trials || project.trials.length === 0) {
        toast.error("Nincs próba létrehozva! Először hozz létre egy próbát a 'Próbák' fülön.");
        return;
      }
      
      // Ha nincs trialId megadva, nyissuk meg a kiválasztó dialógust
      if (!trialId) {
        setSelectTrialWorkerId(workerId);
        setSelectedTrialForStatus("");
        setSelectTrialDialog(true);
        return;
      }
    }
    
    try {
      const requestBody = { 
        status_id: targetStatus.id,
        notes: notes
      };
      
      // Ha "Próba megbeszélve" és van trial_id, küldjük azt is
      if (statusName === "Próba megbeszélve" && trialId) {
        requestBody.trial_id = trialId;
      }
      
      await axios.put(`${API}/projects/${id}/workers/${workerId}/status`, requestBody);
      toast.success(`Státusz: ${statusName}`);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };
  
  // Próba kiválasztás után státusz frissítés
  const handleConfirmTrialSelection = async () => {
    if (!selectTrialWorkerId || !selectedTrialForStatus) {
      toast.error("Válassz ki egy próbát!");
      return;
    }
    
    setSelectTrialDialog(false);
    await handleStatusChangeWithValidation(selectTrialWorkerId, "Próba megbeszélve", "", selectedTrialForStatus);
    setSelectTrialWorkerId(null);
    setSelectedTrialForStatus("");
  };

  // Kuka - dolgozó kukába rakása indokkal
  // Edit worker in project - open dialog
  const openEditWorkerDialog = (worker) => {
    setEditingProjectWorker(worker);
    setEditWorkerForm({
      phone: worker.phone || "",
      position_ids: worker.position_ids || []
    });
    setEditWorkerDialog(true);
  };
  
  // Save edited worker
  const handleSaveEditedWorker = async () => {
    if (!editingProjectWorker) return;
    try {
      // Update worker phone
      await axios.put(`${API}/workers/${editingProjectWorker.id}`, {
        phone: editWorkerForm.phone
      });
      
      // Update project worker positions
      await axios.put(`${API}/projects/${id}/workers/${editingProjectWorker.id}/positions`, {
        position_ids: editWorkerForm.position_ids
      });
      
      toast.success("Dolgozó adatai frissítve");
      setEditWorkerDialog(false);
      setEditingProjectWorker(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a mentés során");
    }
  };

  const openKukaDialog = (worker) => {
    setKukaWorker(worker);
    setKukaReason("");
    setKukaCustomReason("");
    setKukaDialog(true);
  };

  const handleMoveToKuka = async () => {
    if (!kukaWorker) return;
    const reason = kukaReason === "Egyéb" ? kukaCustomReason : kukaReason;
    if (!reason.trim()) {
      toast.error("Add meg a kukába rakás indokát");
      return;
    }
    try {
      // Keressük meg a "Kuka" státuszt, vagy ha nincs, akkor a negatív státuszt
      const kukaStatus = statuses.find(s => s.name === "Kuka" || s.name === "Nem vették fel");
      if (kukaStatus) {
        await axios.put(`${API}/projects/${id}/workers/${kukaWorker.id}/status`, { 
          status_id: kukaStatus.id,
          notes: `Kuka indok: ${reason}`
        });
      }
      // Archíváljuk a dolgozót
      await axios.post(`${API}/projects/${id}/archive/${kukaWorker.id}`, { reason });
      toast.success("Dolgozó kukába helyezve");
      setKukaDialog(false);
      setKukaWorker(null);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };

  const handleToggleClosed = async () => {
    try {
      await axios.put(`${API}/projects/${id}`, { is_closed: !project.is_closed });
      toast.success(project.is_closed ? "Újranyitva" : "Lezárva");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  const handleAddRecruiter = async (userId) => {
    try {
      await axios.post(`${API}/projects/${id}/recruiters`, { user_id: userId });
      toast.success("Toborzó hozzárendelve");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  const handleRemoveRecruiter = async (userId) => {
    try {
      await axios.delete(`${API}/projects/${id}/recruiters/${userId}`);
      toast.success("Toborzó eltávolítva");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  // Position handlers
  const openPositionDialog = (position = null) => {
    if (position) {
      setEditingPosition(position);
      setPositionForm({
        name: position.name,
        headcount: position.headcount,
        work_schedule: position.work_schedule || position.shift_schedule || "",
        experience_required: position.experience_required || "",
        qualifications: position.qualifications || "",
        physical_requirements: position.physical_requirements || "",
        position_details: position.position_details || "",
        notes: position.notes || "",
        salary: position.salary || ""
      });
    } else {
      setEditingPosition(null);
      setPositionForm({
        name: "", headcount: 1, work_schedule: "", experience_required: "",
        qualifications: "", physical_requirements: "", position_details: "", notes: "",
        salary: ""
      });
    }
    setPositionDialog(true);
  };

  const handleSavePosition = async () => {
    if (!positionForm.name) {
      toast.error("Pozíció neve kötelező");
      return;
    }
    try {
      if (editingPosition) {
        await axios.put(`${API}/projects/${id}/positions/${editingPosition.id}`, positionForm);
        toast.success("Pozíció mentve");
      } else {
        await axios.post(`${API}/projects/${id}/positions`, positionForm);
        toast.success("Pozíció létrehozva");
      }
      setPositionDialog(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };

  const handleDeletePosition = async (positionId) => {
    if (!window.confirm("Biztosan törlöd ezt a pozíciót?")) return;
    try {
      await axios.delete(`${API}/projects/${id}/positions/${positionId}`);
      toast.success("Pozíció törölve");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  // Trial handlers
  const openTrialDialog = (trial = null) => {
    if (trial) {
      setEditingTrial(trial);
      setTrialForm({ date: trial.date, time: trial.time || "", notes: trial.notes || "" });
    } else {
      setEditingTrial(null);
      setTrialForm({ date: new Date().toISOString().split('T')[0], time: "09:00", notes: "" });
    }
    setTrialDialog(true);
  };

  const handleSaveTrial = async () => {
    if (!trialForm.date) {
      toast.error("Dátum kötelező");
      return;
    }
    try {
      if (editingTrial) {
        await axios.put(`${API}/projects/${id}/trials/${editingTrial.id}`, trialForm);
        toast.success("Próba mentve");
      } else {
        await axios.post(`${API}/projects/${id}/trials`, trialForm);
        toast.success("Próba létrehozva");
      }
      setTrialDialog(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };

  const handleDeleteTrial = async (trialId) => {
    if (!window.confirm("Biztosan törlöd ezt a próbát?")) return;
    try {
      await axios.delete(`${API}/projects/${id}/trials/${trialId}`);
      toast.success("Próba törölve");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };
  
  // Copy trial workers to clipboard
  const openCopyDialog = (trial) => {
    setSelectedTrial(trial);
    setCopyDialog(true);
  };
  
  const handleCopyTrialWorkers = () => {
    if (!selectedTrial || !selectedTrial.workers) return;
    
    // Fejléc: PROJEKT NÉV - PRÓBA dátum időpont
    const trialDate = selectedTrial.date ? new Date(selectedTrial.date).toLocaleDateString('hu-HU') : '';
    const trialTime = selectedTrial.time || '';
    const header = `${project?.client_name || project?.name || 'Projekt'} - PRÓBA ${trialDate}${trialTime ? '. ' + trialTime : ''}`;
    
    const lines = [header, '']; // Fejléc + üres sor
    
    selectedTrial.workers.forEach(worker => {
      const workerLines = [];
      
      // Worker adatok - trial workers-ben name és phone van
      const workerName = worker.name || worker.worker_name || '';
      const workerPhone = worker.phone || worker.worker_phone || '';
      const workerPosition = worker.position_name || worker.position || '';
      const workerEmail = worker.email || worker.worker_email || '';
      const workerNotes = worker.notes || '';
      
      if (copyFields.name && workerName) workerLines.push(workerName);
      if (copyFields.position && workerPosition) workerLines.push(workerPosition);
      if (copyFields.phone && workerPhone) workerLines.push(workerPhone);
      if (copyFields.email && workerEmail) workerLines.push(workerEmail);
      if (copyFields.notes && workerNotes) workerLines.push(workerNotes);
      
      lines.push(workerLines.join('\n'));
    });
    
    const textToCopy = lines.join('\n\n');
    
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast.success(`${selectedTrial.workers.length} dolgozó adatai vágólapra másolva!`);
      setCopyDialog(false);
    }).catch(() => {
      toast.error("Másolás sikertelen");
    });
  };

  const openAddToTrialDialog = (trialId, trialPositionId = "") => {
    setSelectedTrialId(trialId);
    setSelectedTrialPositionId(trialPositionId);
    setAddToTrialDialog(true);
  };

  const handleAddWorkerToTrial = async (workerId) => {
    try {
      await axios.post(`${API}/projects/${id}/trials/${selectedTrialId}/workers`, { 
        worker_id: workerId,
        position_id: selectedTrialPositionId  // trial_position_id
      });
      toast.success("Dolgozó hozzáadva a próbához");
      setAddToTrialDialog(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };

  const handleCreateAndAddWorkerToTrial = async () => {
    if (!newWorkerName.trim()) {
      toast.error("Add meg a dolgozó nevét");
      return;
    }
    try {
      // First, get a default worker type
      const typesRes = await axios.get(`${API}/worker-types`);
      const defaultType = typesRes.data[0];
      
      if (!defaultType) {
        toast.error("Nincs munkavállalói típus beállítva");
        return;
      }
      
      // Create the worker
      const workerRes = await axios.post(`${API}/workers`, {
        name: newWorkerName.trim(),
        phone: newWorkerPhone.trim(),
        worker_type_id: defaultType.id
      });
      
      const newWorkerId = workerRes.data.id;
      
      // Add to project
      await axios.post(`${API}/projects/${id}/workers`, { worker_id: newWorkerId });
      
      // Add to trial with position if selected
      await axios.post(`${API}/projects/${id}/trials/${selectedTrialId}/workers`, { 
        worker_id: newWorkerId,
        position_id: selectedTrialPositionId
      });
      
      toast.success("Dolgozó létrehozva és hozzáadva a próbához");
      setNewWorkerName("");
      setNewWorkerPhone("");
      setAddToTrialDialog(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a dolgozó létrehozásakor");
    }
  };

  const handleRemoveWorkerFromTrial = async (trialId, workerId) => {
    try {
      await axios.delete(`${API}/projects/${id}/trials/${trialId}/workers/${workerId}`);
      toast.success("Dolgozó eltávolítva");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  // Trial Position handlers
  const openTrialPositionDialog = (trial, position = null) => {
    setSelectedTrialForPosition(trial);
    if (position) {
      setEditingTrialPosition(position);
      setTrialPositionForm({
        position_name: position.position_name,
        headcount: position.headcount,
        hourly_rate: position.hourly_rate || "",
        accommodation: position.accommodation || false,
        requirements: position.requirements || "",
        add_to_project: false
      });
    } else {
      setEditingTrialPosition(null);
      setTrialPositionForm({
        position_name: "",
        headcount: 1,
        hourly_rate: "",
        accommodation: false,
        requirements: "",
        add_to_project: false
      });
    }
    setTrialPositionDialog(true);
  };

  const handleSaveTrialPosition = async () => {
    if (!trialPositionForm.position_name) {
      toast.error("Add meg a pozíció nevét");
      return;
    }
    try {
      if (editingTrialPosition) {
        await axios.put(
          `${API}/projects/${id}/trials/${selectedTrialForPosition.id}/positions/${editingTrialPosition.id}`,
          trialPositionForm
        );
        toast.success("Pozíció mentve");
      } else {
        await axios.post(
          `${API}/projects/${id}/trials/${selectedTrialForPosition.id}/positions`,
          trialPositionForm
        );
        toast.success("Pozíció hozzáadva");
        if (trialPositionForm.add_to_project) {
          toast.success("Pozíció a projekthez is hozzáadva");
        }
      }
      setTrialPositionDialog(false);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    }
  };

  const handleDeleteTrialPosition = async (trialId, positionId) => {
    if (!window.confirm("Biztosan törlöd ezt a pozíciót?")) return;
    try {
      await axios.delete(`${API}/projects/${id}/trials/${trialId}/positions/${positionId}`);
      toast.success("Pozíció törölve");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  const selectProjectPosition = (posName) => {
    setTrialPositionForm(prev => ({
      ...prev,
      position_name: posName,
      add_to_project: false  // Already exists
    }));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  if (!project) return null;

  const progressPercent = project.planned_headcount > 0 
    ? Math.min(Math.round(((project.active_worker_count || 0) / project.planned_headcount) * 100), 100) 
    : 0;
  const availableRecruiters = allUsers.filter(u => !project.recruiter_ids?.includes(u.id));
  
  // Szűrjük a "Dolgozik" státuszú dolgozókat
  const activeWorkers = project.workers?.filter(w => w.status_name === "Dolgozik") || [];

  // Szűrt dolgozók (keresés alapján)
  const filteredAvailableWorkers = availableWorkers.filter(w => {
    if (!workerSearchQuery) return true;
    const query = workerSearchQuery.toLowerCase();
    return (
      w.name?.toLowerCase().includes(query) ||
      w.phone?.includes(query) ||
      w.position?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="shrink-0 mt-0.5">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">{project.name}</h1>
            {project.is_closed && <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-0 text-xs">Lezárva</Badge>}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
            {project.client_name && (
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" />{project.client_name}</span>
            )}
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(project.date).toLocaleDateString('hu-HU')}</span>
            {project.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{project.location}</span>}
            {project.training_location && (
              <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" />{project.training_location}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === "admin" && (
            <>
              <Switch checked={project.is_closed} onCheckedChange={handleToggleClosed} id="closed" />
              <Label htmlFor="closed" className="cursor-pointer">{project.is_closed ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}</Label>
              <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${id}/edit`)}><Edit2 className="w-4 h-4" /></Button>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Dolgozók (Dolgozik státusz)</span>
          </div>
          <p className="text-lg font-bold text-foreground">{project.active_worker_count || 0}<span className="text-muted-foreground font-normal text-sm">/{project.planned_headcount || '∞'}</span></p>
          {project.planned_headcount > 0 && <Progress value={progressPercent} className="h-1 mt-1" />}
        </div>
        
        <div className="bg-card rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Pozíciók</span>
          </div>
          <p className="text-lg font-bold text-foreground">{project.positions?.length || 0}</p>
        </div>
        
        <div className="bg-card rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-1">
            <TestTube className="w-4 h-4 text-primary" />
            <span className="text-xs text-muted-foreground">Próbák</span>
          </div>
          <p className="text-lg font-bold text-foreground">{project.trials?.length || 0}</p>
        </div>
        
        {user?.role === "admin" && (
          <div className="bg-card rounded-lg border border-border p-3">
            <div className="flex items-center gap-2 mb-1">
              <UserPlus className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Toborzók</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {project.recruiters?.map(r => (
                <Badge key={r.id} variant="secondary" className="text-xs gap-1 pr-1">
                  {r.name}
                  <button onClick={() => handleRemoveRecruiter(r.id)} className="hover:bg-muted rounded"><X className="w-3 h-3" /></button>
                </Badge>
              ))}
              {availableRecruiters.length > 0 && (
                <Button variant="ghost" size="sm" className="h-5 text-xs px-1" onClick={() => setShowAddRecruiter(!showAddRecruiter)}>
                  <Plus className="w-3 h-3" />
                </Button>
              )}
            </div>
            {showAddRecruiter && availableRecruiters.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-border">
                {availableRecruiters.map(r => (
                  <Button key={r.id} variant="outline" size="sm" className="h-6 text-xs" onClick={() => handleAddRecruiter(r.id)}>
                    {r.name || r.email}
                  </Button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {project.notes && <div className="bg-card rounded-lg border border-border p-3 text-sm text-muted-foreground">{project.notes}</div>}

      {/* Tabs - 6 lépcsős pipeline */}
      <Tabs defaultValue="feldolgozas" className="bg-card rounded-lg border border-border">
        <TabsList className="w-full justify-start border-b border-border rounded-none h-auto p-0 bg-transparent flex-wrap">
          {/* Pipeline státuszok */}
          <TabsTrigger value="feldolgozas" className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-500 data-[state=active]:bg-transparent px-3 py-3">
            <div className="w-2 h-2 rounded-full bg-slate-500 mr-2"></div>
            Feldolgozatlan ({project.workers?.filter(w => w.status_name === "Feldolgozatlan" || !w.status_name).length || 0})
          </TabsTrigger>
          <TabsTrigger value="probara_var" className="rounded-none border-b-2 border-transparent data-[state=active]:border-amber-500 data-[state=active]:bg-transparent px-3 py-3">
            <div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>
            Próbára vár ({project.workers?.filter(w => w.status_name === "Próbára vár").length || 0})
          </TabsTrigger>
          <TabsTrigger value="proba_megbeszelve" className="rounded-none border-b-2 border-transparent data-[state=active]:border-violet-500 data-[state=active]:bg-transparent px-3 py-3">
            <div className="w-2 h-2 rounded-full bg-violet-500 mr-2"></div>
            Próba megbeszélve ({project.workers?.filter(w => w.status_name === "Próba megbeszélve").length || 0})
          </TabsTrigger>
          <TabsTrigger value="dolgozik" className="rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:bg-transparent px-3 py-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            Dolgozik ({project.workers?.filter(w => w.status_name === "Dolgozik").length || 0})
          </TabsTrigger>
          <TabsTrigger value="tiltolista" className="rounded-none border-b-2 border-transparent data-[state=active]:border-rose-600 data-[state=active]:bg-transparent px-3 py-3">
            <div className="w-2 h-2 rounded-full bg-rose-600 mr-2"></div>
            Tiltólista ({project.workers?.filter(w => w.status_name === "Tiltólista").length || 0})
          </TabsTrigger>
          {/* Egyéb fülek */}
          <TabsTrigger value="positions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-3">
            <Briefcase className="w-4 h-4 mr-2" />Pozíciók ({project.positions?.length || 0})
          </TabsTrigger>
          {/* Próbák tab - mindenki látja, de csak admin módosíthat */}
          <TabsTrigger value="trials" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-3">
            <TestTube className="w-4 h-4 mr-2" />Próbák ({project.trials?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="forms" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-3">
            <MessageSquare className="w-4 h-4 mr-2" />Űrlapok ({forms.length || 0})
            {formLeads.length > 0 && (
              <Badge className="ml-2 bg-red-600 text-white">{formLeads.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-3 py-3">
            <BarChart3 className="w-4 h-4 mr-2" />Összesítés
          </TabsTrigger>
        </TabsList>

        {/* DRAG & DROP PIPELINE - Mobilbarát */}
        <TabsContent value="feldolgozas" className="p-0 mt-0">
          <div className="p-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-sm text-foreground">Pipeline nézet</span>
              <p className="text-xs text-muted-foreground">Húzd a dolgozókat a megfelelő oszlopba</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddWorker(!showAddWorker)} data-testid="toggle-add-worker">
              {showAddWorker ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4 mr-1" />Hozzáad</>}
            </Button>
          </div>

          {showAddWorker && (
            <div className="p-3 bg-muted/50 border-b border-border space-y-3">
              {/* Státusz választó - Feldolgozatlan nélkül */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Státusz:</span>
                <Select value={addWorkerStatus} onValueChange={setAddWorkerStatus}>
                  <SelectTrigger className="w-[180px] h-8">
                    <SelectValue placeholder="Státusz választás" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Próbára vár">Próbára vár</SelectItem>
                    <SelectItem value="Próba megbeszélve">Próba megbeszélve</SelectItem>
                    <SelectItem value="Dolgozik">Dolgozik</SelectItem>
                    <SelectItem value="Tiltólista">Tiltólista</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pozíció választó */}
              <div className="space-y-2">
                <Label className="text-sm">Pozíciók (többszörös választás, kötelező legalább 1):</Label>
                <div className="flex flex-wrap gap-2 p-2 bg-card border border-border rounded">
                  {project?.positions && project.positions.length > 0 ? (
                    project.positions.map(pos => (
                      <div 
                        key={pos.id}
                        className={`cursor-pointer px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                          selectedPositionIds.includes(pos.id) 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'bg-muted text-foreground hover:bg-muted/80'
                        }`}
                        onClick={() => {
                          setSelectedPositionIds(prev => 
                            prev.includes(pos.id) 
                              ? prev.filter(id => id !== pos.id)
                              : [...prev, pos.id]
                          );
                        }}
                      >
                        {pos.name} ({pos.headcount} fő)
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">Nincs pozíció. Hozz létre egyet a "Pozíciók" tabon!</p>
                  )}
                </div>
                {selectedPositionIds.length === 0 && (
                  <p className="text-xs text-red-500">Legalább 1 pozíciót kötelező választani!</p>
                )}
              </div>

              {/* Dolgozó keresés */}
              <div className="space-y-2">
                <Label className="text-sm">Dolgozó keresése:</Label>
                <Input 
                  placeholder="Keresés név vagy telefonszám alapján..."
                  value={workerSearchQuery}
                  onChange={(e) => setWorkerSearchQuery(e.target.value)}
                  className="h-8"
                />
              </div>
              
              {/* Dolgozók listája */}
              {filteredAvailableWorkers.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-border rounded p-2">
                  {filteredAvailableWorkers.map(w => (
                    <div 
                      key={w.id} 
                      className="flex items-center justify-between p-2 bg-card rounded border border-border text-sm text-foreground hover:border-primary transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                        <div className="font-medium truncate">{w.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{w.phone}</div>
                        {w.position && <div className="text-xs text-blue-600 truncate">{w.position}</div>}
                      </div>
                      <Button 
                        size="sm" 
                        className="h-7 px-2" 
                        onClick={() => handleAddWorkerWithStatus(w.id)}
                        disabled={selectedPositionIds.length === 0}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Hozzáad
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {workerSearchQuery ? "Nincs találat" : "Nincs elérhető dolgozó"}
                </p>
              )}
            </div>
          )}

          {/* Drag & Drop Kanban Board */}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="p-3 overflow-x-auto">
              <div className="flex gap-3 min-w-max pb-4">
                {/* Próbára vár */}
                <PipelineColumn
                  title="Próbára vár"
                  statusName="Próbára vár"
                  workers={project.workers}
                  color="bg-amber-500 text-white"
                  onKuka={openKukaDialog}
                  onOpenNotes={openStatusDialog}
                  onEdit={openEditWorkerDialog}
                  isOver={dropTargetStatus === "Próbára vár"}
                />
                
                {/* Próba megbeszélve */}
                <PipelineColumn
                  title="Próba megbeszélve"
                  statusName="Próba megbeszélve"
                  workers={project.workers}
                  color="bg-blue-500 text-white"
                  onKuka={openKukaDialog}
                  onOpenNotes={openStatusDialog}
                  onEdit={openEditWorkerDialog}
                  isOver={dropTargetStatus === "Próba megbeszélve"}
                />
                
                {/* Dolgozik */}
                <PipelineColumn
                  title="Dolgozik"
                  statusName="Dolgozik"
                  workers={project.workers}
                  color="bg-green-500 text-white"
                  icon={CheckCircle}
                  onKuka={openKukaDialog}
                  onOpenNotes={openStatusDialog}
                  onEdit={openEditWorkerDialog}
                  isOver={dropTargetStatus === "Dolgozik"}
                />
                
                {/* Tiltólista */}
                <PipelineColumn
                  title="Tiltólista"
                  statusName="Tiltólista"
                  workers={project.workers}
                  color="bg-rose-600 text-white"
                  icon={Ban}
                  onKuka={openKukaDialog}
                  onOpenNotes={openStatusDialog}
                  onEdit={openEditWorkerDialog}
                  isOver={dropTargetStatus === "Tiltólista"}
                />
              </div>
            </div>
            
            {/* Drag Overlay */}
            <DragOverlay>
              {activeId && getActiveWorker() ? (
                <div className="p-3 bg-card border-2 border-primary rounded-lg shadow-xl">
                  <p className="font-medium text-sm">{getActiveWorker()?.name}</p>
                  <p className="text-xs text-muted-foreground">{getActiveWorker()?.phone}</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>

        {/* Próbára vár Tab - Lista nézet */}
        <TabsContent value="probara_var" className="p-0 mt-0">
          <div className="p-3 border-b border-border">
            <span className="font-semibold text-sm text-foreground">Próbára vár</span>
            <p className="text-xs text-muted-foreground">Alkalmas jelöltek - próba időpont szükséges</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border">
                  <TableHead className="font-semibold text-foreground">Név</TableHead>
                  <TableHead className="font-semibold text-foreground">Telefon</TableHead>
                  <TableHead className="font-semibold text-foreground">Tovább</TableHead>
                  <TableHead className="w-[120px]">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.workers?.filter(w => w.status_name === "Próbára vár").length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nincs próbára váró dolgozó</TableCell></TableRow>
                ) : (
                  project.workers?.filter(w => w.status_name === "Próbára vár").map(w => (
                    <TableRow key={w.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        <div>
                          <Link to={`/workers/${w.id}`} className="hover:text-primary">{w.name}</Link>
                          {w.position_names && w.position_names.length > 0 && (
                            <div className="text-xs text-muted-foreground">{w.position_names.join(", ")}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a href={`tel:${w.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                          <Phone className="w-3 h-3" />{w.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-7 text-xs border-blue-500 text-blue-600 hover:bg-blue-50"
                          onClick={() => handleStatusChangeWithValidation(w.id, "Próba megbeszélve")}
                        >
                          Próba megbeszélve →
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openStatusDialog(w)} title="Megjegyzés">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => openKukaDialog(w)} title="Kukába">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Próba megbeszélve Tab */}
        <TabsContent value="proba_megbeszelve" className="p-0 mt-0">
          <div className="p-3 border-b border-border">
            <span className="font-semibold text-sm text-foreground">Próba megbeszélve</span>
            <p className="text-xs text-muted-foreground">Konkrét próba időpont van kiválasztva</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border">
                  <TableHead className="font-semibold text-foreground">Név</TableHead>
                  <TableHead className="font-semibold text-foreground">Telefon</TableHead>
                  <TableHead className="font-semibold text-foreground">Próba dátuma</TableHead>
                  <TableHead className="font-semibold text-foreground">Tovább</TableHead>
                  <TableHead className="w-[120px]">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.workers?.filter(w => w.status_name === "Próba megbeszélve").length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nincs próba megbeszélve</TableCell></TableRow>
                ) : (
                  project.workers?.filter(w => w.status_name === "Próba megbeszélve").map(w => (
                    <TableRow key={w.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        <div>
                          <Link to={`/workers/${w.id}`} className="hover:text-primary">{w.name}</Link>
                          {w.position_names && w.position_names.length > 0 && (
                            <div className="text-xs text-muted-foreground">{w.position_names.join(", ")}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a href={`tel:${w.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                          <Phone className="w-3 h-3" />{w.phone}
                        </a>
                      </TableCell>
                      <TableCell>
                        {w.trial_date ? (
                          <div className="flex items-center gap-1 text-blue-600">
                            <Calendar className="w-3 h-3" />
                            <span className="text-sm font-medium">
                              {new Date(w.trial_date).toLocaleDateString('hu-HU')}
                              {w.trial_time && <span className="text-muted-foreground ml-1">({w.trial_time})</span>}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleStatusChangeWithValidation(w.id, "Dolgozik")}
                        >
                          Dolgozik →
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openStatusDialog(w)} title="Megjegyzés">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => openKukaDialog(w)} title="Kukába">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Dolgozik Tab */}
        <TabsContent value="dolgozik" className="p-0 mt-0">
          <div className="p-3 border-b border-border">
            <span className="font-semibold text-sm text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Dolgozik - {project.workers?.filter(w => w.status_name === "Dolgozik").length || 0} fő
            </span>
            <p className="text-xs text-muted-foreground">Munkába állt dolgozók ezen a projekten</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border">
                  <TableHead className="font-semibold text-foreground">Név</TableHead>
                  <TableHead className="font-semibold text-foreground">Telefon</TableHead>
                  <TableHead className="font-semibold text-foreground hidden sm:table-cell">Kategória</TableHead>
                  <TableHead className="w-[120px]">Műveletek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.workers?.filter(w => w.status_name === "Dolgozik").length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nincs aktív dolgozó</TableCell></TableRow>
                ) : (
                  project.workers?.filter(w => w.status_name === "Dolgozik").map(w => (
                    <TableRow key={w.id} className="border-border bg-green-50/30">
                      <TableCell className="font-medium text-foreground">
                        <div>
                          <Link to={`/workers/${w.id}`} className="hover:text-primary">{w.name}</Link>
                          {w.position_names && w.position_names.length > 0 && (
                            <div className="text-xs text-muted-foreground">{w.position_names.join(", ")}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a href={`tel:${w.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                          <Phone className="w-3 h-3" />{w.phone}
                        </a>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{w.category || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openStatusDialog(w)} title="Megjegyzés">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => openKukaDialog(w)} title="Kukába">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Kuka Tab */}
        <TabsContent value="kuka" className="p-0 mt-0">
          <div className="p-3 border-b border-border">
            <span className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Kuka - {project.workers?.filter(w => w.status_name === "Kuka").length || 0} fő
            </span>
            <p className="text-xs text-muted-foreground">Projektből kiesett dolgozók</p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border">
                  <TableHead className="font-semibold text-foreground">Név</TableHead>
                  <TableHead className="font-semibold text-foreground">Telefon</TableHead>
                  <TableHead className="font-semibold text-foreground">Indok</TableHead>
                  <TableHead className="w-[80px]">Visszaállít</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.workers?.filter(w => w.status_name === "Kuka").length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Nincs kukázott dolgozó</TableCell></TableRow>
                ) : (
                  project.workers?.filter(w => w.status_name === "Kuka").map(w => (
                    <TableRow key={w.id} className="border-border bg-red-50/30">
                      <TableCell className="font-medium text-foreground">
                        <div>
                          <Link to={`/workers/${w.id}`} className="hover:text-primary">{w.name}</Link>
                          {w.position_names && w.position_names.length > 0 && (
                            <div className="text-xs text-muted-foreground">{w.position_names.join(", ")}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <a href={`tel:${w.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                          <Phone className="w-3 h-3" />{w.phone}
                        </a>
                      </TableCell>
                      <TableCell className="text-sm text-red-600">{w.notes || "-"}</TableCell>
                      <TableCell>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={() => handleStatusChangeWithValidation(w.id, "Feldolgozatlan")}
                        >
                          Visszaállít
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* Positions Tab */}
        <TabsContent value="positions" className="p-0 mt-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground">Pozíciók kezelése</span>
            <Button variant="outline" size="sm" onClick={() => openPositionDialog()} data-testid="add-position-btn">
              <Plus className="w-4 h-4 mr-1" />Új pozíció
            </Button>
          </div>

          {project.positions?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>Még nincs pozíció létrehozva</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => openPositionDialog()}>
                <Plus className="w-4 h-4 mr-1" />Első pozíció létrehozása
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {project.positions?.map(pos => (
                <Card key={pos.id} className="border-border">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base font-semibold text-foreground">{pos.name}</CardTitle>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {pos.headcount} fő
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPositionDialog(pos)}>
                          <Edit2 className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePosition(pos.id)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {pos.work_schedule && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-3 h-3" /><span>Munkarend: {pos.work_schedule}</span>
                      </div>
                    )}
                    {pos.salary && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                        <Briefcase className="w-3 h-3" /><span>Bérezés: {pos.salary}</span>
                      </div>
                    )}
                    {pos.experience_required && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Award className="w-3 h-3" /><span>Tapasztalat: {pos.experience_required}</span>
                      </div>
                    )}
                    {pos.qualifications && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GraduationCap className="w-3 h-3" /><span>Végzettség: {pos.qualifications}</span>
                      </div>
                    )}
                    {pos.physical_requirements && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Dumbbell className="w-3 h-3" /><span>Fizikai: {pos.physical_requirements}</span>
                      </div>
                    )}
                    {pos.position_details && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ClipboardList className="w-3 h-3" /><span className="font-medium">Részletek: {pos.position_details}</span>
                      </div>
                    )}
                    {pos.notes && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MessageSquare className="w-3 h-3" /><span>{pos.notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trials Tab */}
        {/* Próbák tab content - mindenki látja (csak admin szerkeszthet) */}
        <TabsContent value="trials" className="p-0 mt-0">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">Próbák kezelése</span>
              {user?.role === "admin" && (
                <Button variant="outline" size="sm" onClick={() => openTrialDialog()} data-testid="add-trial-btn">
                  <Plus className="w-4 h-4 mr-1" />Új próba
                </Button>
              )}
            </div>

            {project.trials?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <TestTube className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p>Még nincs próba létrehozva</p>
                {user?.role === "admin" && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => openTrialDialog()}>
                    <Plus className="w-4 h-4 mr-1" />Első próba létrehozása
                  </Button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-border">
                {project.trials?.map(trial => (
                  <div key={trial.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-foreground">
                            {new Date(trial.date).toLocaleDateString('hu-HU')}
                            {trial.time && <span className="ml-1 text-muted-foreground font-normal">({trial.time})</span>}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">{trial.worker_count || trial.workers?.length || 0} dolgozó</Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        {trial.workers && trial.workers.length > 0 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 text-xs" 
                            onClick={() => openCopyDialog(trial)}
                            data-testid="copy-trial-workers"
                          >
                            <Copy className="w-3 h-3 mr-1" />Másolás ({trial.workers.length})
                          </Button>
                        )}
                        {user?.role === "admin" && (
                          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddToTrialDialog(trial.id)}>
                            <Plus className="w-3 h-3 mr-1" />Dolgozó
                          </Button>
                        )}
                        {user?.role === "admin" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openTrialDialog(trial)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteTrial(trial.id)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {trial.notes && <p className="text-sm text-muted-foreground mb-2">{trial.notes}</p>}
                    
                    {/* Trial Positions */}
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Pozíciók</span>
                        {user?.role === "admin" && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 text-xs"
                            onClick={() => openTrialPositionDialog(trial)}
                          >
                            <Plus className="w-3 h-3 mr-1" />Pozíció
                          </Button>
                        )}
                      </div>
                      
                      {trial.positions && trial.positions.length > 0 ? (
                        <div className="grid gap-2">
                          {trial.positions.map(pos => (
                            <div 
                              key={pos.id} 
                              className="flex items-center justify-between p-2 bg-muted/50 rounded-lg border border-border"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Briefcase className="w-4 h-4 text-primary shrink-0" />
                                  <span className="font-medium text-sm">{pos.position_name}</span>
                                  <Badge variant="outline" className={`text-xs ${
                                    pos.assigned_count >= pos.headcount 
                                      ? "bg-green-500/20 text-green-600" 
                                      : "bg-orange-500/20 text-orange-600"
                                  }`}>
                                    {pos.assigned_count}/{pos.headcount} fő
                                  </Badge>
                                  {pos.hourly_rate && (
                                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600">
                                      Nettó: {pos.hourly_rate} Ft/óra
                                    </Badge>
                                  )}
                                  {pos.accommodation && (
                                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600">
                                      Szállás ✓
                                    </Badge>
                                  )}
                                </div>
                                {pos.requirements && (
                                  <p className="text-xs text-muted-foreground mt-1 ml-6">{pos.requirements}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-6 text-xs"
                                  onClick={() => openAddToTrialDialog(trial.id, pos.id)}
                                >
                                  <UserPlus className="w-3 h-3 mr-1" />Dolgozó
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => openTrialPositionDialog(trial, pos)}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button 
                                  variant="ghost"
                                  size="icon" 
                                  className="h-6 w-6 text-destructive"
                                  onClick={() => handleDeleteTrialPosition(trial.id, pos.id)}
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Még nincs pozíció megadva</p>
                      )}
                    </div>
                    
                    {/* Trial Workers */}
                    {trial.workers && trial.workers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-border">
                        <span className="text-xs text-muted-foreground w-full mb-1">Beosztott dolgozók:</span>
                        {trial.workers.map(w => (
                          <Badge key={w.id} variant="outline" className="gap-1 pr-1">
                            {w.name}
                            {w.position_name && <span className="text-muted-foreground">({w.position_name})</span>}
                            <button onClick={() => handleRemoveWorkerFromTrial(trial.id, w.id)} className="hover:bg-muted rounded ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        
        {/* Waitlist Tab */}
        <TabsContent value="waitlist" className="p-0 mt-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground">Várólista kezelése</span>
            <Button variant="outline" size="sm" onClick={() => setWaitlistDialog(true)}>
              <Plus className="w-4 h-4 mr-1" />Hozzáad
            </Button>
          </div>

          {waitlist.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>Még nincs dolgozó a várólistán</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 border-border">
                    <TableHead className="font-semibold text-foreground">Név</TableHead>
                    <TableHead className="font-semibold text-foreground">Telefon</TableHead>
                    <TableHead className="font-semibold text-foreground hidden sm:table-cell">Email</TableHead>
                    <TableHead className="font-semibold text-foreground">Próba időpont</TableHead>
                    <TableHead className="font-semibold text-foreground hidden md:table-cell">Hozzáadva</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {waitlist.map(entry => (
                    <TableRow key={entry.id} className="border-border">
                      <TableCell>
                        <Link to={`/workers/${entry.worker_id}`} className="text-primary hover:underline font-medium">
                          {entry.worker_name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {entry.worker_phone}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {entry.worker_email || "-"}
                      </TableCell>
                      <TableCell>
                        {entry.trial_date ? new Date(entry.trial_date).toLocaleDateString('hu-HU') : "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs hidden md:table-cell">
                        {new Date(entry.added_at).toLocaleDateString('hu-HU')}
                        <br />
                        <span className="text-xs">{entry.added_by_name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs"
                            onClick={() => handleMoveToProject(entry.worker_id)}
                          >
                            Projekthez ad
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0 text-destructive"
                            onClick={() => handleRemoveFromWaitlist(entry.worker_id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        {/* Archive (Kuka) Tab */}
        <TabsContent value="archive" className="p-0 mt-0">
          <div className="p-3 border-b border-border">
            <span className="font-semibold text-sm text-foreground">Kuka - Nem megfelelő dolgozók</span>
            <p className="text-xs text-muted-foreground mt-1">Dolgozók akik próbán voltak, de nem váltak be</p>
          </div>

          {archivedWorkers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Trash2 className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>Nincs archivált dolgozó</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {archivedWorkers.map(worker => (
                <div key={worker.id} className="p-4 hover:bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{worker.name}</span>
                        <Badge 
                          style={{ backgroundColor: worker.status_color + '20', color: worker.status_color }}
                          className="text-xs"
                        >
                          {worker.status_name}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />{worker.phone}
                        </span>
                        {worker.trial_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />Próba: {new Date(worker.trial_date).toLocaleDateString('hu-HU')}
                          </span>
                        )}
                        {worker.updated_at && (
                          <span className="text-xs">
                            {new Date(worker.updated_at).toLocaleDateString('hu-HU')}
                          </span>
                        )}
                      </div>
                      {worker.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{worker.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Forms Tab */}
        <TabsContent value="forms" className="p-0 mt-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <div>
              <span className="font-semibold text-sm text-foreground">Google Űrlapok</span>
              {formLeads.length > 0 && (
                <Badge className="ml-2 bg-red-600 text-white">{formLeads.length} feldolgozatlan</Badge>
              )}
            </div>
            <Button size="sm" onClick={() => { setEditingForm(null); setFormDialog(true); }}>
              <Plus className="w-4 h-4 mr-1" />Új űrlap
            </Button>
          </div>
          
          <FormLeadsTab
            projectId={id}
            projectName={project?.name || ""}
            leads={formLeads}
            statuses={statuses}
            trials={project?.trials || []}
            positions={project?.positions || []}
            loading={formsLoading}
            onRefresh={fetchData}
            onDuplicateClick={(lead) => {
              setSelectedDuplicateLead(lead);
              setDuplicateLeadDialog(true);
            }}
            onProcessed={fetchData}
          />
        </TabsContent>

        {/* Summary (Összesítés) Tab */}
        <TabsContent value="summary" className="p-0 mt-0">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Projekt statisztika
            </h3>

            {!projectSummary ? (
              <div className="text-center text-muted-foreground py-8">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
                <p>Nincs elérhető statisztika</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-primary">{projectSummary.total_workers || 0}</div>
                      <div className="text-xs text-muted-foreground">Összes dolgozó</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-green-600">{projectSummary.active_workers || 0}</div>
                      <div className="text-xs text-muted-foreground">Aktív dolgozók</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-blue-600">{projectSummary.total_positions || 0}</div>
                      <div className="text-xs text-muted-foreground">Pozíciók száma</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-purple-600">{projectSummary.fill_rate || 0}%</div>
                      <div className="text-xs text-muted-foreground">Betöltöttség</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Pozíciók betöltöttsége</span>
                    <span className="font-medium">{projectSummary.active_workers}/{projectSummary.total_headcount}</span>
                  </div>
                  <Progress value={projectSummary.fill_rate || 0} className="h-2" />
                </div>

                {/* Status Breakdown */}
                <div>
                  <h4 className="text-sm font-semibold mb-3">Dolgozók státusz szerint</h4>
                  <div className="space-y-2">
                    {projectSummary.status_breakdown?.map((status, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: status.color }}
                          />
                          <span className="text-sm font-medium">{status.status_name}</span>
                          <Badge 
                            variant={status.status_type === 'positive' ? 'default' : status.status_type === 'negative' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {status.status_type === 'positive' ? 'Pozitív' : status.status_type === 'negative' ? 'Negatív' : 'Neutrális'}
                          </Badge>
                        </div>
                        <span className="text-lg font-bold">{status.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Státusz és megjegyzés - {selectedWorker?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Státusz</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger><SelectValue placeholder="Válassz státuszt" /></SelectTrigger>
                <SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Megjegyzés</Label>
              <Textarea value={statusNotes} onChange={(e) => setStatusNotes(e.target.value)} placeholder="pl. Nem jelent meg..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>Mégse</Button>
            <Button onClick={handleSaveStatus} disabled={!selectedStatus} className="bg-primary">
              <Save className="w-4 h-4 mr-2" />Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Position Dialog */}
      <Dialog open={positionDialog} onOpenChange={setPositionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPosition ? "Pozíció szerkesztése" : "Új pozíció"}</DialogTitle>
            <DialogDescription>Adj meg a pozícióhoz tartozó elvárásokat</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Pozíció neve *</Label>
                <Input value={positionForm.name} onChange={(e) => setPositionForm({...positionForm, name: e.target.value})} placeholder="pl. Operátor" data-testid="position-name-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Létszámigény *</Label>
                <Input type="number" min="1" value={positionForm.headcount} onChange={(e) => setPositionForm({...positionForm, headcount: parseInt(e.target.value) || 1})} data-testid="position-headcount-input" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1"><Clock className="w-3 h-3" />Munkarend</Label>
              <Input value={positionForm.work_schedule} onChange={(e) => setPositionForm({...positionForm, work_schedule: e.target.value})} placeholder="pl. 2 műszak, 6-14 / 14-22" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1"><Briefcase className="w-3 h-3" />Bérezés</Label>
              <Input value={positionForm.salary} onChange={(e) => setPositionForm({...positionForm, salary: e.target.value})} placeholder="pl. 2500 Ft/óra bruttó, vagy 450.000 Ft/hó" data-testid="position-salary-input" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1"><Award className="w-3 h-3" />Tapasztalat</Label>
              <Input value={positionForm.experience_required} onChange={(e) => setPositionForm({...positionForm, experience_required: e.target.value})} placeholder="pl. Minimum 1 év raktári munka" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1"><GraduationCap className="w-3 h-3" />Végzettség / Jogosítvány</Label>
              <Input value={positionForm.qualifications} onChange={(e) => setPositionForm({...positionForm, qualifications: e.target.value})} placeholder="pl. B kategóriás jogosítvány" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1"><Dumbbell className="w-3 h-3" />Fizikai elvárások</Label>
              <Input value={positionForm.physical_requirements} onChange={(e) => setPositionForm({...positionForm, physical_requirements: e.target.value})} placeholder="pl. Max 20kg emelés" />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Pozíció részletei</Label>
              <Textarea value={positionForm.position_details} onChange={(e) => setPositionForm({...positionForm, position_details: e.target.value})} placeholder="Fizetés, egyéb fontos információk..." rows={2} />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Egyéb megjegyzések</Label>
              <Textarea value={positionForm.notes} onChange={(e) => setPositionForm({...positionForm, notes: e.target.value})} placeholder="További elvárások..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPositionDialog(false)}>Mégse</Button>
            <Button onClick={handleSavePosition} className="bg-primary" data-testid="save-position-btn">
              <Save className="w-4 h-4 mr-2" />Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trial Dialog */}
      <Dialog open={trialDialog} onOpenChange={setTrialDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTrial ? "Próba szerkesztése" : "Új próba"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm">Dátum *</Label>
                <Input type="date" value={trialForm.date} onChange={(e) => setTrialForm({...trialForm, date: e.target.value})} data-testid="trial-date-input" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm">Időpont</Label>
                <Input type="time" value={trialForm.time} onChange={(e) => setTrialForm({...trialForm, time: e.target.value})} placeholder="09:00" data-testid="trial-time-input" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Megjegyzések</Label>
              <Textarea value={trialForm.notes} onChange={(e) => setTrialForm({...trialForm, notes: e.target.value})} placeholder="Próbával kapcsolatos infók..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialDialog(false)}>Mégse</Button>
            <Button onClick={handleSaveTrial} className="bg-primary" data-testid="save-trial-btn">
              <Save className="w-4 h-4 mr-2" />Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Worker to Trial Dialog */}
      <Dialog open={addToTrialDialog} onOpenChange={setAddToTrialDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dolgozó hozzáadása próbához</DialogTitle>
            <DialogDescription>
              Válassz a projekt dolgozói közül, vagy adj hozzá új dolgozót
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Quick add new worker form */}
            <div className="p-3 bg-muted/30 rounded-lg border border-dashed border-border">
              <p className="text-sm font-medium mb-2 text-foreground">Új dolgozó hozzáadása</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Dolgozó neve *"
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  data-testid="new-worker-name-input"
                />
                <Input
                  placeholder="Telefonszám"
                  value={newWorkerPhone}
                  onChange={(e) => setNewWorkerPhone(e.target.value)}
                  data-testid="new-worker-phone-input"
                />
              </div>
              <Button 
                className="mt-2 w-full bg-primary" 
                size="sm"
                disabled={!newWorkerName.trim()}
                onClick={handleCreateAndAddWorkerToTrial}
                data-testid="create-add-worker-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Dolgozó létrehozása és hozzáadás
              </Button>
            </div>
            
            {/* Existing workers list */}
            {project.workers?.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2 text-foreground">Meglévő dolgozók</p>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {project.workers?.map(w => {
                    const trial = project.trials?.find(t => t.id === selectedTrialId);
                    const isInTrial = trial?.workers?.some(tw => tw.id === w.id);
                    return (
                      <div key={w.id} className={`flex items-center justify-between p-2 rounded border text-sm ${isInTrial ? 'bg-green-500/20 border-green-500/30' : 'bg-card border-border'}`}>
                        <span className="truncate text-foreground">{w.name}</span>
                        {isInTrial ? (
                          <Badge variant="secondary" className="text-xs">Benne van</Badge>
                        ) : (
                          <Button size="sm" className="h-6 w-6 p-0 bg-primary" onClick={() => handleAddWorkerToTrial(w.id)}>
                            <Plus className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToTrialDialog(false)}>Bezárás</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Trial Position Dialog */}
      <Dialog open={trialPositionDialog} onOpenChange={setTrialPositionDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTrialPosition ? "Pozíció szerkesztése" : "Pozíció hozzáadása a próbához"}
            </DialogTitle>
            <DialogDescription>
              Add meg a pozíció részleteit
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Position name with project position suggestions */}
            <div className="space-y-2">
              <Label>Pozíció neve *</Label>
              <Input
                value={trialPositionForm.position_name}
                onChange={(e) => setTrialPositionForm({...trialPositionForm, position_name: e.target.value, add_to_project: e.target.value !== "" && !project?.positions?.some(p => p.name === e.target.value)})}
                placeholder="pl. Raktáros, Csomagoló..."
                data-testid="trial-position-name"
              />
              {project?.positions && project.positions.length > 0 && !editingTrialPosition && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Projekt pozíciók:</p>
                  <div className="flex flex-wrap gap-1">
                    {project.positions.map(p => (
                      <Button
                        key={p.id}
                        type="button"
                        variant={trialPositionForm.position_name === p.name ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => selectProjectPosition(p.name)}
                      >
                        {p.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Headcount and Hourly Rate row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Létszámigény *</Label>
                <Input
                  type="number"
                  min="1"
                  value={trialPositionForm.headcount}
                  onChange={(e) => setTrialPositionForm({...trialPositionForm, headcount: parseInt(e.target.value) || 1})}
                  data-testid="trial-position-headcount"
                />
              </div>
              <div className="space-y-2">
                <Label>Nettó órabér (Ft/óra)</Label>
                <Input
                  value={trialPositionForm.hourly_rate}
                  onChange={(e) => setTrialPositionForm({...trialPositionForm, hourly_rate: e.target.value})}
                  placeholder="pl. 2000"
                  data-testid="trial-position-hourly-rate"
                />
              </div>
            </div>
            
            {/* Accommodation switch */}
            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg border border-border">
              <Switch
                id="accommodation"
                checked={trialPositionForm.accommodation}
                onCheckedChange={(checked) => setTrialPositionForm({...trialPositionForm, accommodation: checked})}
              />
              <div>
                <Label htmlFor="accommodation" className="text-sm font-medium cursor-pointer">
                  Szállás biztosított
                </Label>
                <p className="text-xs text-muted-foreground">A munkáltató szállást biztosít</p>
              </div>
            </div>
            
            {/* Requirements */}
            <div className="space-y-2">
              <Label>Egyéb elvárások / Megjegyzés</Label>
              <Textarea
                value={trialPositionForm.requirements}
                onChange={(e) => setTrialPositionForm({...trialPositionForm, requirements: e.target.value})}
                placeholder="pl. Éjszakai műszak, fizikai erőnlét, jogosítvány..."
                rows={3}
                data-testid="trial-position-requirements"
              />
            </div>
            
            {/* Add to project checkbox */}
            {!editingTrialPosition && trialPositionForm.position_name && !project?.positions?.some(p => p.name === trialPositionForm.position_name) && (
              <div className="flex items-center space-x-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                <Switch
                  id="add-to-project"
                  checked={trialPositionForm.add_to_project}
                  onCheckedChange={(checked) => setTrialPositionForm({...trialPositionForm, add_to_project: checked})}
                />
                <Label htmlFor="add-to-project" className="text-sm cursor-pointer">
                  Pozíció hozzáadása a projekthez is
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrialPositionDialog(false)}>Mégse</Button>
            <Button 
              onClick={handleSaveTrialPosition}
              disabled={!trialPositionForm.position_name}
              className="bg-primary"
            >
              <Save className="w-4 h-4 mr-2" />
              {editingTrialPosition ? "Mentés" : "Hozzáadás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Copy Trial Workers Dialog */}
      <Dialog open={copyDialog} onOpenChange={setCopyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5" />
              Próba lista másolása
            </DialogTitle>
            <DialogDescription>
              Válaszd ki mely adatokat szeretnéd másolni ({selectedTrial?.workers?.length || 0} dolgozó)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="copy-name"
                checked={copyFields.name}
                onCheckedChange={(checked) => setCopyFields({...copyFields, name: checked})}
              />
              <Label htmlFor="copy-name" className="cursor-pointer font-medium">
                Teljes név
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="copy-position"
                checked={copyFields.position}
                onCheckedChange={(checked) => setCopyFields({...copyFields, position: checked})}
              />
              <Label htmlFor="copy-position" className="cursor-pointer font-medium">
                Pozíció
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="copy-phone"
                checked={copyFields.phone}
                onCheckedChange={(checked) => setCopyFields({...copyFields, phone: checked})}
              />
              <Label htmlFor="copy-phone" className="cursor-pointer font-medium">
                Telefonszám
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="copy-email"
                checked={copyFields.email}
                onCheckedChange={(checked) => setCopyFields({...copyFields, email: checked})}
              />
              <Label htmlFor="copy-email" className="cursor-pointer">
                Email cím
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="copy-notes"
                checked={copyFields.notes}
                onCheckedChange={(checked) => setCopyFields({...copyFields, notes: checked})}
              />
              <Label htmlFor="copy-notes" className="cursor-pointer">
                Megjegyzések
              </Label>
            </div>
            
            {selectedTrial?.workers && selectedTrial.workers.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-2">Előnézet:</p>
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {(() => {
                    const trialDate = selectedTrial.date ? new Date(selectedTrial.date).toLocaleDateString('hu-HU') : '';
                    const trialTime = selectedTrial.time || '';
                    const header = `${project?.client_name || project?.name || 'Projekt'} - PRÓBA ${trialDate}${trialTime ? '. ' + trialTime : ''}`;
                    
                    const workerTexts = selectedTrial.workers.slice(0, 2).map(w => {
                      const lines = [];
                      const wName = w.name || w.worker_name || '';
                      const wPosition = w.position_name || w.position || '';
                      const wPhone = w.phone || w.worker_phone || '';
                      const wEmail = w.email || w.worker_email || '';
                      const wNotes = w.notes || '';
                      
                      if (copyFields.name && wName) lines.push(wName);
                      if (copyFields.position && wPosition) lines.push(wPosition);
                      if (copyFields.phone && wPhone) lines.push(wPhone);
                      if (copyFields.email && wEmail) lines.push(wEmail);
                      if (copyFields.notes && wNotes) lines.push(wNotes);
                      return lines.join('\n');
                    });
                    
                    return header + '\n\n' + workerTexts.join('\n\n') + (selectedTrial.workers.length > 2 ? '\n\n...' : '');
                  })()}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialog(false)}>Mégse</Button>
            <Button onClick={handleCopyTrialWorkers} className="bg-primary">
              <Copy className="w-4 h-4 mr-2" />
              Másolás vágólapra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Waitlist Dialog */}
      <Dialog open={waitlistDialog} onOpenChange={setWaitlistDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dolgozó hozzáadása a várólistához</DialogTitle>
            <DialogDescription>Válassz egy dolgozót és adj meg kezdési dátumot (opcionális)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Dolgozó *</Label>
              <Select value={waitlistWorkerSelect} onValueChange={setWaitlistWorkerSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz dolgozót" />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkers.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name} - {w.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Próba időpont (opcionális)</Label>
              <Input 
                type="date" 
                value={waitlistStartDate} 
                onChange={(e) => setWaitlistStartDate(e.target.value)} 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaitlistDialog(false)}>Mégse</Button>
            <Button 
              onClick={handleAddToWaitlist} 
              disabled={!waitlistWorkerSelect}
              className="bg-primary"
            >
              <Plus className="w-4 h-4 mr-2" />Hozzáad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Kuka Dialog - dolgozó kukába helyezése indokkal */}
      {/* Edit Worker in Project Dialog */}
      <Dialog open={editWorkerDialog} onOpenChange={setEditWorkerDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <Edit2 className="w-5 h-5" />
              Dolgozó szerkesztése
            </DialogTitle>
            <DialogDescription>
              {editingProjectWorker?.name} adatainak módosítása
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Telefonszám */}
            <div className="space-y-2">
              <Label>Telefonszám</Label>
              <Input 
                value={editWorkerForm.phone} 
                onChange={(e) => setEditWorkerForm({...editWorkerForm, phone: e.target.value})}
                placeholder="+36..."
              />
            </div>
            
            {/* Pozíciók */}
            <div className="space-y-2">
              <Label>Pozíció(k) a projekten</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto p-2 border rounded">
                {project?.positions && project.positions.length > 0 ? (
                  project.positions.map(pos => (
                    <div 
                      key={pos.id}
                      className={`p-2 border rounded cursor-pointer transition-all ${
                        editWorkerForm.position_ids.includes(pos.id)
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setEditWorkerForm(prev => ({
                          ...prev,
                          position_ids: prev.position_ids.includes(pos.id)
                            ? prev.position_ids.filter(pid => pid !== pos.id)
                            : [...prev.position_ids, pos.id]
                        }));
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 border-2 rounded flex items-center justify-center ${
                          editWorkerForm.position_ids.includes(pos.id) 
                            ? 'border-blue-500 bg-blue-500' 
                            : 'border-gray-300'
                        }`}>
                          {editWorkerForm.position_ids.includes(pos.id) && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-medium text-sm">{pos.name || 'Nincs név'}</span>
                        {pos.headcount && (
                          <span className="text-xs text-muted-foreground">({pos.headcount} fő)</span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground py-4 text-sm">Nincs pozíció a projekthez</p>
                )}
              </div>
              {editWorkerForm.position_ids.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {editWorkerForm.position_ids.length} pozíció kiválasztva
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditWorkerDialog(false)}>Mégse</Button>
            <Button onClick={handleSaveEditedWorker} className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Mentés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={kukaDialog} onOpenChange={setKukaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Trash2 className="w-5 h-5" />
              Dolgozó kukába helyezése
            </DialogTitle>
            <DialogDescription>
              {kukaWorker?.name} kukába kerül. Add meg az indokot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Indok *</Label>
              <Select value={kukaReason} onValueChange={setKukaReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz indokot" />
                </SelectTrigger>
                <SelectContent>
                  {KUKA_REASONS.map(reason => (
                    <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {kukaReason === "Egyéb" && (
              <div className="space-y-2">
                <Label>Egyéb indok *</Label>
                <Textarea 
                  value={kukaCustomReason} 
                  onChange={(e) => setKukaCustomReason(e.target.value)}
                  placeholder="Írd le az indokot..."
                  rows={2}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setKukaDialog(false)}>Mégse</Button>
            <Button 
              onClick={handleMoveToKuka} 
              className="bg-orange-600 hover:bg-orange-700"
              disabled={!kukaReason || (kukaReason === "Egyéb" && !kukaCustomReason.trim())}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Kukába helyezés
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Próba kiválasztó dialog - "Próba megbeszélve" státuszhoz */}
      <Dialog open={selectTrialDialog} onOpenChange={setSelectTrialDialog}>
        <DialogContent className="max-w-md" data-testid="select-trial-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <TestTube className="w-5 h-5" />
              Próba kiválasztása
            </DialogTitle>
            <DialogDescription>
              Válaszd ki, melyik próbára lett megbeszélve a dolgozó.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            {project?.trials?.length > 0 ? (
              project.trials.map(trial => (
                <div 
                  key={trial.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedTrialForStatus === trial.id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedTrialForStatus(trial.id)}
                  data-testid={`trial-option-${trial.id}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground">
                        {new Date(trial.date).toLocaleDateString('hu-HU')}
                        {trial.time && <span className="ml-1 text-muted-foreground">({trial.time})</span>}
                      </span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {trial.worker_count || trial.workers?.length || 0} fő
                    </Badge>
                  </div>
                  {trial.positions && trial.positions.length > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Pozíciók: {trial.positions.map(p => p.position_name).join(", ")}
                    </div>
                  )}
                  {trial.notes && (
                    <p className="mt-1 text-xs text-muted-foreground">{trial.notes}</p>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <TestTube className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                <p>Nincs próba létrehozva</p>
                <p className="text-xs mt-1">Hozz létre egy próbát a "Próbák" fülön</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectTrialDialog(false);
              setSelectTrialWorkerId(null);
              setSelectedTrialForStatus("");
            }}>
              Mégse
            </Button>
            <Button 
              onClick={handleConfirmTrialSelection} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!selectedTrialForStatus}
              data-testid="confirm-trial-selection"
            >
              <TestTube className="w-4 h-4 mr-2" />
              Próba megbeszélve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Form Settings Dialog */}
      <FormSettingsDialog
        open={formDialog}
        onOpenChange={setFormDialog}
        projectId={id}
        form={editingForm}
        positions={project?.positions || []}
        onSuccess={fetchData}
      />
      
      {/* Form Share Dialog */}
      <FormShareDialog
        open={formShareDialog}
        onOpenChange={setFormShareDialog}
        form={selectedForm}
        allUsers={allUsers}
        onSuccess={fetchData}
      />
      
      {/* Duplicate Resolution Modal */}
      <DuplicateResolutionModal
        open={duplicateLeadDialog}
        onOpenChange={setDuplicateLeadDialog}
        lead={selectedDuplicateLead}
        onResolved={fetchData}
      />
    </div>
  );
}
