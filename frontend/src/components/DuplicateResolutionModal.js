import { useState } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001/api";

export default function DuplicateResolutionModal({ open, onOpenChange, lead, onResolved }) {
  const [loading, setLoading] = useState(false);
  
  if (!lead || !lead.duplicate_worker) return null;
  
  const existingWorker = lead.duplicate_worker;
  
  const handleResolve = async (action, mergeFields = null) => {
    setLoading(true);
    try {
      await axios.post(`${API}/form-leads/${lead.id}/resolve`, {
        action,
        merge_fields: mergeFields
      });
      
      toast.success(
        action === "keep_both" ? "Új dolgozó létrehozva" :
        action === "keep_existing" ? "Meglévő dolgozó megtartva" :
        action === "keep_new" ? "Meglévő dolgozó frissítve" :
        "Adatok egyesítve"
      );
      
      onResolved();
      onOpenChange(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            DUPLIKÁTUM ÉSZLELVE!
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-center text-lg font-medium">
            Telefonszám: {lead.phone}
          </div>
          
          {/* Existing Worker */}
          <div className="border rounded-lg p-4 bg-red-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-600"></span>
                MEGLÉVŐ DOLGOZÓ (CRM-ben)
              </h3>
              <Badge variant="destructive">Régi</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <div><strong>Név:</strong> {existingWorker.name}</div>
              <div><strong>Telefon:</strong> {existingWorker.phone}</div>
              {existingWorker.address && <div><strong>Lakóhely:</strong> {existingWorker.address}</div>}
              {existingWorker.email && <div><strong>Email:</strong> {existingWorker.email}</div>}
              {existingWorker.position && <div><strong>Pozíció:</strong> {existingWorker.position}</div>}
              {existingWorker.category && <div><strong>Kategória:</strong> {existingWorker.category}</div>}
              {existingWorker.global_status && <div><strong>Státusz:</strong> {existingWorker.global_status}</div>}
              {existingWorker.created_at && (
                <div className="text-muted-foreground">
                  Hozzáadva: {new Date(existingWorker.created_at).toLocaleDateString('hu-HU')}
                </div>
              )}
              {existingWorker.notes && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <strong>Megjegyzés:</strong> {existingWorker.notes}
                </div>
              )}
            </div>
          </div>
          
          {/* New Lead */}
          <div className="border rounded-lg p-4 bg-green-50">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-600"></span>
                ÚJ JELENTKEZŐ (Űrlapról)
              </h3>
              <Badge className="bg-green-600">Új</Badge>
            </div>
            <div className="space-y-1 text-sm">
              <div><strong>Név:</strong> {lead.name}</div>
              <div><strong>Telefon:</strong> {lead.phone}</div>
              {lead.address && <div><strong>Lakóhely:</strong> {lead.address}</div>}
              {lead.email && <div><strong>Email:</strong> {lead.email}</div>}
              {lead.submitted_at && (
                <div className="text-muted-foreground">
                  Beküldve: {new Date(lead.submitted_at).toLocaleDateString('hu-HU')}
                </div>
              )}
              {lead.notes && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <strong>Megjegyzés:</strong> {lead.notes}
                </div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-3">Mit szeretnél tenni?</h4>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => handleResolve("keep_existing")}
                disabled={loading}
              >
                <div className="text-left">
                  <div className="font-medium">Meglévő megtartása, új elvetése ✅ AJÁNLOTT</div>
                  <div className="text-xs text-muted-foreground">
                    Meglévő dolgozó marad, űrlap jelentkező törlődik
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => handleResolve("merge", ["email", "notes", "address"])}
                disabled={loading}
              >
                <div className="text-left">
                  <div className="font-medium">Adatok egyesítése (Merge)</div>
                  <div className="text-xs text-muted-foreground">
                    Hiányzó mezők kitöltése az űrlap adatokból
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => handleResolve("keep_new")}
                disabled={loading}
              >
                <div className="text-left">
                  <div className="font-medium">Meglévő frissítése új adatokkal</div>
                  <div className="text-xs text-muted-foreground">
                    Meglévő dolgozó felülírása űrlap adatokkal
                  </div>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-3"
                onClick={() => handleResolve("keep_both")}
                disabled={loading}
              >
                <div className="text-left">
                  <div className="font-medium">Mindkettőt megtartom</div>
                  <div className="text-xs text-muted-foreground">
                    Új dolgozó létrehozása az űrlap adatokkal (külön bejegyzés)
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Mégse - később döntök
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
