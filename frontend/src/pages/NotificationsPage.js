import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  BellOff,
  Check, 
  CheckCheck, 
  Trash2, 
  FolderKanban, 
  Calendar,
  Loader2,
  Clock
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get(`${API}/notifications`);
      setNotifications(res.data);
    } catch (e) {
      toast.error("Hiba az értesítések betöltésekor");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`${API}/notifications/${id}/read`);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast.success("Összes értesítés olvasottként jelölve");
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  const deleteNotification = async (id) => {
    try {
      await axios.delete(`${API}/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n.id !== id));
      toast.success("Értesítés törölve");
    } catch (e) {
      toast.error("Hiba történt");
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case "project_assigned":
        return <FolderKanban className="w-5 h-5 text-green-500" />;
      case "trial_assigned":
        return <Calendar className="w-5 h-5 text-indigo-500" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" />
            Értesítések
          </h1>
          <p className="text-muted-foreground mt-1">
            {unreadCount > 0 ? `${unreadCount} olvasatlan értesítés` : "Nincs olvasatlan értesítés"}
          </p>
        </div>
        
        {unreadCount > 0 && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={markAllAsRead}
            className="gap-2"
            data-testid="mark-all-read-btn"
          >
            <CheckCheck className="w-4 h-4" />
            Mind olvasott
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <Card>
        <CardContent className="p-0">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BellOff className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nincsenek értesítések</p>
              <p className="text-sm">Amikor hozzáadnak egy projekthez vagy próbához, itt jelenik meg.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                    !notification.is_read ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                  data-testid={`notification-${notification.id}`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-full ${
                      !notification.is_read ? "bg-primary/10" : "bg-muted"
                    }`}>
                      {getIcon(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`font-medium ${
                            !notification.is_read ? "text-foreground" : "text-muted-foreground"
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                        
                        {!notification.is_read && (
                          <Badge className="bg-primary shrink-0">Új</Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: hu
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => markAsRead(notification.id)}
                              title="Olvasottként jelölés"
                              data-testid={`mark-read-${notification.id}`}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => deleteNotification(notification.id)}
                            title="Törlés"
                            data-testid={`delete-notification-${notification.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
