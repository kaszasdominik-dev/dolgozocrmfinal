import { useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Phone, MapPin, Mail, Calendar, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001/api";

export default function FormLeadsTab({ projectId, leads, loading, onRefresh, onDuplicateClick, onProcessed }) {
  const [processing, setProcessing] = useState({});
  
  const handleAddToWaitlist = async (leadId) => {
    setProcessing({ ...processing, [leadId]: true });
    try {
      await axios.post(`${API}/form-leads/${leadId}/add-to-project`);
      toast.success("Dolgozó hozzáadva a várólistához!");
      onProcessed();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setProcessing({ ...processing, [leadId]: false });
    }
  };
  
  const handleIgnore = async (leadId) => {
    if (!window.confirm("Biztosan figyelmen kívül hagyod ezt a jelentkezőt?")) return;
    
    setProcessing({ ...processing, [leadId]: true });
    try {
      await axios.post(`${API}/form-leads/${leadId}/resolve`, {
        action: "keep_existing"
      });
      toast.success("Jelentkező elvetve");
      onProcessed();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setProcessing({ ...processing, [leadId]: false });
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
  
  const unprocessedLeads = leads.filter(l => !l.is_duplicate);
  const duplicateLeads = leads.filter(l => l.is_duplicate);
  
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">
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
      
      {/* Unprocessed Leads */}
      {unprocessedLeads.map(lead => (
        <Card key={lead.id} className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-lg">{lead.name}</h4>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {lead.phone}
                  </span>
                  {lead.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {lead.address}
                    </span>
                  )}
                  {lead.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {lead.email}
                    </span>
                  )}
                  {lead.submitted_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(lead.submitted_at).toLocaleString('hu-HU')}
                    </span>
                  )}
                </div>
                {lead.notes && (
                  <p className="text-sm mt-2 p-2 bg-muted rounded">{lead.notes}</p>
                )}
              </div>
              <Badge className="bg-green-600">Új</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => handleAddToWaitlist(lead.id)}
                disabled={processing[lead.id]}
              >
                {processing[lead.id] ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Várólistához"
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleIgnore(lead.id)}
                disabled={processing[lead.id]}
              >
                Elvet
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* Duplicate Leads */}
      {duplicateLeads.map(lead => (
        <Card key={lead.id} className="border-l-4 border-l-yellow-500">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <h4 className="font-medium text-lg">{lead.name}</h4>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {lead.phone}
                  </span>
                  {lead.address && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {lead.address}
                    </span>
                  )}
                </div>
                <div className="mt-2 p-2 bg-yellow-50 rounded text-sm">
                  <strong className="text-yellow-800">⚠️ DUPLIKÁTUM!</strong>
                  <p className="text-yellow-700">
                    Már szerepel a CRM-ben (
                    {lead.duplicate_worker ? (
                      <>
                        {lead.duplicate_worker.name} - 
                        {new Date(lead.duplicate_worker.created_at).toLocaleDateString('hu-HU')}
                      </>
                    ) : (
                      'korábbi bejegyzés'
                    )}
                    )
                  </p>
                </div>
              </div>
              <Badge variant="destructive">Duplikátum</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDuplicateClick(lead)}
            >
              🔍 Duplikátum kezelése
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
