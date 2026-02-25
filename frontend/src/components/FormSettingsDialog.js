import { useState, useEffect } from "react";
import axios from "axios";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Loader2, HelpCircle, FileSpreadsheet, Eye, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : "http://localhost:8001/api";

// CRM mezők amihez hozzá lehet rendelni oszlopokat
const CRM_FIELDS = [
  { key: "name", label: "Név", required: true },
  { key: "phone", label: "Telefonszám", required: true },
  { key: "address", label: "Lakóhely", required: false },
  { key: "email", label: "Email", required: false },
  { key: "notes", label: "Megjegyzés", required: false },
  { key: "date", label: "Kitöltés dátuma", required: false },
  { key: "position", label: "Pozíció", required: false },
];

export default function FormSettingsDialog({ open, onOpenChange, projectId, form, positions, onSuccess }) {
  const [step, setStep] = useState(1); // 1: URL megadás, 2: Oszlop hozzárendelés + előnézet, 3: Mentés
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  
  // Step 1: URL és kapcsolat
  const [sheetUrl, setSheetUrl] = useState("");
  const [formName, setFormName] = useState("");
  const [connected, setConnected] = useState(false);
  
  // Step 2: Oszlop mapping
  const [sheetHeaders, setSheetHeaders] = useState([]); // Google Sheet oszlop fejlécei
  const [sheetData, setSheetData] = useState([]); // Előnézet adatok (első pár sor)
  const [columnMapping, setColumnMapping] = useState({}); // { name: 0, phone: 1, ... } - index alapú
  const [rowCount, setRowCount] = useState(0);
  
  // Settings
  const [defaultCategory, setDefaultCategory] = useState("Ingázós");
  const [defaultPositionId, setDefaultPositionId] = useState(""); // Alapértelmezett pozíció ID
  
  const [showInfo, setShowInfo] = useState(false);
  
  useEffect(() => {
    if (form) {
      setSheetUrl(form.sheet_url);
      setFormName(form.name);
      setDefaultCategory(form.default_category || "Ingázós");
      setDefaultPositionId(form.default_position_id || "");
      // Ha szerkesztés, ugorjunk a 2. lépésre
      if (form.sheet_url) {
        testConnection(form.sheet_url);
      }
    } else {
      resetForm();
    }
  }, [form, open]);
  
  const resetForm = () => {
    setStep(1);
    setSheetUrl("");
    setFormName("");
    setConnected(false);
    setSheetHeaders([]);
    setSheetData([]);
    setColumnMapping({});
    setRowCount(0);
    setDefaultCategory("Ingázós");
    setDefaultPositionId("");
  };
  
  const testConnection = async (urlToTest = null) => {
    const url = urlToTest || sheetUrl;
    if (!url.trim()) {
      toast.error("Google Sheets URL megadása kötelező");
      return;
    }
    
    setTesting(true);
    
    try {
      const response = await axios.post(`${API}/forms/test-connection`, {
        sheet_url: url
      });
      
      setSheetHeaders(response.data.headers || []);
      setRowCount(response.data.row_count || 0);
      setSheetData(response.data.preview_rows || []);
      setConnected(true);
      
      // Auto-detect columns
      const autoMapping = {};
      (response.data.headers || []).forEach((header, idx) => {
        const h = header.toLowerCase();
        if (!autoMapping.name && (h.includes("név") || h.includes("name") || h.includes("teljes"))) {
          autoMapping.name = idx;
        }
        if (!autoMapping.phone && (h.includes("telefon") || h.includes("phone") || h.includes("mobil") || h.includes("szám"))) {
          autoMapping.phone = idx;
        }
        if (!autoMapping.email && (h.includes("email") || h.includes("e-mail"))) {
          autoMapping.email = idx;
        }
        if (!autoMapping.address && (h.includes("lak") || h.includes("cím") || h.includes("város") || h.includes("hely"))) {
          autoMapping.address = idx;
        }
        if (!autoMapping.date && (h.includes("idő") || h.includes("dátum") || h.includes("time") || h.includes("stamp"))) {
          autoMapping.date = idx;
        }
        if (!autoMapping.notes && (h.includes("megjegyzés") || h.includes("note") || h.includes("comment"))) {
          autoMapping.notes = idx;
        }
      });
      setColumnMapping(autoMapping);
      
      setStep(2);
      toast.success(`✅ Kapcsolat sikeres! ${response.data.row_count} jelentkező található.`);
    } catch (error) {
      setConnected(false);
      toast.error(error.response?.data?.detail || "Kapcsolódási hiba - ellenőrizd, hogy a táblázat nyilvános-e!");
    } finally {
      setTesting(false);
    }
  };
  
  const handleColumnSelect = (fieldKey, columnIndex) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: columnIndex === "none" ? undefined : parseInt(columnIndex)
    }));
  };
  
  // Előnézet: megmutatja hogyan néznek ki az adatok a mapping alapján
  const getMappedPreview = () => {
    if (!sheetData || sheetData.length === 0) return [];
    
    return sheetData.slice(0, 5).map(row => {
      const mapped = {};
      CRM_FIELDS.forEach(field => {
        const colIdx = columnMapping[field.key];
        mapped[field.key] = colIdx !== undefined && row[colIdx] ? row[colIdx] : "-";
      });
      return mapped;
    });
  };
  
  const handleSave = async () => {
    if (!sheetUrl.trim()) {
      toast.error("Google Sheets URL megadása kötelező");
      return;
    }
    
    if (columnMapping.name === undefined) {
      toast.error("Név oszlop kiválasztása kötelező!");
      return;
    }
    
    if (columnMapping.phone === undefined) {
      toast.error("Telefonszám oszlop kiválasztása kötelező!");
      return;
    }
    
    setLoading(true);
    
    try {
      // Átalakítjuk az index alapú mappinget betű alapúvá (backend kompatibilitás)
      const letterMapping = {};
      Object.entries(columnMapping).forEach(([key, idx]) => {
        if (idx !== undefined) {
          letterMapping[key] = String.fromCharCode(65 + idx); // 0 -> A, 1 -> B, etc.
        }
      });
      
      const data = {
        sheet_url: sheetUrl,
        name: formName || "Google Űrlap",
        column_mapping: letterMapping,
        default_category: defaultCategory,
        default_position_id: defaultPositionId,
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
  
  const mappedPreview = getMappedPreview();
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
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
          
          {/* Lépések jelző */}
          <div className="flex items-center gap-2 py-2 border-b">
            <Badge variant={step >= 1 ? "default" : "secondary"} className="gap-1">
              1. Kapcsolódás
            </Badge>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <Badge variant={step >= 2 ? "default" : "secondary"} className="gap-1">
              2. Oszlopok beállítása
            </Badge>
          </div>
          
          <div className="space-y-4 py-4">
            {/* Step 1: URL megadás */}
            <div className="space-y-2">
              <Label>Google Sheets URL *</Label>
              <div className="flex gap-2">
                <Input
                  value={sheetUrl}
                  onChange={(e) => {
                    setSheetUrl(e.target.value);
                    setConnected(false);
                    setStep(1);
                  }}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  disabled={loading}
                  className="flex-1"
                />
                <Button
                  onClick={() => testConnection()}
                  disabled={testing || !sheetUrl.trim()}
                  variant={connected ? "outline" : "default"}
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : connected ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : "Kapcsolódás"}
                </Button>
              </div>
              {connected && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kapcsolat OK - {rowCount} jelentkező található</span>
                </div>
              )}
            </div>
            
            {/* Űrlap neve */}
            <div className="space-y-2">
              <Label>Űrlap neve (opcionális)</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="pl. CNC Gépkezelő jelentkezők"
                disabled={loading}
              />
            </div>
            
            {/* Step 2: Oszlop hozzárendelés */}
            {step >= 2 && sheetHeaders.length > 0 && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Oszlopok hozzárendelése
                  </h4>
                  <Badge variant="outline">{sheetHeaders.length} oszlop</Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">
                  Válaszd ki, melyik Google Sheets oszlop melyik CRM mezőbe kerüljön.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {CRM_FIELDS.map(field => (
                    <div key={field.key} className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Select 
                        value={columnMapping[field.key] !== undefined ? String(columnMapping[field.key]) : "none"}
                        onValueChange={(val) => handleColumnSelect(field.key, val)}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Válassz oszlopot..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-- Nincs --</SelectItem>
                          {sheetHeaders.map((header, idx) => (
                            <SelectItem key={idx} value={String(idx)}>
                              {String.fromCharCode(65 + idx)}: {header.length > 30 ? header.substring(0, 30) + "..." : header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                
                {/* Kategória */}
                <div className="space-y-1">
                  <Label className="text-xs">Alapértelmezett kategória</Label>
                  <Select value={defaultCategory} onValueChange={setDefaultCategory}>
                    <SelectTrigger className="w-48 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ingázós">Ingázós</SelectItem>
                      <SelectItem value="Szállásos">Szállásos</SelectItem>
                      <SelectItem value="Felvitt dolgozók">Felvitt dolgozók</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Alapértelmezett pozíció */}
                {positions && positions.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Alapértelmezett pozíció <span className="text-muted-foreground">(opcionális)</span></Label>
                    <Select value={defaultPositionId} onValueChange={setDefaultPositionId}>
                      <SelectTrigger className="w-48 h-9">
                        <SelectValue placeholder="-- Nincs --" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- Nincs --</SelectItem>
                        {positions.map(pos => (
                          <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Ha beállítod, minden jelentkező automatikusan ehhez a pozícióhoz kerül</p>
                  </div>
                )}
                
                {/* Előnézet táblázat */}
                {mappedPreview.length > 0 && (
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Előnézet (első {mappedPreview.length} jelentkező)
                    </h4>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="font-semibold text-xs">Név</TableHead>
                            <TableHead className="font-semibold text-xs">Telefon</TableHead>
                            <TableHead className="font-semibold text-xs">Lakóhely</TableHead>
                            <TableHead className="font-semibold text-xs">Email</TableHead>
                            <TableHead className="font-semibold text-xs">Dátum</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mappedPreview.map((row, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-sm font-medium">{row.name}</TableCell>
                              <TableCell className="text-sm">{row.phone}</TableCell>
                              <TableCell className="text-sm">{row.address}</TableCell>
                              <TableCell className="text-sm">{row.email}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{row.date}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { onOpenChange(false); resetForm(); }} disabled={loading}>
              Mégse
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={loading || !connected || columnMapping.name === undefined || columnMapping.phone === undefined}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {form ? "Mentés" : "Hozzáadás és szinkronizálás"}
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
              <p className="text-muted-foreground">Sheets → Megosztás → "Bárki, aki rendelkezik a linkkel" → "Megtekintő"</p>
            </div>
            <div>
              <strong>4. URL bemásolása:</strong>
              <p className="text-muted-foreground">Másold be a táblázat URL-jét a böngésző címsorából</p>
            </div>
            <div>
              <strong>5. Oszlopok hozzárendelése:</strong>
              <p className="text-muted-foreground">Válaszd ki melyik oszlop melyik CRM mezőbe kerüljön</p>
            </div>
            <div>
              <strong>6. Automatikus frissítés:</strong>
              <p className="text-muted-foreground">A CRM óránként ellenőrzi az új jelentkezőket</p>
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
