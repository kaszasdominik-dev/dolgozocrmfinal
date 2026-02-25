import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Phone, MapPin, Mail, Calendar, AlertTriangle, Loader2, RefreshCw, UserPlus, Trash2, TestTube, Briefcase, Clock, CheckCircle, Database, User, ArrowRight, Users, Info, Ban, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "http://localhost:8001/api";

// Kuka indokok
const KUKA_REASONS = [
  { value: "nem_felelt_meg", label: "Nem felelt meg" },
  { value: "nem_elerheto", label: "Nem elérhető" },
  { value: "visszamondta", label: "Visszamondta" },
  { value: "egyeb", label: "Saját megjegyzés" }
];

export default function FormLeadsTab({ projectId, projectName, leads, statuses, trials, positions, loading, onRefresh, onDuplicateClick, onProcessed }) {
  const [processing, setProcessing] = useState({});
  
  // ÚJ: Univerzális Projekthez adás dialog
  const [addToProjectDialog, setAddToProjectDialog] = useState(false);
  const [addToProjectLead, setAddToProjectLead] = useState(null);
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const [selectedTrialForAdd, setSelectedTrialForAdd] = useState("");
  const [selectedPositionForAdd, setSelectedPositionForAdd] = useState("");
  const [selectedPositionIds, setSelectedPositionIds] = useState([]); // Projekt pozíciók (többszörös kiválasztás)
  
  // Próba kiválasztó dialog
  const [trialSelectDialog, setTrialSelectDialog] = useState(false);
  const [selectedTrialId, setSelectedTrialId] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [pendingLeadId, setPendingLeadId] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  
  // Hozzáadás a fő adatbázishoz dialog
  const [addToDbDialog, setAddToDbDialog] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [workerForm, setWorkerForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    category: "Ingázós",
    work_type: "Ingázó",
    has_car: "",
    position: "",
    notes: ""
  });
  
  // Duplikátum kezelő dialog
  const [duplicateDialog, setDuplicateDialog] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState(null);
  
  // Kuka dialog (nem felelt meg indokkal)
  const [kukaDialog, setKukaDialog] = useState(false);
  const [kukaLeadId, setKukaLeadId] = useState(null);
  const [kukaLead, setKukaLead] = useState(null);
  const [kukaReason, setKukaReason] = useState("");
  const [kukaCustomReason, setKukaCustomReason] = useState("");
  
  // Lapozás a teljesítmény javításához
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20; // Max 20 elem/oldal
  
  // Kiválasztott próba adatai
  const selectedTrial = trials?.find(t => t.id === selectedTrialId);
  
  // Státusz ID keresése név alapján
  const getStatusIdByName = (statusName) => {
    const status = statuses?.find(s => s.name === statusName);
    return status?.id || null;
  };
  
  // Lead hozzáadása státusszal
  const handleAddWithStatus = async (leadId, statusName, trialId = null, positionId = null) => {
    if (!statusName) {
      toast.error("Válassz státuszt!");
      return;
    }
    
    // Ha "Próba megbeszélve" és nincs trial kiválasztva
    if (statusName === "Próba megbeszélve") {
      if (!trials || trials.length === 0) {
        toast.error("Nincs próba létrehozva! Először hozz létre egy próbát a 'Próbák' fülön.");
        return;
      }
      
      if (!trialId) {
        setPendingLeadId(leadId);
        setPendingAction("proba_megbeszelve");
        setSelectedTrialId("");
        setSelectedPositionId("");
        setTrialSelectDialog(true);
        return;
      }
    }
    
    const statusId = getStatusIdByName(statusName);
    if (!statusId) {
      toast.error("Státusz nem található");
      return;
    }
    
    setProcessing({ ...processing, [leadId]: statusName });
    try {
      const requestData = { status_id: statusId };
      if (trialId) {
        requestData.trial_id = trialId;
      }
      if (positionId) {
        requestData.trial_position_id = positionId;
      }
      
      await axios.post(`${API}/form-leads/${leadId}/add-to-project`, requestData);
      toast.success(`Dolgozó hozzáadva: ${statusName}`);
      onProcessed();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setProcessing({ ...processing, [leadId]: false });
    }
  };
  
  // Próba kiválasztás után
  const handleConfirmTrialAndAdd = async () => {
    if (!selectedTrialId || !pendingLeadId) {
      toast.error("Válassz ki egy próbát!");
      return;
    }
    
    setTrialSelectDialog(false);
    await handleAddWithStatus(pendingLeadId, "Próba megbeszélve", selectedTrialId, selectedPositionId || null);
    setPendingLeadId(null);
    setPendingAction(null);
    setSelectedTrialId("");
    setSelectedPositionId("");
  };
  
  // Feldolgozottnak jelölés (nem kerül a projektbe, csak kiszűrjük)
  const handleMarkProcessed = async (leadId) => {
    setProcessing({ ...processing, [leadId]: "feldolgozott" });
    try {
      await axios.post(`${API}/form-leads/${leadId}/mark-processed`);
      toast.success("Jelentkező feldolgozottnak jelölve");
      onProcessed();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setProcessing({ ...processing, [leadId]: false });
    }
  };
  
  // Végleges törlés
  const handleDelete = async (leadId) => {
    if (!window.confirm("Biztosan VÉGLEGESEN törlöd ezt a jelentkezőt? Ez nem visszavonható!")) return;
    
    setProcessing({ ...processing, [leadId]: "torles" });
    try {
      await axios.delete(`${API}/form-leads/${leadId}`);
      toast.success("Jelentkező véglegesen törölve");
      onProcessed();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setProcessing({ ...processing, [leadId]: false });
    }
  };
  
  // ÚJ: Projekthez adás dialog megnyitása
  const openAddToProjectDialog = (lead) => {
    setAddToProjectLead(lead);
    setSelectedStatusId("");
    setSelectedTrialForAdd("");
    setSelectedPositionForAdd("");
    setAddToProjectDialog(true);
  };
  
  // ÚJ: Projekthez adás megerősítése
  const handleConfirmAddToProject = async () => {
    if (!addToProjectLead || !selectedStatusId) {
      toast.error("Válassz státuszt!");
      return;
    }
    
    const selectedStatus = statuses?.find(s => s.id === selectedStatusId);
    const statusName = selectedStatus?.name;
    
    // Pozíció kötelező státuszok
    const positionRequiredStatuses = ["Próbára vár", "Dolgozik", "Próba megbeszélve"];
    
    // Ha "Próba megbeszélve" és nincs próba kiválasztva
    if (statusName === "Próba megbeszélve" && !selectedTrialForAdd) {
      toast.error("Válassz próbát!");
      return;
    }
    
    // Ha pozíció kötelező státusz és nincs pozíció kiválasztva
    if (positionRequiredStatuses.includes(statusName) && selectedPositionIds.length === 0) {
      toast.error(`A "${statusName}" státuszhoz kötelező legalább egy pozíciót választani!`);
      return;
    }
    
    setProcessing({ ...processing, [addToProjectLead.id]: "projekthez_adas" });
    try {
      const requestData = { 
        status_id: selectedStatusId,
        position_ids: selectedPositionIds
      };
      if (selectedTrialForAdd) {
        requestData.trial_id = selectedTrialForAdd;
      }
      if (selectedPositionForAdd) {
        requestData.trial_position_id = selectedPositionForAdd;
      }
      
      await axios.post(`${API}/form-leads/${addToProjectLead.id}/add-to-project`, requestData);
      toast.success(`Dolgozó hozzáadva: ${statusName}`);
      setAddToProjectDialog(false);
      setSelectedStatusId("");
      setSelectedTrialForAdd("");
      setSelectedPositionForAdd("");
      setSelectedPositionIds([]);
      onProcessed();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setProcessing({ ...processing, [addToProjectLead.id]: false });
    }
  };
  
  // Kuka dialog megnyitása (nem felelt meg)
  const openKukaDialog = (lead) => {
    setKukaLead(lead);
    setKukaLeadId(lead.id);
    setKukaReason("");
    setKukaCustomReason("");
    setKukaDialog(true);
  };
  
  // Kuka - hozzáadás a fő adatbázishoz "Kuka" státusszal
  const handleAddToKuka = async () => {
    if (!kukaLeadId || !kukaReason) {
      toast.error("Válassz indokot!");
      return;
    }
    
    const selectedReason = KUKA_REASONS.find(r => r.value === kukaReason);
    const finalReason = kukaReason === "egyeb" ? kukaCustomReason : (selectedReason?.label || kukaReason);
    
    if (kukaReason === "egyeb" && !kukaCustomReason.trim()) {
      toast.error("Add meg a saját megjegyzést!");
      return;
    }
    
    setProcessing({ ...processing, [kukaLeadId]: "kuka" });
    try {
      const today = new Date().toLocaleDateString('hu-HU');
      const notes = `[KUKA - ${projectName}] ${today}\nIndok: ${finalReason}`;
      
      await axios.post(`${API}/form-leads/${kukaLeadId}/add-to-kuka`, {
        reason: finalReason,
        notes: notes
      });
      
      toast.success("Dolgozó hozzáadva a Kukába");
      setKukaDialog(false);
      setKukaReason("");
      setKukaCustomReason("");
      onProcessed();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setProcessing({ ...processing, [kukaLeadId]: false });
    }
  };
  
  // Hozzáadás a fő adatbázishoz dialog megnyitása
  const openAddToDbDialog = (lead) => {
    setSelectedLead(lead);
    setWorkerForm({
      name: lead.name || "",
      phone: lead.phone || "",
      address: lead.address || "",
      email: lead.email || "",
      category: "Ingázós",
      work_type: "Ingázó",
      has_car: "",
      position: "",
      notes: lead.notes || ""
    });
    setAddToDbDialog(true);
  };
  
  // Hozzáadás a fő adatbázishoz
  const handleAddToMainDb = async () => {
    if (!selectedLead) return;
    
    if (!workerForm.name.trim() || !workerForm.phone.trim()) {
      toast.error("Név és telefonszám kötelező!");
      return;
    }
    
    setProcessing({ ...processing, [selectedLead.id]: "database" });
    try {
      const today = new Date().toLocaleDateString('hu-HU');
      const autoNote = `Űrlap: ${projectName || 'Projekt'} - ${today}`;
      const finalNotes = workerForm.notes ? `${workerForm.notes}\n---\n${autoNote}` : autoNote;
      
      const response = await axios.post(`${API}/form-leads/${selectedLead.id}/add-to-database`, {
        ...workerForm,
        notes: finalNotes
      });
      
      // Ellenőrizzük, van-e duplikátum
      if (response.data.duplicate) {
        setDuplicateInfo({
          newWorker: response.data.new_worker,
          existingWorker: response.data.existing_worker,
          leadId: selectedLead.id
        });
        setAddToDbDialog(false);
        setDuplicateDialog(true);
      } else {
        toast.success("Dolgozó hozzáadva a fő adatbázishoz!");
        setAddToDbDialog(false);
        onProcessed();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setProcessing({ ...processing, [selectedLead.id]: false });
    }
  };
  
  // Duplikátum kezelés
  const handleDuplicateAction = async (action) => {
    if (!duplicateInfo) return;
    
    try {
      await axios.post(`${API}/form-leads/${duplicateInfo.leadId}/resolve-duplicate`, {
        action: action, // "keep_new", "keep_existing", "merge_to_existing"
        existing_worker_id: duplicateInfo.existingWorker?.id
      });
      
      if (action === "keep_new") {
        toast.success("Új dolgozó megtartva, régi törölve");
      } else if (action === "keep_existing") {
        toast.success("Régi dolgozó megtartva");
      } else if (action === "merge_to_existing") {
        toast.success("Megjegyzés hozzáadva a meglévő dolgozóhoz");
      }
      
      setDuplicateDialog(false);
      setDuplicateInfo(null);
      onProcessed();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!leads || leads.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground mb-4">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Nincs új jelentkező az űrlapról</p>
          <p className="text-sm mt-2">Az űrlap óránként automatikusan frissül</p>
        </div>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Frissítés most
        </Button>
      </div>
    );
  }
  
  // Rendezés: duplikátumok előre, majd dátum szerint
  const sortedLeads = [...leads].sort((a, b) => {
    // Duplikátumok előre
    if (a.is_duplicate && !b.is_duplicate) return -1;
    if (!a.is_duplicate && b.is_duplicate) return 1;
    // Dátum szerint (újabbak előre)
    return new Date(b.submitted_at) - new Date(a.submitted_at);
  });
  
  const unprocessedLeads = sortedLeads.filter(l => !l.is_duplicate);
  const duplicateLeads = sortedLeads.filter(l => l.is_duplicate);
  
  // Lapozás számítása
  const totalPages = Math.ceil(unprocessedLeads.length / itemsPerPage);
  const paginatedLeads = unprocessedLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  return (
    <>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground">
              {leads.length} új jelentkező
            </h3>
            <p className="text-sm text-muted-foreground">
              {unprocessedLeads.length} feldolgozatlan, {duplicateLeads.length} duplikátum
            </p>
          </div>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Frissítés
          </Button>
        </div>
        
        {/* Duplikátumok először (ha vannak) - max 10 */}
        {duplicateLeads.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-yellow-600 dark:text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Duplikátumok ({duplicateLeads.length}) - Ellenőrizd!
            </h4>
            {duplicateLeads.slice(0, 10).map(lead => (
              <Card key={lead.id} className="border-l-4 border-l-yellow-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-600" />
                        <h4 className="font-medium text-lg text-foreground">{lead.name}</h4>
                        <Badge className="bg-yellow-600 text-white text-xs">Duplikátum</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {lead.phone}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(lead.submitted_at).toLocaleString('hu-HU')}
                        </span>
                      </div>
                      <div className="mt-2 p-2 bg-yellow-500/10 rounded text-sm dark:bg-yellow-900/20">
                        <p className="text-yellow-700 dark:text-yellow-400">
                          ⚠️ Már létezik ilyen nevű dolgozó: <strong>{lead.duplicate_worker?.name}</strong>
                          {lead.duplicate_worker?.created_at && (
                            <span className="text-xs ml-2">
                              (felvéve: {new Date(lead.duplicate_worker.created_at).toLocaleDateString('hu-HU')})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDuplicateClick(lead)}
                    >
                      🔍 Összehasonlítás és döntés
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300"
                      onClick={() => handleDelete(lead.id)}
                      disabled={processing[lead.id]}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Törlés
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        
        {/* Új jelentkezők */}
        {unprocessedLeads.length > 0 && (
          <div className="space-y-3">
            {duplicateLeads.length > 0 && (
              <h4 className="font-medium text-sm text-green-600 dark:text-green-400 flex items-center gap-2 pt-4 border-t">
                <UserPlus className="w-4 h-4" />
                Új jelentkezők ({unprocessedLeads.length})
                {totalPages > 1 && (
                  <span className="text-muted-foreground text-xs ml-2">
                    (Oldal {currentPage}/{totalPages}, {itemsPerPage} elem/oldal)
                  </span>
                )}
              </h4>
            )}
            {paginatedLeads.map(lead => (
              <Card key={lead.id} className="border-l-4 border-l-green-500">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-lg text-foreground">{lead.name}</h4>
                        <Badge className="bg-green-600 text-white text-xs">Új</Badge>
                        {lead.position && (
                          <Badge variant="outline" className="text-xs">{lead.position}</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${lead.phone}`} className="hover:text-primary">{lead.phone}</a>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(lead.submitted_at).toLocaleString('hu-HU')}
                        </span>
                        {lead.address && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {lead.address}
                          </span>
                        )}
                      </div>
                      {lead.notes && (
                        <p className="text-sm mt-2 p-2 bg-muted/50 rounded text-foreground">{lead.notes}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <TooltipProvider delayDuration={200}>
                    {/* Műveletek sorrendben */}
                    <div className="space-y-2">
                      {/* ÚJ: Univerzális Projekthez adás gomb */}
                      <div className="flex flex-wrap gap-2 items-center pb-2 border-b border-border/50">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={() => openAddToProjectDialog(lead)}
                              disabled={!!processing[lead.id]}
                            >
                              {processing[lead.id] === "projekthez_adas" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><ArrowRight className="w-3 h-3 mr-1" />Projekthez adás</>}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Válaszd ki a státuszt és próbát</p></TooltipContent>
                        </Tooltip>
                      </div>
                      
                      {/* Projekt státuszok */}
                      <div className="flex flex-wrap gap-2 items-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleAddWithStatus(lead.id, "Dolgozik")}
                              disabled={!!processing[lead.id]}
                            >
                              {processing[lead.id] === "Dolgozik" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Briefcase className="w-3 h-3 mr-1" />Dolgozik</>}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Már aktívan dolgozik a projekten</p></TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={() => handleAddWithStatus(lead.id, "Próba megbeszélve")}
                              disabled={!!processing[lead.id]}
                            >
                              {processing[lead.id] === "Próba megbeszélve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><TestTube className="w-3 h-3 mr-1" />Próba megbeszélve</>}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Próbanap időpontja egyeztetve</p></TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              className="bg-amber-500 hover:bg-amber-600 text-white"
                              onClick={() => handleAddWithStatus(lead.id, "Próbára vár")}
                              disabled={!!processing[lead.id]}
                            >
                              {processing[lead.id] === "Próbára vár" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Clock className="w-3 h-3 mr-1" />Próbára vár</>}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Várólista - próbanap egyeztetésre vár</p></TooltipContent>
                        </Tooltip>
                      </div>
                      
                      {/* Egyéb műveletek */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 items-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAddToDbDialog(lead)}
                              disabled={!!processing[lead.id]}
                            >
                              <Database className="w-3 h-3 mr-1" />
                              Fő adatbázishoz
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Hozzáadás a fő adatbázishoz (projekt nélkül)</p></TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
                              onClick={() => handleMarkProcessed(lead.id)}
                              disabled={!!processing[lead.id]}
                            >
                              {processing[lead.id] === "feldolgozott" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Clock className="w-3 h-3 mr-1" />Feldolgozatlan</>}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Később térünk vissza rá (eltűnik a listáról)</p></TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 dark:text-orange-400"
                              onClick={() => openKukaDialog(lead)}
                              disabled={!!processing[lead.id]}
                            >
                              {processing[lead.id] === "kuka" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Ban className="w-3 h-3 mr-1" />Kuka</>}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Nem megfelelő - elutasítás indokkal</p></TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                              onClick={() => handleDelete(lead.id)}
                              disabled={!!processing[lead.id]}
                            >
                              {processing[lead.id] === "torles" ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-3 h-3 mr-1" />Törlés</>}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent><p>Végleges törlés (nem kerül adatbázisba)</p></TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </TooltipProvider>
                </CardContent>
              </Card>
            ))}
            
            {/* Lapozó gombok */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                >
                  Első
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Előző
                </Button>
                <span className="px-4 text-sm text-muted-foreground">
                  {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Következő
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Utolsó
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Próba kiválasztó dialog */}
      <Dialog open={trialSelectDialog} onOpenChange={setTrialSelectDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-600">
              <TestTube className="w-5 h-5" />
              Próba és pozíció kiválasztása
            </DialogTitle>
            <DialogDescription>
              Válaszd ki a próbát és a pozíciót.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Próba kiválasztás */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Próba *</Label>
              {trials && trials.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {trials.map(trial => (
                    <div 
                      key={trial.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedTrialId === trial.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        setSelectedTrialId(trial.id);
                        setSelectedPositionId(""); // Reset position when trial changes
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
                        <Badge variant="secondary" className="text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {trial.worker_count || 0} fő
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">Nincs próba létrehozva</p>
              )}
            </div>
            
            {/* Pozíció kiválasztás (csak ha van kiválasztott próba) */}
            {selectedTrialId && selectedTrial?.positions && selectedTrial.positions.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label className="text-sm font-medium">Pozíció (opcionális)</Label>
                <div className="space-y-2">
                  {selectedTrial.positions.map(pos => (
                    <div 
                      key={pos.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-all ${
                        selectedPositionId === pos.id 
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedPositionId(selectedPositionId === pos.id ? "" : pos.id)}
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
            
            {selectedTrialId && (!selectedTrial?.positions || selectedTrial.positions.length === 0) && (
              <p className="text-sm text-muted-foreground border-t pt-4">
                ℹ️ Nincs pozíció definiálva ehhez a próbához.
              </p>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setTrialSelectDialog(false);
              setSelectedTrialId("");
              setSelectedPositionId("");
            }}>
              Mégse
            </Button>
            <Button onClick={handleConfirmTrialAndAdd} disabled={!selectedTrialId} className="bg-blue-600 hover:bg-blue-700">
              <TestTube className="w-4 h-4 mr-2" />
              Próba megbeszélve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Hozzáadás a fő adatbázishoz dialog */}
      <Dialog open={addToDbDialog} onOpenChange={setAddToDbDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Hozzáadás a fő adatbázishoz
            </DialogTitle>
            <DialogDescription>
              Töltsd ki a hiányzó adatokat és add hozzá a dolgozót a fő adatbázishoz.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Név *</Label>
                <Input
                  value={workerForm.name}
                  onChange={(e) => setWorkerForm({...workerForm, name: e.target.value})}
                  placeholder="Teljes név"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefonszám *</Label>
                <Input
                  value={workerForm.phone}
                  onChange={(e) => setWorkerForm({...workerForm, phone: e.target.value})}
                  placeholder="+36..."
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategória</Label>
                <Select value={workerForm.category} onValueChange={(val) => setWorkerForm({...workerForm, category: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ingázós">Ingázós</SelectItem>
                    <SelectItem value="Szállásos">Szállásos</SelectItem>
                    <SelectItem value="Felvitt dolgozók">Felvitt dolgozók</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Munkavégzés típusa</Label>
                <Select value={workerForm.work_type} onValueChange={(val) => setWorkerForm({...workerForm, work_type: val})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ingázó">Ingázó</SelectItem>
                    <SelectItem value="Szállásos">Szállásos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lakóhely</Label>
                <Input
                  value={workerForm.address}
                  onChange={(e) => setWorkerForm({...workerForm, address: e.target.value})}
                  placeholder="Város"
                />
              </div>
              <div className="space-y-2">
                <Label>Saját autó</Label>
                <Select value={workerForm.has_car} onValueChange={(val) => setWorkerForm({...workerForm, has_car: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Nincs">Nincs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={workerForm.email}
                onChange={(e) => setWorkerForm({...workerForm, email: e.target.value})}
                placeholder="email@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Pozíció</Label>
              <Input
                value={workerForm.position}
                onChange={(e) => setWorkerForm({...workerForm, position: e.target.value})}
                placeholder="pl. CNC gépkezelő"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Megjegyzés</Label>
              <Textarea
                value={workerForm.notes}
                onChange={(e) => setWorkerForm({...workerForm, notes: e.target.value})}
                placeholder="További információk..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Automatikusan hozzáadódik: "Űrlap: {projectName} - {new Date().toLocaleDateString('hu-HU')}"
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddToDbDialog(false)}>Mégse</Button>
            <Button onClick={handleAddToMainDb} disabled={processing[selectedLead?.id]}>
              {processing[selectedLead?.id] === "database" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Database className="w-4 h-4 mr-2" />
              )}
              Hozzáadás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Duplikátum kezelő dialog */}
      <Dialog open={duplicateDialog} onOpenChange={setDuplicateDialog}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="w-5 h-5" />
              Duplikátum észlelve!
            </DialogTitle>
            <DialogDescription>
              Már létezik ilyen nevű dolgozó az adatbázisban. Válaszd ki mit szeretnél tenni.
            </DialogDescription>
          </DialogHeader>
          
          {duplicateInfo && (
            <div className="space-y-4 py-4">
              {/* Régi dolgozó */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">MEGLÉVŐ (régebbi)</span>
                </div>
                <h4 className="font-semibold text-foreground">{duplicateInfo.existingWorker?.name}</h4>
                <div className="text-sm text-muted-foreground mt-1">
                  <p>📞 {duplicateInfo.existingWorker?.phone}</p>
                  {duplicateInfo.existingWorker?.address && <p>📍 {duplicateInfo.existingWorker?.address}</p>}
                  <p className="text-xs mt-1">Felvéve: {new Date(duplicateInfo.existingWorker?.created_at).toLocaleDateString('hu-HU')}</p>
                </div>
              </div>
              
              <div className="flex justify-center">
                <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
              </div>
              
              {/* Új dolgozó */}
              <div className="p-4 border rounded-lg border-green-300 bg-green-50/50 dark:bg-green-900/10">
                <div className="flex items-center gap-2 mb-2">
                  <UserPlus className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">ÚJ (űrlapról)</span>
                </div>
                <h4 className="font-semibold text-foreground">{duplicateInfo.newWorker?.name}</h4>
                <div className="text-sm text-muted-foreground mt-1">
                  <p>📞 {duplicateInfo.newWorker?.phone}</p>
                  {duplicateInfo.newWorker?.address && <p>📍 {duplicateInfo.newWorker?.address}</p>}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => handleDuplicateAction("merge_to_existing")}
              className="w-full sm:w-auto"
            >
              Meglévőhöz hozzáadás (megjegyzésbe)
            </Button>
            <Button
              variant="outline"
              onClick={() => handleDuplicateAction("keep_existing")}
              className="w-full sm:w-auto"
            >
              Régi megtartása, új elvetése
            </Button>
            <Button
              onClick={() => handleDuplicateAction("keep_new")}
              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
            >
              Új megtartása, régi törlése
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Kuka - elutasítás indokkal dialog */}
      <Dialog open={kukaDialog} onOpenChange={setKukaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Ban className="w-5 h-5" />
              Kuka - Elutasítás indokkal
            </DialogTitle>
            <DialogDescription>
              A jelentkező adatai elmentődnek az adatbázisba "Kuka" státusszal.
            </DialogDescription>
          </DialogHeader>
          
          {kukaLead && (
            <div className="py-2">
              <div className="p-3 bg-muted/50 rounded-lg mb-4">
                <p className="font-medium text-foreground">{kukaLead.name}</p>
                <p className="text-sm text-muted-foreground">{kukaLead.phone}</p>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Elutasítás indoka *</Label>
                  <Select value={kukaReason} onValueChange={setKukaReason}>
                    <SelectTrigger>
                      <SelectValue placeholder="Válassz indokot..." />
                    </SelectTrigger>
                    <SelectContent>
                      {KUKA_REASONS.map(reason => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {kukaReason === "egyeb" && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Saját megjegyzés *</Label>
                    <Textarea
                      value={kukaCustomReason}
                      onChange={(e) => setKukaCustomReason(e.target.value)}
                      placeholder="Írd le az elutasítás okát..."
                      rows={3}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setKukaDialog(false);
              setKukaReason("");
              setKukaCustomReason("");
            }}>
              Mégse
            </Button>
            <Button 
              onClick={handleAddToKuka} 
              disabled={!kukaReason || (kukaReason === "egyeb" && !kukaCustomReason.trim()) || processing[kukaLeadId]}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {processing[kukaLeadId] === "kuka" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Ban className="w-4 h-4 mr-2" />
              )}
              Kukába
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* ÚJ: Univerzális Projekthez adás dialog */}
      <Dialog open={addToProjectDialog} onOpenChange={setAddToProjectDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-indigo-600">
              <ArrowRight className="w-5 h-5" />
              Projekthez adás
            </DialogTitle>
            <DialogDescription>
              Válaszd ki a státuszt és opcionálisan a próbát.
            </DialogDescription>
          </DialogHeader>
          
          {addToProjectLead && (
            <div className="space-y-4 py-4">
              {/* Jelentkező adatai */}
              <div className="p-3 bg-muted/50 rounded-lg mb-4">
                <p className="font-medium text-foreground">{addToProjectLead.name}</p>
                <p className="text-sm text-muted-foreground">{addToProjectLead.phone}</p>
              </div>
              
              {/* Státusz kiválasztás */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Státusz *</Label>
                <Select value={selectedStatusId} onValueChange={(val) => {
                  setSelectedStatusId(val);
                  setSelectedPositionIds([]); // Reset pozíciók státusz változáskor
                  setSelectedTrialForAdd("");
                  setSelectedPositionForAdd("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz státuszt..." />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses && statuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Pozíció választó - Próbára vár, Dolgozik, Próba megbeszélve státuszoknál (kötelező) */}
              {selectedStatusId && ["Próbára vár", "Dolgozik", "Próba megbeszélve"].includes(statuses?.find(s => s.id === selectedStatusId)?.name) && (
                <div className="space-y-2 border-t pt-4">
                  <Label className="text-sm font-medium">Pozíció(k) * <span className="text-xs text-muted-foreground">(kötelező)</span></Label>
                  {positions && positions.length > 0 ? (
                    <div className="flex flex-wrap gap-2 p-3 border rounded-lg bg-muted/30">
                      {positions.map(pos => (
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
                    <p className="text-sm text-amber-600 p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                      Nincs pozíció ehhez a projekthez. Először adj hozzá pozíciókat a "Pozíciók" fülön!
                    </p>
                  )}
                </div>
              )}
              
              {/* Ha "Próba megbeszélve", akkor próba választó */}
              {statuses?.find(s => s.id === selectedStatusId)?.name === "Próba megbeszélve" && (
                <>
                  <div className="space-y-2 border-t pt-4">
                    <Label className="text-sm font-medium">Próba *</Label>
                    {trials && trials.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {trials.map(trial => (
                          <div 
                            key={trial.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedTrialForAdd === trial.id 
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => {
                              setSelectedTrialForAdd(trial.id);
                              setSelectedPositionForAdd(""); // Reset position
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
                              <Badge variant="secondary" className="text-xs">
                                <Users className="w-3 h-3 mr-1" />
                                {trial.worker_count || 0} fő
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">Nincs próba létrehozva</p>
                    )}
                  </div>
                  
                  {/* Pozíció kiválasztás (ha van próba kiválasztva) */}
                  {selectedTrialForAdd && trials?.find(t => t.id === selectedTrialForAdd)?.positions?.length > 0 && (
                    <div className="space-y-2 border-t pt-4">
                      <Label className="text-sm font-medium">Pozíció (opcionális)</Label>
                      <div className="space-y-2">
                        {trials.find(t => t.id === selectedTrialForAdd).positions.map(pos => (
                          <div 
                            key={pos.id}
                            className={`p-3 border rounded-lg cursor-pointer transition-all ${
                              selectedPositionForAdd === pos.id 
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                : 'border-border hover:border-primary/50'
                            }`}
                            onClick={() => setSelectedPositionForAdd(selectedPositionForAdd === pos.id ? "" : pos.id)}
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
                </>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setAddToProjectDialog(false);
              setSelectedStatusId("");
              setSelectedTrialForAdd("");
              setSelectedPositionForAdd("");
              setSelectedPositionIds([]);
            }}>
              Mégse
            </Button>
            <Button 
              onClick={handleConfirmAddToProject} 
              disabled={
                !selectedStatusId || 
                (statuses?.find(s => s.id === selectedStatusId)?.name === "Próba megbeszélve" && !selectedTrialForAdd) ||
                (["Próbára vár", "Dolgozik", "Próba megbeszélve"].includes(statuses?.find(s => s.id === selectedStatusId)?.name) && selectedPositionIds.length === 0)
              } 
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {processing[addToProjectLead?.id] === "projekthez_adas" ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              Projekthez adás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
