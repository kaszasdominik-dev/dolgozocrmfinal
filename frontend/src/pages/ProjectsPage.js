import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Plus, Calendar, MapPin, Users, Edit2, Trash2, CheckCircle, Clock, Target,
  Building2, Briefcase, TestTube
} from "lucide-react";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${API}/projects`);
      setProjects(res.data);
    } catch (e) {
      toast.error("Hiba a projektek betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm("Biztosan törlöd ezt a projektet?")) return;
    try {
      await axios.delete(`${API}/projects/${id}`);
      toast.success("Projekt törölve");
      fetchProjects();
    } catch (e) {
      toast.error("Hiba a törléskor");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const activeProjects = projects.filter(p => !p.is_closed);
  const closedProjects = projects.filter(p => p.is_closed);

  const getProgressPercent = (current, expected) => {
    if (!expected || expected === 0) return 0;
    return Math.min(Math.round((current / expected) * 100), 100);
  };

  return (
    <div className="space-y-6">
      {/* Header - fixed for mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Projektek</h1>
          <p className="text-muted-foreground mt-1 text-sm">{projects.length} projekt összesen</p>
        </div>
        {user?.role === "admin" && (
          <Button 
            onClick={() => navigate("/projects/new")}
            className="bg-primary hover:bg-primary/90 shrink-0"
            size="sm"
            data-testid="add-project-btn"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Új projekt
          </Button>
        )}
      </div>

      {/* Active Projects */}
      {activeProjects.length > 0 && (
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            Aktív projektek ({activeProjects.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {activeProjects.map((project, index) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group bg-card rounded-xl border border-border p-3 sm:p-4 hover:border-primary/50 hover:shadow-lg transition-all duration-200"
                data-testid={`project-card-${project.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 text-sm sm:text-base">
                      {project.name}
                    </h3>
                    {project.client_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 shrink-0" />
                        <span className="truncate">{project.client_name}</span>
                      </p>
                    )}
                  </div>
                  {user?.role === "admin" && (
                    <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        onClick={(e) => {
                          e.preventDefault();
                          navigate(`/projects/${project.id}/edit`);
                        }}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-destructive hover:text-destructive"
                        onClick={(e) => handleDelete(project.id, e)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-1.5 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{new Date(project.date).toLocaleDateString('hu-HU')}</span>
                  </div>
                  {project.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="line-clamp-1">{project.location}</span>
                    </div>
                  )}
                  
                  {/* Stats badges */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {project.position_count > 0 && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs gap-0.5 px-1.5 py-0">
                        <Briefcase className="w-2.5 h-2.5" />{project.position_count}
                      </Badge>
                    )}
                    {project.trial_count > 0 && (
                      <Badge variant="outline" className="text-[10px] sm:text-xs gap-0.5 px-1.5 py-0">
                        <TestTube className="w-2.5 h-2.5" />{project.trial_count}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Létszám kijelző - Dolgozik státuszúak / Tervezett létszám */}
                  <div className="pt-1.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1 text-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-medium">{project.active_worker_count || 0}</span>
                        {project.planned_headcount > 0 && (
                          <span className="text-muted-foreground">/ {project.planned_headcount}</span>
                        )}
                      </span>
                      {project.planned_headcount > 0 && (
                        <span className={`text-[10px] sm:text-xs font-medium ${
                          project.active_worker_count >= project.planned_headcount 
                            ? 'text-green-500' 
                            : project.active_worker_count >= project.planned_headcount * 0.7
                            ? 'text-amber-500'
                            : 'text-muted-foreground'
                        }`}>
                          {getProgressPercent(project.active_worker_count || 0, project.planned_headcount)}%
                        </span>
                      )}
                    </div>
                    {project.planned_headcount > 0 && (
                      <Progress 
                        value={getProgressPercent(project.active_worker_count || 0, project.planned_headcount)} 
                        className="h-1"
                      />
                    )}
                  </div>
                </div>

                {project.notes && (
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{project.notes}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Closed Projects */}
      {closedProjects.length > 0 && (
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            Lezárt projektek ({closedProjects.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {closedProjects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="group bg-muted/50 rounded-xl border border-border p-3 sm:p-4 hover:bg-card transition-all"
                data-testid={`project-card-${project.id}`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-muted-foreground line-clamp-1 text-sm sm:text-base">
                      {project.name}
                    </h3>
                    {project.client_name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />{project.client_name}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30 shrink-0 text-[10px]">
                    Lezárva
                  </Badge>
                </div>
                
                <div className="space-y-1 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(project.date).toLocaleDateString('hu-HU')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{project.worker_count} dolgozó</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {projects.length === 0 && (
        <div className="bg-card rounded-xl border border-border p-8 sm:p-12 text-center">
          <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Még nincs projekt</p>
          {user?.role === "admin" && (
            <Button 
              onClick={() => navigate("/projects/new")}
              className="mt-4 bg-primary hover:bg-primary/90"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Első projekt
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
