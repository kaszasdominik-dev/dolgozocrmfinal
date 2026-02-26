import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Mail, Settings, FileText, Users, Send, Plus, Edit2, Trash2, 
  Loader2, CheckCircle, XCircle, Clock, Pause, Play, AlertCircle,
  Link2, Unlink, RefreshCw, Search, Filter, ChevronRight
} from "lucide-react";

export default function BulkEmailPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("send");
  const [loading, setLoading] = useState(true);
  
  // Gmail status
  const [gmailStatus, setGmailStatus] = useState(null);
  const [connectingGmail, setConnectingGmail] = useState(false);
  
  // Templates
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [workerTemplates, setWorkerTemplates] = useState([]);
  
  // Campaigns
  const [campaigns, setCampaigns] = useState([]);
  
  // Workers for selection
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState([]);
  const [workerSearch, setWorkerSearch] = useState("");
  const [workerFilter, setWorkerFilter] = useState("all");
  
  // Dialogs
  const [emailTemplateDialog, setEmailTemplateDialog] = useState(false);
  const [workerTemplateDialog, setWorkerTemplateDialog] = useState(false);
  const [sendEmailDialog, setSendEmailDialog] = useState(false);
  const [editingEmailTemplate, setEditingEmailTemplate] = useState(null);
  const [editingWorkerTemplate, setEditingWorkerTemplate] = useState(null);
  
  // Forms
  const [emailTemplateForm, setEmailTemplateForm] = useState({ name: "", subject: "", body: "" });
  const [workerTemplateForm, setWorkerTemplateForm] = useState({ name: "" });
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    email_template_id: "",
    subject: "",
    body: "",
    send_method: "individual"
  });

  useEffect(() => {
    // Handle OAuth callback
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    
    if (success === 'gmail_connected') {
      toast.success("Gmail fiók sikeresen kapcsolva!");
      window.history.replaceState({}, '', '/bulk-email');
    } else if (error) {
      toast.error("Gmail kapcsolódási hiba: " + error);
      window.history.replaceState({}, '', '/bulk-email');
    }
    
    fetchAllData();
  }, [searchParams]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchGmailStatus(),
        fetchEmailTemplates(),
        fetchWorkerTemplates(),
        fetchCampaigns(),
        fetchWorkers()
      ]);
    } catch (e) {
      console.error("Error fetching data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchGmailStatus = async () => {
    try {
      const res = await axios.get(`${API}/bulk-email/gmail/status`);
      setGmailStatus(res.data);
    } catch (e) {
      console.error("Error fetching Gmail status:", e);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const res = await axios.get(`${API}/bulk-email/templates`);
      setEmailTemplates(res.data);
    } catch (e) {
      console.error("Error fetching email templates:", e);
    }
  };

  const fetchWorkerTemplates = async () => {
    try {
      const res = await axios.get(`${API}/bulk-email/worker-templates`);
      setWorkerTemplates(res.data);
    } catch (e) {
      console.error("Error fetching worker templates:", e);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const res = await axios.get(`${API}/bulk-email/campaigns`);
      setCampaigns(res.data);
    } catch (e) {
      console.error("Error fetching campaigns:", e);
    }
  };

  const fetchWorkers = async () => {
    try {
      const res = await axios.get(`${API}/workers`);
      // Keep all workers, we'll show which ones have email
      setWorkers(res.data);
      setFilteredWorkers(res.data);
    } catch (e) {
      console.error("Error fetching workers:", e);
    }
  };

  // Gmail connection
  const handleConnectGmail = async () => {
    setConnectingGmail(true);
    try {
      const res = await axios.get(`${API}/bulk-email/gmail/auth-url`);
      window.location.href = res.data.auth_url;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a Gmail kapcsolódásnál");
      setConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = async () => {
    if (!window.confirm("Biztosan leválasztod a Gmail fiókodat?")) return;
    try {
      await axios.delete(`${API}/bulk-email/gmail/disconnect`);
      toast.success("Gmail fiók leválasztva");
      setGmailStatus({ connected: false });
    } catch (e) {
      toast.error("Hiba a leválasztásnál");
    }
  };

  // Email templates
  const openEmailTemplateDialog = (template = null) => {
    if (template) {
      setEditingEmailTemplate(template);
      setEmailTemplateForm({
        name: template.name,
        subject: template.subject,
        body: template.body
      });
    } else {
      setEditingEmailTemplate(null);
      setEmailTemplateForm({ name: "", subject: "", body: "" });
    }
    setEmailTemplateDialog(true);
  };

  const handleSaveEmailTemplate = async () => {
    if (!emailTemplateForm.name || !emailTemplateForm.subject || !emailTemplateForm.body) {
      toast.error("Minden mező kitöltése kötelező");
      return;
    }
    
    try {
      if (editingEmailTemplate) {
        await axios.put(`${API}/bulk-email/templates/${editingEmailTemplate.id}`, emailTemplateForm);
        toast.success("Sablon frissítve");
      } else {
        await axios.post(`${API}/bulk-email/templates`, emailTemplateForm);
        toast.success("Sablon létrehozva");
      }
      setEmailTemplateDialog(false);
      fetchEmailTemplates();
    } catch (e) {
      toast.error("Hiba a mentésnél");
    }
  };

  const handleDeleteEmailTemplate = async (id) => {
    if (!window.confirm("Biztosan törlöd ezt a sablont?")) return;
    try {
      await axios.delete(`${API}/bulk-email/templates/${id}`);
      toast.success("Sablon törölve");
      fetchEmailTemplates();
    } catch (e) {
      toast.error("Hiba a törlésnél");
    }
  };

  // Worker templates
  const openWorkerTemplateDialog = (template = null) => {
    if (template) {
      setEditingWorkerTemplate(template);
      setWorkerTemplateForm({ name: template.name });
      // Apply saved filters
      if (template.filters) {
        setWorkerSearch(template.filters.search || "");
        setWorkerFilter(template.filters.category || "all");
      }
    } else {
      setEditingWorkerTemplate(null);
      setWorkerTemplateForm({ name: "" });
    }
    setWorkerTemplateDialog(true);
  };

  const handleSaveWorkerTemplate = async () => {
    if (!workerTemplateForm.name) {
      toast.error("A sablon neve kötelező");
      return;
    }
    
    const data = {
      name: workerTemplateForm.name,
      filters: {
        search: workerSearch,
        category: workerFilter,
        worker_ids: selectedWorkerIds
      }
    };
    
    try {
      if (editingWorkerTemplate) {
        await axios.put(`${API}/bulk-email/worker-templates/${editingWorkerTemplate.id}`, data);
        toast.success("Dolgozó sablon frissítve");
      } else {
        await axios.post(`${API}/bulk-email/worker-templates`, data);
        toast.success("Dolgozó sablon létrehozva");
      }
      setWorkerTemplateDialog(false);
      fetchWorkerTemplates();
    } catch (e) {
      toast.error("Hiba a mentésnél");
    }
  };

  const handleDeleteWorkerTemplate = async (id) => {
    if (!window.confirm("Biztosan törlöd ezt a sablont?")) return;
    try {
      await axios.delete(`${API}/bulk-email/worker-templates/${id}`);
      toast.success("Sablon törölve");
      fetchWorkerTemplates();
    } catch (e) {
      toast.error("Hiba a törlésnél");
    }
  };

  const handleApplyWorkerTemplate = (template) => {
    if (template.filters) {
      setWorkerSearch(template.filters.search || "");
      setWorkerFilter(template.filters.category || "all");
      if (template.filters.worker_ids?.length > 0) {
        setSelectedWorkerIds(template.filters.worker_ids);
      }
    }
    toast.success(`"${template.name}" sablon alkalmazva`);
  };

  // Filter workers
  useEffect(() => {
    let filtered = workers;
    
    if (workerSearch) {
      const search = workerSearch.toLowerCase();
      filtered = filtered.filter(w => 
        w.name?.toLowerCase().includes(search) ||
        w.email?.toLowerCase().includes(search) ||
        w.phone?.includes(search)
      );
    }
    
    if (workerFilter && workerFilter !== "all") {
      filtered = filtered.filter(w => w.category === workerFilter);
    }
    
    setFilteredWorkers(filtered);
  }, [workers, workerSearch, workerFilter]);

  // Worker selection
  const handleSelectAllWorkers = (checked) => {
    if (checked) {
      setSelectedWorkerIds(filteredWorkers.map(w => w.id));
    } else {
      setSelectedWorkerIds([]);
    }
  };

  const handleSelectWorker = (workerId, checked) => {
    if (checked) {
      setSelectedWorkerIds([...selectedWorkerIds, workerId]);
    } else {
      setSelectedWorkerIds(selectedWorkerIds.filter(id => id !== workerId));
    }
  };

  // Campaign
  const openSendEmailDialog = () => {
    if (selectedWorkerIds.length === 0) {
      toast.error("Válassz ki legalább egy dolgozót!");
      return;
    }
    if (!gmailStatus?.connected) {
      toast.error("Először kapcsold össze a Gmail fiókodat!");
      setActiveTab("settings");
      return;
    }
    setCampaignForm({
      name: `Kampány ${new Date().toLocaleDateString('hu-HU')}`,
      email_template_id: "",
      subject: "",
      body: "",
      send_method: "individual"
    });
    setSendEmailDialog(true);
  };

  const handleSelectEmailTemplate = (templateId) => {
    setCampaignForm(prev => ({ ...prev, email_template_id: templateId }));
    
    if (templateId) {
      const template = emailTemplates.find(t => t.id === templateId);
      if (template) {
        setCampaignForm(prev => ({
          ...prev,
          subject: template.subject,
          body: template.body
        }));
      }
    }
  };

  const handleStartCampaign = async () => {
    if (!campaignForm.subject || !campaignForm.body) {
      toast.error("A tárgy és az üzenet szövege kötelező");
      return;
    }
    
    try {
      const data = {
        name: campaignForm.name,
        email_template_id: campaignForm.email_template_id || null,
        subject: campaignForm.subject,
        body: campaignForm.body,
        worker_ids: selectedWorkerIds,
        send_method: campaignForm.send_method
      };
      
      await axios.post(`${API}/bulk-email/campaigns`, data);
      toast.success(`Kampány elindítva! ${selectedWorkerIds.length} email a sorban.`);
      setSendEmailDialog(false);
      setSelectedWorkerIds([]);
      fetchCampaigns();
      setActiveTab("campaigns");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a kampány indításakor");
    }
  };

  // Campaign actions
  const handlePauseCampaign = async (id) => {
    try {
      await axios.put(`${API}/bulk-email/campaigns/${id}/pause`);
      toast.success("Kampány szüneteltetve");
      fetchCampaigns();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  const handleResumeCampaign = async (id) => {
    try {
      await axios.put(`${API}/bulk-email/campaigns/${id}/resume`);
      toast.success("Kampány folytatva");
      fetchCampaigns();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  const handleDeleteCampaign = async (id) => {
    if (!window.confirm("Biztosan törlöd ezt a kampányt?")) return;
    try {
      await axios.delete(`${API}/bulk-email/campaigns/${id}`);
      toast.success("Kampány törölve");
      fetchCampaigns();
    } catch (e) {
      toast.error("Hiba");
    }
  };

  // Calculate time until reset
  const getTimeUntilReset = () => {
    if (!gmailStatus?.next_reset) return "";
    const reset = new Date(gmailStatus.next_reset);
    const now = new Date();
    const diff = reset - now;
    
    if (diff <= 0) return "Hamarosan";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}ó ${minutes}p múlva`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Bulk Email</h1>
          <p className="text-muted-foreground mt-1">Tömeges email küldés dolgozóknak</p>
        </div>
        
        {/* Gmail Status Card */}
        <Card className="w-full sm:w-auto">
          <CardContent className="p-4">
            {gmailStatus?.connected ? (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">{gmailStatus.gmail_email}</p>
                  <p className="text-xs text-muted-foreground">
                    Ma küldve: {gmailStatus.sent_today}/{gmailStatus.daily_limit} • Reset: {getTimeUntilReset()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                  <Mail className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Gmail nincs kapcsolva</p>
                  <p className="text-xs text-muted-foreground">Kapcsold össze a fiókodat</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="send" className="gap-2">
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Küldés</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-2">
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Kampányok</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Sablonok</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Beállítások</span>
          </TabsTrigger>
        </TabsList>

        {/* Send Tab */}
        <TabsContent value="send" className="space-y-4">
          {/* Worker Templates Quick Select */}
          {workerTemplates.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dolgozó sablonok</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {workerTemplates.map(t => (
                    <Button
                      key={t.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyWorkerTemplate(t)}
                    >
                      <Users className="w-3 h-3 mr-1" />
                      {t.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Worker Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Dolgozók kiválasztása</CardTitle>
                  <CardDescription>
                    {selectedWorkerIds.length} kiválasztva / {filteredWorkers.length} dolgozó (csak email címmel rendelkezők)
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openWorkerTemplateDialog()}
                    disabled={selectedWorkerIds.length === 0}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Sablon mentése
                  </Button>
                  <Button
                    size="sm"
                    onClick={openSendEmailDialog}
                    disabled={selectedWorkerIds.length === 0}
                  >
                    <Send className="w-3 h-3 mr-1" />
                    Email küldés ({selectedWorkerIds.length})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Keresés név, email, telefon..."
                    value={workerSearch}
                    onChange={(e) => setWorkerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={workerFilter} onValueChange={setWorkerFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Kategória" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes</SelectItem>
                    <SelectItem value="Ingázós">Ingázós</SelectItem>
                    <SelectItem value="Szállásos">Szállásos</SelectItem>
                    <SelectItem value="Felvitt dolgozók">Felvitt dolgozók</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Worker Table */}
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredWorkers.length > 0 && selectedWorkerIds.length === filteredWorkers.length}
                          onCheckedChange={handleSelectAllWorkers}
                        />
                      </TableHead>
                      <TableHead>Név</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefon</TableHead>
                      <TableHead>Kategória</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredWorkers.slice(0, 100).map(worker => (
                      <TableRow key={worker.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedWorkerIds.includes(worker.id)}
                            onCheckedChange={(checked) => handleSelectWorker(worker.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{worker.name}</TableCell>
                        <TableCell>{worker.email}</TableCell>
                        <TableCell>{worker.phone}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{worker.category || "-"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredWorkers.length > 100 && (
                  <div className="p-3 text-center text-sm text-muted-foreground border-t">
                    Első 100 dolgozó megjelenítve. Használj szűrőt a pontosabb kereséshez.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Kampányok</CardTitle>
                <Button variant="outline" size="sm" onClick={fetchCampaigns}>
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Frissítés
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {campaigns.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Még nincs kampány</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map(campaign => (
                    <Card key={campaign.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{campaign.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {new Date(campaign.created_at).toLocaleString('hu-HU')}
                            </p>
                          </div>
                          <Badge
                            variant={
                              campaign.status === 'completed' ? 'default' :
                              campaign.status === 'in_progress' ? 'secondary' :
                              campaign.status === 'paused' ? 'outline' : 'secondary'
                            }
                          >
                            {campaign.status === 'completed' && <CheckCircle className="w-3 h-3 mr-1" />}
                            {campaign.status === 'in_progress' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                            {campaign.status === 'paused' && <Pause className="w-3 h-3 mr-1" />}
                            {campaign.status === 'queued' && <Clock className="w-3 h-3 mr-1" />}
                            {campaign.status === 'completed' ? 'Kész' :
                             campaign.status === 'in_progress' ? 'Folyamatban' :
                             campaign.status === 'paused' ? 'Szüneteltetve' : 'Sorban'}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Elküldve: {campaign.sent_count} / {campaign.total_recipients}</span>
                            <span>{Math.round((campaign.sent_count / campaign.total_recipients) * 100)}%</span>
                          </div>
                          <Progress value={(campaign.sent_count / campaign.total_recipients) * 100} />
                          
                          {campaign.failed_count > 0 && (
                            <p className="text-sm text-red-500">
                              <XCircle className="w-3 h-3 inline mr-1" />
                              {campaign.failed_count} sikertelen
                            </p>
                          )}
                          
                          {campaign.pending_count > 0 && campaign.status !== 'completed' && (
                            <p className="text-sm text-muted-foreground">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {campaign.pending_count} várakozik
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2 mt-3">
                          {campaign.status === 'paused' && (
                            <Button size="sm" variant="outline" onClick={() => handleResumeCampaign(campaign.id)}>
                              <Play className="w-3 h-3 mr-1" />
                              Folytatás
                            </Button>
                          )}
                          {(campaign.status === 'queued' || campaign.status === 'in_progress') && (
                            <Button size="sm" variant="outline" onClick={() => handlePauseCampaign(campaign.id)}>
                              <Pause className="w-3 h-3 mr-1" />
                              Szünet
                            </Button>
                          )}
                          <Button size="sm" variant="destructive" onClick={() => handleDeleteCampaign(campaign.id)}>
                            <Trash2 className="w-3 h-3 mr-1" />
                            Törlés
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-4">
          {/* Email Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Email sablonok</CardTitle>
                  <CardDescription>Email szöveg sablonok tömeges küldéshez</CardDescription>
                </div>
                <Button size="sm" onClick={() => openEmailTemplateDialog()}>
                  <Plus className="w-4 h-4 mr-1" />
                  Új sablon
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {emailTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Még nincs email sablon</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => openEmailTemplateDialog()}>
                    <Plus className="w-3 h-3 mr-1" />
                    Első sablon létrehozása
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {emailTemplates.map(template => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{template.name}</h4>
                        <p className="text-sm text-muted-foreground truncate">Tárgy: {template.subject}</p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="icon" onClick={() => openEmailTemplateDialog(template)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteEmailTemplate(template.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Worker Templates */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Dolgozó sablonok</CardTitle>
                  <CardDescription>Mentett dolgozó szűrések gyors kiválasztáshoz</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {workerTemplates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Még nincs dolgozó sablon</p>
                  <p className="text-sm mt-1">Válassz ki dolgozókat a "Küldés" tabon és mentsd el sablonként</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {workerTemplates.map(template => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{template.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {template.filters?.worker_ids?.length || 0} dolgozó mentve
                        </p>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button variant="ghost" size="icon" onClick={() => handleApplyWorkerTemplate(template)}>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDeleteWorkerTemplate(template.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Template Variables Help */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Használható változók</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <code className="bg-muted px-2 py-1 rounded">{"{név}"}</code>
                <code className="bg-muted px-2 py-1 rounded">{"{telefon}"}</code>
                <code className="bg-muted px-2 py-1 rounded">{"{email}"}</code>
                <code className="bg-muted px-2 py-1 rounded">{"{lakóhely}"}</code>
                <code className="bg-muted px-2 py-1 rounded">{"{pozíció}"}</code>
                <code className="bg-muted px-2 py-1 rounded">{"{megjegyzés}"}</code>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Ezek a változók automatikusan behelyettesítődnek minden dolgozó adataival.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gmail fiók</CardTitle>
              <CardDescription>
                Kapcsold össze a Gmail fiókodat az email küldéshez
              </CardDescription>
            </CardHeader>
            <CardContent>
              {gmailStatus?.connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-full">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-green-800 dark:text-green-200">Gmail kapcsolva</h4>
                      <p className="text-sm text-green-700 dark:text-green-300">{gmailStatus.gmail_email}</p>
                      {gmailStatus.gmail_name && (
                        <p className="text-sm text-green-600 dark:text-green-400">{gmailStatus.gmail_name}</p>
                      )}
                    </div>
                    <Button variant="outline" onClick={handleDisconnectGmail}>
                      <Unlink className="w-4 h-4 mr-2" />
                      Leválasztás
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{gmailStatus.sent_today}</p>
                      <p className="text-sm text-muted-foreground">Ma küldve</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{gmailStatus.remaining_today}</p>
                      <p className="text-sm text-muted-foreground">Még küldhető</p>
                    </div>
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-2xl font-bold">{gmailStatus.daily_limit}</p>
                      <p className="text-sm text-muted-foreground">Napi limit</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-blue-600" />
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      A napi limit {getTimeUntilReset()} nullázódik.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                      <Mail className="w-6 h-6 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">Gmail fiók nincs kapcsolva</h4>
                      <p className="text-sm text-muted-foreground">
                        Az email küldéshez kapcsold össze a Gmail fiókodat
                      </p>
                    </div>
                  </div>
                  
                  <Button onClick={handleConnectGmail} disabled={connectingGmail} className="w-full">
                    {connectingGmail ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Link2 className="w-4 h-4 mr-2" />
                    )}
                    Gmail fiók kapcsolása
                  </Button>
                  
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <AlertCircle className="w-4 h-4 inline mr-1" />
                      A Gmail API használatához adminisztrátor beállítás szükséges (Google Cloud Console).
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Template Dialog */}
      <Dialog open={emailTemplateDialog} onOpenChange={setEmailTemplateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEmailTemplate ? "Email sablon szerkesztése" : "Új email sablon"}</DialogTitle>
            <DialogDescription>Hozz létre újrafelhasználható email sablont</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sablon neve</Label>
              <Input
                value={emailTemplateForm.name}
                onChange={(e) => setEmailTemplateForm({...emailTemplateForm, name: e.target.value})}
                placeholder="pl. Somorja gépkezelők"
              />
            </div>
            <div>
              <Label>Email tárgya</Label>
              <Input
                value={emailTemplateForm.subject}
                onChange={(e) => setEmailTemplateForm({...emailTemplateForm, subject: e.target.value})}
                placeholder="pl. Álláslehetőség - CNC gépkezelő"
              />
            </div>
            <div>
              <Label>Email szövege</Label>
              <Textarea
                value={emailTemplateForm.body}
                onChange={(e) => setEmailTemplateForm({...emailTemplateForm, body: e.target.value})}
                placeholder="Tisztelt {név}!&#10;&#10;Jelenleg keresünk..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Használható változók: {"{név}"}, {"{telefon}"}, {"{email}"}, {"{lakóhely}"}, {"{pozíció}"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailTemplateDialog(false)}>Mégse</Button>
            <Button onClick={handleSaveEmailTemplate}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Worker Template Dialog */}
      <Dialog open={workerTemplateDialog} onOpenChange={setWorkerTemplateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWorkerTemplate ? "Dolgozó sablon szerkesztése" : "Dolgozó sablon mentése"}</DialogTitle>
            <DialogDescription>
              Mentsd el a kiválasztott {selectedWorkerIds.length} dolgozót sablonként
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Sablon neve</Label>
              <Input
                value={workerTemplateForm.name}
                onChange={(e) => setWorkerTemplateForm({...workerTemplateForm, name: e.target.value})}
                placeholder="pl. Szállásos gépkezelők"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWorkerTemplateDialog(false)}>Mégse</Button>
            <Button onClick={handleSaveWorkerTemplate}>Mentés</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={sendEmailDialog} onOpenChange={setSendEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bulk email küldés</DialogTitle>
            <DialogDescription>
              Email küldése {selectedWorkerIds.length} dolgozónak
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Kampány neve</Label>
              <Input
                value={campaignForm.name}
                onChange={(e) => setCampaignForm({...campaignForm, name: e.target.value})}
              />
            </div>
            
            {emailTemplates.length > 0 && (
              <div>
                <Label>Email sablon (opcionális)</Label>
                <Select
                  value={campaignForm.email_template_id}
                  onValueChange={handleSelectEmailTemplate}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Válassz sablont vagy írj új emailt..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Új email írása</SelectItem>
                    {emailTemplates.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label>Email tárgya</Label>
              <Input
                value={campaignForm.subject}
                onChange={(e) => setCampaignForm({...campaignForm, subject: e.target.value})}
                placeholder="Email tárgya..."
              />
            </div>
            
            <div>
              <Label>Email szövege</Label>
              <Textarea
                value={campaignForm.body}
                onChange={(e) => setCampaignForm({...campaignForm, body: e.target.value})}
                placeholder="Email szövege..."
                rows={8}
              />
            </div>
            
            <div>
              <Label>Küldési mód</Label>
              <Select
                value={campaignForm.send_method}
                onValueChange={(v) => setCampaignForm({...campaignForm, send_method: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Egyesével (biztonságosabb)</SelectItem>
                  <SelectItem value="bcc">Titkos másolat (BCC)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {gmailStatus && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <p>
                  <strong>Becslés:</strong> {selectedWorkerIds.length} email, 
                  {gmailStatus.remaining_today >= selectedWorkerIds.length
                    ? ` ma elküldhető`
                    : ` ${Math.ceil(selectedWorkerIds.length / gmailStatus.daily_limit)} nap alatt megy ki`
                  }
                </p>
                <p className="text-muted-foreground mt-1">
                  Napi limit: {gmailStatus.daily_limit} email. Még küldhető ma: {gmailStatus.remaining_today}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendEmailDialog(false)}>Mégse</Button>
            <Button onClick={handleStartCampaign}>
              <Send className="w-4 h-4 mr-2" />
              Kampány indítása
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
