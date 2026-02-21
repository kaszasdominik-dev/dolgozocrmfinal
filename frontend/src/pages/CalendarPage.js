import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  Calendar as CalendarIcon, 
  MapPin, 
  Users, 
  Clock, 
  Building2, 
  FileText,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentView, setCurrentView] = useState("dayGridMonth");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const [trialsRes, projectsRes] = await Promise.all([
        axios.get(`${API}/calendar/trials`),
        axios.get(`${API}/calendar/projects`)
      ]);
      
      // Combine and format events
      const trialEvents = trialsRes.data.map(e => ({
        ...e,
        backgroundColor: e.color,
        borderColor: e.color,
        textColor: "#fff",
        extendedProps: { ...e }
      }));
      
      const projectEvents = projectsRes.data.map(e => ({
        ...e,
        backgroundColor: e.color,
        borderColor: e.color,
        textColor: "#fff",
        display: "background",
        extendedProps: { ...e }
      }));
      
      setEvents([...trialEvents, ...projectEvents]);
    } catch (e) {
      toast.error("Hiba az események betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const handleEventClick = (info) => {
    const eventData = info.event.extendedProps;
    setSelectedEvent(eventData);
    setDetailsOpen(true);
  };

  const handleDateClick = (info) => {
    // Could be used to create new events
    console.log("Date clicked:", info.dateStr);
  };

  const goToProject = () => {
    if (selectedEvent?.project_id) {
      navigate(`/projects/${selectedEvent.project_id}`);
      setDetailsOpen(false);
    }
  };

  const changeView = (viewName) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView(viewName);
      setCurrentView(viewName);
    }
  };

  const navigateCalendar = (direction) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      if (direction === "prev") {
        calendarApi.prev();
      } else if (direction === "next") {
        calendarApi.next();
      } else {
        calendarApi.today();
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-7 h-7 text-primary" />
            Naptár
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.role === "admin" ? "Összes próba és projekt" : "Saját próbák és projektek"}
          </p>
        </div>
        
        {/* View Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button
              variant={currentView === "dayGridMonth" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => changeView("dayGridMonth")}
              className="h-8"
            >
              Hónap
            </Button>
            <Button
              variant={currentView === "timeGridWeek" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => changeView("timeGridWeek")}
              className="h-8"
            >
              Hét
            </Button>
            <Button
              variant={currentView === "timeGridDay" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => changeView("timeGridDay")}
              className="h-8"
            >
              Nap
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigateCalendar("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigateCalendar("today")}>
            Ma
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigateCalendar("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#6366f1]" />
            <span className="text-muted-foreground">Próba</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#22c55e]" />
            <span className="text-muted-foreground">Aktív projekt</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#94a3b8]" />
            <span className="text-muted-foreground">Lezárt projekt</span>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <Card className="overflow-hidden">
        <CardContent className="p-0 sm:p-4">
          <div className="calendar-wrapper">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale="hu"
              firstDay={1}
              headerToolbar={false}
              events={events}
              eventClick={handleEventClick}
              dateClick={handleDateClick}
              height="auto"
              aspectRatio={1.8}
              dayMaxEvents={3}
              moreLinkText={(n) => `+${n} több`}
              buttonText={{
                today: "Ma",
                month: "Hónap",
                week: "Hét",
                day: "Nap"
              }}
              slotLabelFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
              }}
              eventTimeFormat={{
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
              }}
              allDayText="Egész nap"
              noEventsText="Nincs esemény"
              eventClassNames="cursor-pointer hover:opacity-90 transition-opacity"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEvent?.type === "trial" ? (
                <Badge className="bg-[#6366f1]">Próba</Badge>
              ) : (
                <Badge className={selectedEvent?.is_closed ? "bg-slate-500" : "bg-green-500"}>
                  {selectedEvent?.is_closed ? "Lezárt" : "Aktív"} projekt
                </Badge>
              )}
              {selectedEvent?.title || selectedEvent?.project_name}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent?.type === "trial" ? "Próba részletei" : "Projekt részletei"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedEvent?.project_name && selectedEvent?.type === "trial" && (
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Projekt</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent.project_name}</p>
                </div>
              </div>
            )}
            
            {selectedEvent?.project_client && (
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Ügyfél</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent.project_client}</p>
                </div>
              </div>
            )}
            
            {selectedEvent?.start && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Időpont</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedEvent.start).toLocaleDateString("hu-HU", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      weekday: "long"
                    })}
                    {!selectedEvent.allDay && (
                      <span className="ml-2">
                        {new Date(selectedEvent.start).toLocaleTimeString("hu-HU", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                        {selectedEvent.end && (
                          <span> - {new Date(selectedEvent.end).toLocaleTimeString("hu-HU", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            
            {(selectedEvent?.location || selectedEvent?.training_location) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Helyszín</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEvent.training_location || selectedEvent.location}
                  </p>
                </div>
              </div>
            )}
            
            {selectedEvent?.worker_count !== undefined && (
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Dolgozók</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent.worker_count} fő</p>
                </div>
              </div>
            )}
            
            {selectedEvent?.notes && (
              <div className="flex items-start gap-3">
                <FileText className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Megjegyzés</p>
                  <p className="text-sm text-muted-foreground">{selectedEvent.notes}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Bezárás
            </Button>
            {selectedEvent?.project_id && (
              <Button onClick={goToProject} className="bg-primary">
                Projekt megtekintése
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
