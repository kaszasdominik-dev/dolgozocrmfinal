import { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, Loader2, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001/api";

export default function FormSettingsDialog({ open, onOpenChange, projectId, form, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  
  const [sheetUrl, setSheetUrl] = useState("");
  const [formName, setFormName] = useState("");
  const [columnMapping, setColumnMapping] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
    notes: "",
    date: ""
  });
  const [defaultCategory, setDefaultCategory] = useState("Ingázós");
  const [headers, setHeaders] = useState([]);
  const [preview, setPreview] = useState([]);
  const [showInfo, setShowInfo] = useState(false);
  
  useEffect(() => {
    if (form) {
      setSheetUrl(form.sheet_url);
      setFormName(form.name);
      setColumnMapping(form.column_mapping);
      setDefaultCategory(form.default_category);
    } else {
      resetForm();
    }
  }, [form, open]);
  
  const resetForm = () => {
    setSheetUrl("");
    setFormName("");
    setColumnMapping({ name: "", phone: "", address: "", email: "", notes: "", date: "" });
    setDefaultCategory("Ingázós");
    setHeaders([]);
    setPreview([]);
    setTestResult(null);
  };
  
  const testConnection = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Google Sheets URL megadása kötelező");
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await axios.post(`${API}/forms/test-connection`, {
        sheet_url: sheetUrl
      });
      
      setTestResult({
        success: true,
        row_count: response.data.row_count,
        headers: response.data.headers,
        detected_mapping: response.data.detected_mapping,
        preview: response.data.preview
      });
      
      setHeaders(response.data.headers);
      setColumnMapping(response.data.detected_mapping);
      setPreview(response.data.preview);
      
      toast.success(`✅ Kapcsolat sikeres! ${response.data.row_count} sor található.`);
    } catch (error) {
      setTestResult({
        success: false,
        error: error.response?.data?.detail || "Kapcsolódási hiba"
      });
      toast.error(error.response?.data?.detail || "Kapcsolódási hiba");
    } finally {
      setTesting(false);
    }
  };
  
  const handleSave = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Google Sheets URL megadása kötelező");
      return;
    }
    
    if (!columnMapping.name || !columnMapping.phone) {
      toast.error("Név és Telefonszám oszlopok kötelezőek");
      return;
    }
    
    setLoading(true);
    
    try {
      const data = {
        sheet_url: sheetUrl,
        name: formName || "Google Űrlap",
        column_mapping: columnMapping,
        default_category: defaultCategory,
        sync_frequency: "hourly"
      };
      
      if (form) {
        await axios.put(`${API}/projects/${projectId}/forms/${form.id}`, data);
        toast.success("Űrlap frissítve!");
      } else {
        await axios.post(`${API}/projects/${projectId}/forms`, data);
        toast.success("Űrlap hozzáadva és szinkronizálva!");
      }
      
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Hiba történt");
    } finally {
      setLoading(false);
    }
  };
  
  const columnLetters = headers.map((header, idx) => {
    const letter = String.fromCharCode(65 + idx);
    return { letter, label: `${letter} - ${header}` };
  });
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {form ? "Űrlap szerkesztése" : "Google Űrlap hozzáadása"}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setShowInfo(true)}
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              Automatikus jelentkező importálás Google Sheets-ből
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Sheet URL */}
            <div className="space-y-2">
              <Label>Google Sheets URL *</Label>
              <div className="flex gap-2">
                <Input
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  disabled={loading}
                />
                <Button
                  onClick={testConnection}
                  disabled={testing || !sheetUrl.trim()}
                  variant="outline"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Teszt"}
                </Button>
              </div>
              {testResult && (
                <div className={`text-sm p-2 rounded ${testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {testResult.success ? (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>✅ Kapcsolat sikeres! {testResult.row_count} sor</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>{testResult.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Form Name */}
            <div className="space-y-2">
              <Label>Űrlap neve (opcionális)</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="pl. Gyártósori jelentkezők"
                disabled={loading}
              />
            </div>
            
            {/* Column Mapping */}
            {headers.length > 0 && (
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-semibold text-sm">Oszlopok beállítása</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Név oszlop *</Label>
                    <Select value={columnMapping.name} onValueChange={(val) => setColumnMapping({...columnMapping, name: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz..." />
                      </SelectTrigger>
                      <SelectContent>
                        {columnLetters.map(col => (
                          <SelectItem key={col.letter} value={col.letter}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label>Telefonszám oszlop *</Label>
                    <Select value={columnMapping.phone} onValueChange={(val) => setColumnMapping({...columnMapping, phone: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz..." />
                      </SelectTrigger>
                      <SelectContent>
                        {columnLetters.map(col => (
                          <SelectItem key={col.letter} value={col.letter}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label>Lakóhely oszlop</Label>
                    <Select value={columnMapping.address} onValueChange={(val) => setColumnMapping({...columnMapping, address: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nincs</SelectItem>
                        {columnLetters.map(col => (
                          <SelectItem key={col.letter} value={col.letter}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label>Email oszlop</Label>
                    <Select value={columnMapping.email} onValueChange={(val) => setColumnMapping({...columnMapping, email: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nincs</SelectItem>
                        {columnLetters.map(col => (
                          <SelectItem key={col.letter} value={col.letter}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label>Időbélyeg oszlop</Label>
                    <Select value={columnMapping.date} onValueChange={(val) => setColumnMapping({...columnMapping, date: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Válassz..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Nincs</SelectItem>
                        {columnLetters.map(col => (
                          <SelectItem key={col.letter} value={col.letter}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-1">
                    <Label>Alapértelmezett kategória</Label>
                    <Select value={defaultCategory} onValueChange={setDefaultCategory}>
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
                </div>
              </div>
            )}
            
            {/* Preview */}
            {preview.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="font-semibold text-sm mb-2">Előnézet (első 3 jelentkező)</h4>
                <div className="space-y-2">
                  {preview.map((row, idx) => (
                    <div key={idx} className="text-sm p-2 bg-muted rounded">
                      <div className="font-medium">{row.name || "(nincs név)"}</div>
                      <div className="text-muted-foreground">{row.phone || "(nincs telefon)"} {row.address && `• ${row.address}`}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Mégse
            </Button>
            <Button onClick={handleSave} disabled={loading || !testResult?.success}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {form ? "Mentés" : "Hozzáadás"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Info Modal */}
      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>📋 Hogyan működik?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <strong>1. Google Form létrehozása:</strong>
              <p className="text-muted-foreground">forms.google.com → Új űrlap → Mezők: Név, Telefon, Lakóhely</p>
            </div>
            <div>
              <strong>2. Válaszok Google Sheets-be:</strong>
              <p className="text-muted-foreground">Űrlapban: Válaszok → Google Sheetsbe küldése</p>
            </div>
            <div>
              <strong>3. Táblázat nyilvánossá tétele: ⚠️</strong>
              <p className="text-muted-foreground">Sheets → Megosztás → "Link másolása" → "Bárki, aki rendelkezik a linkkel" → Jogosultság: "Megtekintő"</p>
            </div>
            <div>
              <strong>4. URL bemásolása:</strong>
              <p className="text-muted-foreground">Másold be a táblázat URL-jét ide</p>
            </div>
            <div>
              <strong>5. Automatikus frissítés:</strong>
              <p className="text-muted-foreground">CRM óránként ellenőrzi az új jelentkezőket</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInfo(false)}>Értem</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
