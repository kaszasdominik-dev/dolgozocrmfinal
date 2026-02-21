import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Calendar, Users, X, Plus, Building2, MapPin, GraduationCap } from "lucide-react";

export default function ProjectFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = !!id;
  
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    client_name: "",
    date: new Date().toISOString().split('T')[0],
    location: "",
    training_location: "",
    notes: "",
    recruiter_ids: [],
    planned_headcount: 0
  });

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      // Get users if admin
      if (user?.role === "admin") {
        const usersRes = await axios.get(`${API}/users`);
        setAllUsers(usersRes.data.filter(u => u.role === "user")); // Csak toborzók
      }
      
      if (isEdit) {
        const res = await axios.get(`${API}/projects/${id}`);
        setFormData({
          name: res.data.name || "",
          client_name: res.data.client_name || "",
          date: res.data.date?.split('T')[0] || "",
          location: res.data.location || "",
          training_location: res.data.training_location || "",
          notes: res.data.notes || "",
          recruiter_ids: res.data.recruiter_ids || [],
          planned_headcount: res.data.planned_headcount || 0
        });
      }
    } catch (e) {
      toast.error("Hiba");
      if (isEdit) navigate("/projects");
    }
  };

  const handleAddRecruiter = (userId) => {
    if (!formData.recruiter_ids.includes(userId)) {
      setFormData({...formData, recruiter_ids: [...formData.recruiter_ids, userId]});
    }
  };

  const handleRemoveRecruiter = (userId) => {
    setFormData({...formData, recruiter_ids: formData.recruiter_ids.filter(rid => rid !== userId)});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast.error("Projekt neve kötelező");
      return;
    }
    if (!formData.date) {
      toast.error("Dátum kötelező");
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await axios.put(`${API}/projects/${id}`, formData);
        toast.success("Mentve");
      } else {
        await axios.post(`${API}/projects`, formData);
        toast.success("Projekt létrehozva");
      }
      navigate("/projects");
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba");
    } finally {
      setLoading(false);
    }
  };

  const selectedRecruiters = allUsers.filter(u => formData.recruiter_ids.includes(u.id));
  const availableRecruiters = allUsers.filter(u => !formData.recruiter_ids.includes(u.id));

  return (
    <div className="max-w-2xl mx-auto px-4">
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-slate-800">{isEdit ? "Projekt szerkesztése" : "Új projekt"}</h1>
      </div>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            Projekt alapadatai
          </CardTitle>
          <CardDescription className="text-xs">
            Töltsd ki a projekt alapvető információit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Projekt neve */}
            <div className="space-y-1">
              <Label className="text-sm">Projekt neve *</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                placeholder="pl. Berry Raktár - Január" 
                required 
                className="h-9" 
                data-testid="project-name-input" 
              />
            </div>

            {/* Ügyfél / Cégnév */}
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1">
                <Building2 className="w-3 h-3" />
                Ügyfél / Cégnév
              </Label>
              <Input 
                value={formData.client_name} 
                onChange={(e) => setFormData({...formData, client_name: e.target.value})} 
                placeholder="pl. Berry Logisztika Kft." 
                className="h-9" 
                data-testid="project-client-input" 
              />
            </div>

            {/* Dátum */}
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Kezdési dátum *
              </Label>
              <Input 
                type="date" 
                value={formData.date} 
                onChange={(e) => setFormData({...formData, date: e.target.value})} 
                required 
                className="h-9" 
                data-testid="project-date-input" 
              />
            </div>

            {/* Helyszín */}
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Helyszín
              </Label>
              <Input 
                value={formData.location} 
                onChange={(e) => setFormData({...formData, location: e.target.value})} 
                placeholder="pl. Budapest, Raktár u. 10." 
                className="h-9" 
                data-testid="project-location-input" 
              />
            </div>

            {/* Betanítás / Munkavégzés helye */}
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1">
                <GraduationCap className="w-3 h-3" />
                Betanítás / Munkavégzés helye
              </Label>
              <Input 
                value={formData.training_location} 
                onChange={(e) => setFormData({...formData, training_location: e.target.value})} 
                placeholder="pl. Gyártócsarnok B épület" 
                className="h-9" 
                data-testid="project-training-location-input" 
              />
            </div>

            {/* Megjegyzések, elvárások */}
            <div className="space-y-1">
              <Label className="text-sm">Megjegyzések, elvárások</Label>
              <Textarea 
                value={formData.notes} 
                onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                placeholder="Projekt szintű elvárások, megjegyzések..." 
                rows={3} 
                data-testid="project-notes-input" 
              />
            </div>

            {/* Tervezett létszám */}
            <div className="space-y-1">
              <Label className="text-sm flex items-center gap-1">
                <Users className="w-3 h-3" />
                Tervezett létszám (dolgozók száma)
              </Label>
              <Input 
                type="number"
                min="0"
                value={formData.planned_headcount} 
                onChange={(e) => setFormData({...formData, planned_headcount: parseInt(e.target.value) || 0})} 
                placeholder="pl. 10" 
                className="h-9" 
                data-testid="project-planned-headcount-input" 
              />
              <p className="text-xs text-slate-500">
                Hány fő dolgozóra van szükség? (Csak "Dolgozik" státuszúakat számolja)
              </p>
            </div>

            {/* Toborzók hozzárendelése (csak admin) */}
            {user?.role === "admin" && (
              <div className="space-y-2 pt-3 border-t">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  Hozzárendelt toborzók
                </Label>
                <CardDescription className="text-xs">
                  Csak ezek a toborzók látják majd a projektet és adhatnak hozzá dolgozókat
                </CardDescription>
                
                {/* Selected recruiters */}
                {selectedRecruiters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 py-2">
                    {selectedRecruiters.map(r => (
                      <Badge key={r.id} variant="secondary" className="gap-1 pr-1">
                        {r.name || r.email}
                        <button type="button" onClick={() => handleRemoveRecruiter(r.id)} className="hover:bg-slate-300 rounded p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                
                {/* Available recruiters */}
                {availableRecruiters.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {availableRecruiters.map(r => (
                      <Button key={r.id} type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleAddRecruiter(r.id)}>
                        <Plus className="w-3 h-3 mr-1" />{r.name || r.email}
                      </Button>
                    ))}
                  </div>
                )}
                
                {allUsers.length === 0 && (
                  <p className="text-xs text-slate-500">Nincs toborzó a rendszerben</p>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-3">
              <Button type="button" variant="outline" size="sm" onClick={() => navigate("/projects")}>Mégse</Button>
              <Button type="submit" size="sm" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700" data-testid="save-project-btn">
                {loading ? "..." : <><Save className="w-4 h-4 mr-1" />{isEdit ? "Mentés" : "Létrehozás"}</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {isEdit && (
        <p className="text-xs text-slate-500 text-center">
          A pozíciók és próbák a projekt részletes nézetében kezelhetők a létrehozás után.
        </p>
      )}
    </div>
  );
}
