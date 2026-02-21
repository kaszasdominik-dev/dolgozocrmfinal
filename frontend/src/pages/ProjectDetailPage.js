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
  ArrowLeft, Edit2, Calendar, MapPin, Users, Plus, X, Phone,
  Lock, Unlock, Target, UserPlus, MessageSquare, Save,
  Building2, GraduationCap, Briefcase, Clock, Award, Dumbbell,
  ClipboardList, TestTube, Trash2, BarChart3, TrendingUp, Copy, CheckCircle
} from "lucide-react";

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
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [showAddRecruiter, setShowAddRecruiter] = useState(false);
  
  // Position dialog
  const [positionDialog, setPositionDialog] = useState(false);
  const [editingPosition, setEditingPosition] = useState(null);
  const [positionForm, setPositionForm] = useState({
    name: "", headcount: 1, work_schedule: "", experience_required: "",
    qualifications: "", physical_requirements: "", position_details: "", notes: ""
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

  const handleAddWorker = async (workerId) => {
    try {
      await axios.post(`${API}/projects/${id}/workers`, { worker_id: workerId });
      toast.success("Hozzáadva");
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
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

  const handleQuickStatusChange = async (workerId, statusId) => {
    try {
      await axios.put(`${API}/projects/${id}/workers/${workerId}/status`, { status_id: statusId });
      toast.success("Mentve");
      fetchData();
    } catch (e) {
      toast.error("Hiba");
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
        notes: position.notes || ""
      });
    } else {
      setEditingPosition(null);
      setPositionForm({
        name: "", headcount: 1, work_schedule: "", experience_required: "",
        qualifications: "", physical_requirements: "", position_details: "", notes: ""
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
    
    const lines = [];
    selectedTrial.workers.forEach(worker => {
      const workerLines = [];
      
      if (copyFields.name) workerLines.push(worker.worker_name);
      if (copyFields.position && worker.position_name) workerLines.push(worker.position_name);
      if (copyFields.phone) workerLines.push(worker.worker_phone);
      if (copyFields.email && worker.worker_email) workerLines.push(worker.worker_email);
      if (copyFields.notes && worker.notes) workerLines.push(`Megjegyzés: ${worker.notes}`);
      
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

      {/* Tabs */}
      <Tabs defaultValue="workers" className="bg-card rounded-lg border border-border">
        <TabsList className="w-full justify-start border-b border-border rounded-none h-auto p-0 bg-transparent">
          <TabsTrigger value="workers" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
            <Users className="w-4 h-4 mr-2" />Dolgozók ({project.workers?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="active" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
            <CheckCircle className="w-4 h-4 mr-2" />Jelenlegi dolgozók ({activeWorkers.length})
          </TabsTrigger>
          <TabsTrigger value="positions" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
            <Briefcase className="w-4 h-4 mr-2" />Pozíciók ({project.positions?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="trials" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
            <TestTube className="w-4 h-4 mr-2" />Próbák ({project.trials?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="waitlist" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
            <ClipboardList className="w-4 h-4 mr-2" />Várólista ({waitlist.length || 0})
          </TabsTrigger>
          <TabsTrigger value="forms" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
            <MessageSquare className="w-4 h-4 mr-2" />Űrlapok ({forms.length || 0})
            {formLeads.length > 0 && (
              <Badge className="ml-2 bg-red-600 text-white">{formLeads.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="archive" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
            <Trash2 className="w-4 h-4 mr-2" />Kuka ({archivedWorkers.length || 0})
          </TabsTrigger>
          <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3">
            <BarChart3 className="w-4 h-4 mr-2" />Összesítés
          </TabsTrigger>
        </TabsList>

        {/* Workers Tab */}
        <TabsContent value="workers" className="p-0 mt-0">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground">Dolgozók kezelése</span>
            <Button variant="outline" size="sm" onClick={() => setShowAddWorker(!showAddWorker)} data-testid="toggle-add-worker">
              {showAddWorker ? <X className="w-4 h-4" /> : <><Plus className="w-4 h-4 mr-1" />Hozzáad</>}
            </Button>
          </div>

          {showAddWorker && (
            <div className="p-3 bg-muted/50 border-b border-border">
              {availableWorkers.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {availableWorkers.map(w => (
                    <div key={w.id} className="flex items-center justify-between p-2 bg-card rounded border border-border text-sm text-foreground">
                      <span className="truncate">{w.name}</span>
                      <Button size="sm" className="h-6 w-6 p-0 bg-primary" onClick={() => handleAddWorker(w.id)}><Plus className="w-3 h-3" /></Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nincs elérhető dolgozó</p>
              )}
            </div>
          )}

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border">
                  <TableHead className="font-semibold text-foreground">Név</TableHead>
                  <TableHead className="font-semibold text-foreground">Telefon</TableHead>
                  <TableHead className="font-semibold text-foreground hidden sm:table-cell">Kategória</TableHead>
                  <TableHead className="font-semibold text-foreground hidden md:table-cell">Felvitte</TableHead>
                  <TableHead className="font-semibold text-foreground">Státusz</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {project.workers?.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Nincs dolgozó</TableCell></TableRow>
                ) : (
                  project.workers?.map(w => (
                    
                      <TableCell className="font-medium text-foreground">
                        <Link to={`/workers/${w.id}`} className="hover:text-primary">{w.name}</Link>
                      </TableCell>
                      <TableCell>
                        <a href={`tel:${w.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                          <Phone className="w-3 h-3" />{w.phone}
                        </a>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className="text-xs">{w.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{w.added_by}</TableCell>
                      <TableCell>
                        <Select value={w.status_id || ""} onValueChange={(v) => handleQuickStatusChange(w.id, v)}>
                          <SelectTrigger className={`h-8 w-[140px] ${getStatusColor(w.status_name)}`}>
                            <SelectValue placeholder="Státusz" />
                          </SelectTrigger>
                          <SelectContent>{statuses.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openStatusDialog(w)} title="Megjegyzés">
                            <MessageSquare className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveWorker(w.id)}>
                            <X className="w-4 h-4" />
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

        {/* Jelenlegi dolgozók Tab - "Dolgozik" státuszúak */}
        <TabsContent value="active" className="p-0 mt-0">
          <div className="p-3 border-b border-border">
            <span className="font-semibold text-sm text-foreground">
              Jelenlegi dolgozók (Dolgozik státuszúak) - {activeWorkers.length} fő
            </span>
            <p className="text-xs text-muted-foreground mt-1">
              Azok a dolgozók, akik jelenleg "Dolgozik" státuszban vannak ezen a projekten
            </p>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 border-border">
                  <TableHead className="font-semibold text-foreground">Név</TableHead>
                  <TableHead className="font-semibold text-foreground">Telefon</TableHead>
                  <TableHead className="font-semibold text-foreground hidden sm:table-cell">Kategória</TableHead>
                  <TableHead className="font-semibold text-foreground hidden md:table-cell">Munkakezdés</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeWorkers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Nincs jelenleg dolgozó</TableCell></TableRow>
                ) : (
                  activeWorkers.map(w => (
                    <TableRow key={w.id} className="border-border">
                      <TableCell className="font-medium text-foreground">
                        <Link to={`/workers/${w.id}`} className="hover:text-primary">{w.name}</Link>
                      </TableCell>
                      <TableCell>
                        <a href={`tel:${w.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                          <Phone className="w-3 h-3" />{w.phone}
                        </a>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">{w.category || '-'}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {w.created_at ? new Date(w.created_at).toLocaleDateString('hu-HU') : '-'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Link to={`/workers/${w.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </Link>
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
            {user?.role === "admin" && (
              <Button variant="outline" size="sm" onClick={() => openPositionDialog()} data-testid="add-position-btn">
                <Plus className="w-4 h-4 mr-1" />Új pozíció
              </Button>
            )}
          </div>

          {project.positions?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Briefcase className="w-12 h-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>Még nincs pozíció létrehozva</p>
              {user?.role === "admin" && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => openPositionDialog()}>
                  <Plus className="w-4 h-4 mr-1" />Első pozíció létrehozása
                </Button>
              )}
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
                        {user?.role === "admin" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPositionDialog(pos)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeletePosition(pos.id)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    {pos.work_schedule && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-3 h-3" /><span>Munkarend: {pos.work_schedule}</span>
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
                        <Briefcase className="w-3 h-3" /><span className="font-medium">Részletek: {pos.position_details}</span>
                      </div>
                    )}
                    {pos.notes && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ClipboardList className="w-3 h-3" /><span>{pos.notes}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Trials Tab */}
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
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => openAddToTrialDialog(trial.id)}>
                        <Plus className="w-3 h-3 mr-1" />Dolgozó
                      </Button>
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
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs"
                        onClick={() => openTrialPositionDialog(trial)}
                      >
                        <Plus className="w-3 h-3 mr-1" />Pozíció
                      </Button>
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
                                    {pos.hourly_rate} Ft/óra
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
            leads={formLeads}
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
                <Label>Órabér (Ft/óra)</Label>
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
                  {selectedTrial.workers.slice(0, 2).map(w => {
                    const lines = [];
                    if (copyFields.name) lines.push(w.worker_name);
                    if (copyFields.position && w.position_name) lines.push(w.position_name);
                    if (copyFields.phone) lines.push(w.worker_phone);
                    if (copyFields.email && w.worker_email) lines.push(w.worker_email);
                    return lines.join('\n');
                  }).join('\n\n')}
                  {selectedTrial.workers.length > 2 && '\n\n...'}
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
      
      {/* Form Settings Dialog */}
      <FormSettingsDialog
        open={formDialog}
        onOpenChange={setFormDialog}
        projectId={id}
        form={editingForm}
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
