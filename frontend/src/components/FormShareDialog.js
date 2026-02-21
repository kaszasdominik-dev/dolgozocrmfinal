import { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001/api";

export default function FormShareDialog({ open, onOpenChange, form, allUsers, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  useEffect(() => {
    if (form && open) {
      setSelectedUsers(form.shared_with || []);
    }
  }, [form, open]);
  
  const toggleUser = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };
  
  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/projects/${form.project_id}/forms/${form.id}/share`, {
        shared_with: selectedUsers
      });
      
      toast.success("Megosztás mentve!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setLoading(false);
    }
  };
  
  if (!form) return null;
  
  const recruiters = allUsers.filter(u => u.role === "user");
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Űrlap megosztása
          </DialogTitle>
          <DialogDescription>
            "{form.name}" - {form.owner_name} űrlapja
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Válaszd ki a toborzókat, akikkel meg szeretnéd osztani ezt az űrlapot:
          </p>
          
          {recruiters.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              Nincs más toborzó a rendszerben
            </div>
          ) : (
            <div className="space-y-3">
              {recruiters.map(user => (
                <div key={user.id} className="flex items-start space-x-3 p-3 rounded border hover:bg-muted/50">
                  <Checkbox
                    id={user.id}
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={() => toggleUser(user.id)}
                    disabled={loading}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor={user.id}
                      className="font-medium cursor-pointer"
                    >
                      {user.name || user.email}
                    </Label>
                    <div className="text-xs text-muted-foreground space-y-1 mt-1">
                      <div>✓ Láthatja az űrlap jelentkezőit</div>
                      <div>✓ Hozzáadhatja őket a projekthez</div>
                      <div>✗ NEM módosíthatja az űrlap beállításait</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <div className="text-sm p-3 bg-muted rounded space-y-1">
            <div>ℹ️ A tulajdonos ({form.owner_name}) mindig látja az űrlapot</div>
            <div>ℹ️ Adminok mindig látják az összes űrlapot</div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Mégse
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Megosztás mentése
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
