import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, Upload, FileSpreadsheet, Check, X, Users, 
  ArrowRight, ChevronDown, AlertCircle, CheckCircle2 
} from "lucide-react";

const WORKER_FIELDS = [
  { key: "name", label: "Név", required: true },
  { key: "phone", label: "Telefon", required: false },
  { key: "email", label: "Email", required: false },
  { key: "address", label: "Lakcím", required: false },
  { key: "position", label: "Pozíció", required: false },
  { key: "experience", label: "Tapasztalat", required: false },
  { key: "notes", label: "Megjegyzés", required: false },
];

export default function WorkerImportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  
  const [step, setStep] = useState(1); // 1: Upload, 2: Map columns, 3: Settings, 4: Result
  const [file, setFile] = useState(null);
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Column mapping: field_key -> column_index
  const [columnMapping, setColumnMapping] = useState({});
  
  // Import settings
  const [workerTypes, setWorkerTypes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedWorkerType, setSelectedWorkerType] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Felvitt dolgozók");
  
  // Import result
  const [importResult, setImportResult] = useState(null);

  useEffect(() => {
    fetchWorkerTypes();
  }, []);

  const fetchWorkerTypes = async () => {
    try {
      const [typesRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/worker-types`),
        axios.get(`${API}/categories`)
      ]);
      setWorkerTypes(typesRes.data);
      setCategories(categoriesRes.data);
      if (typesRes.data.length > 0) {
        setSelectedWorkerType(typesRes.data[0].id);
      }
      if (categoriesRes.data.length > 0) {
        setSelectedCategory(categoriesRes.data[0].name);
      }
    } catch (e) {
      console.error("Error fetching data:", e);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast.error("Csak .xlsx vagy .xls fájl tölthető fel");
      return;
    }
    
    setFile(selectedFile);
    setLoading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const res = await axios.post(`${API}/workers/import/preview`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setPreviewData(res.data);
      
      // Auto-detect columns based on header names
      const autoMapping = {};
      res.data.columns.forEach((col, idx) => {
        const colLower = col.toLowerCase();
        if (colLower.includes("név") || colLower === "name") autoMapping.name = idx;
        else if (colLower.includes("telefon") || colLower.includes("phone") || colLower.includes("tel")) autoMapping.phone = idx;
        else if (colLower.includes("email") || colLower.includes("e-mail")) autoMapping.email = idx;
        else if (colLower.includes("cím") || colLower.includes("lakcím") || colLower.includes("address")) autoMapping.address = idx;
        else if (colLower.includes("pozíció") || colLower.includes("position") || colLower.includes("munkakör")) autoMapping.position = idx;
        else if (colLower.includes("tapasztalat") || colLower.includes("experience")) autoMapping.experience = idx;
        else if (colLower.includes("megjegyzés") || colLower.includes("note")) autoMapping.notes = idx;
      });
      setColumnMapping(autoMapping);
      
      setStep(2);
      toast.success(`${res.data.total_rows} sor található a fájlban`);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba a fájl feldolgozása során");
    } finally {
      setLoading(false);
    }
  };

  const handleColumnSelect = (fieldKey, columnIndex) => {
    setColumnMapping(prev => ({
      ...prev,
      [fieldKey]: columnIndex === "none" ? null : parseInt(columnIndex)
    }));
  };

  const handleImport = async () => {
    if (!columnMapping.name && columnMapping.name !== 0) {
      toast.error("Név oszlop kiválasztása kötelező");
      return;
    }
    if (!selectedWorkerType) {
      toast.error("Dolgozó típus kiválasztása kötelező");
      return;
    }
    
    setImporting(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("settings", JSON.stringify({
        column_mapping: columnMapping,
        worker_type_id: selectedWorkerType,
        category: selectedCategory,
        global_status: "Feldolgozatlan",
        start_row: 2,
        apply_same_to_all: true
      }));
      
      const res = await axios.post(`${API}/workers/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setImportResult(res.data);
      setStep(4);
      toast.success(res.data.message);
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hiba az importálás során");
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setColumnMapping({});
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/workers")} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Dolgozók importálása</h1>
          <p className="text-sm text-muted-foreground">Excel fájlból tömeges feltöltés</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { num: 1, label: "Fájl feltöltés" },
          { num: 2, label: "Oszlop hozzárendelés" },
          { num: 3, label: "Beállítások" },
          { num: 4, label: "Eredmény" }
        ].map((s, i) => (
          <div key={s.num} className="flex items-center">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
              ${step >= s.num ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
              {step > s.num ? <Check className="w-4 h-4" /> : s.num}
            </div>
            <span className={`ml-2 text-sm hidden sm:inline ${step >= s.num ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
            {i < 3 && <ArrowRight className="w-4 h-4 mx-2 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              Excel fájl kiválasztása
            </CardTitle>
            <CardDescription>
              Támogatott formátumok: .xlsx, .xls (max 1000 sor)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".xlsx,.xls" 
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium text-foreground mb-1">Kattints vagy húzd ide a fájlt</p>
              <p className="text-sm text-muted-foreground">Excel fájl (.xlsx, .xls)</p>
            </div>
            
            {loading && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Fájl feldolgozása...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && previewData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ChevronDown className="w-5 h-5 text-primary" />
              Oszlop hozzárendelés
            </CardTitle>
            <CardDescription>
              Válaszd ki, melyik Excel oszlop melyik mezőhöz tartozik. A "Név" mező kötelező.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Column mapping selects */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {WORKER_FIELDS.map(field => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-sm flex items-center gap-1">
                    {field.label}
                    {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select 
                    value={columnMapping[field.key]?.toString() ?? "none"} 
                    onValueChange={(v) => handleColumnSelect(field.key, v)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Válassz oszlopot..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">-- Nincs hozzárendelve --</SelectItem>
                      {previewData.columns.map((col, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>{col}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {/* Preview table */}
            <div className="space-y-2">
              <Label className="text-sm">Előnézet (első 5 sor)</Label>
              <div className="border rounded-lg overflow-auto max-h-64">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      {previewData.columns.map((col, idx) => (
                        <TableHead key={idx} className="text-xs whitespace-nowrap">
                          {col}
                          {Object.entries(columnMapping).find(([k, v]) => v === idx) && (
                            <Badge variant="secondary" className="ml-1 text-[10px]">
                              {WORKER_FIELDS.find(f => f.key === Object.entries(columnMapping).find(([k, v]) => v === idx)?.[0])?.label}
                            </Badge>
                          )}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.preview_rows.slice(0, 5).map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        {row.map((cell, cellIdx) => (
                          <TableCell key={cellIdx} className="text-xs py-2 whitespace-nowrap">
                            {cell || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground">Összesen {previewData.total_rows} sor lesz importálva</p>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={resetImport}>
                <ArrowLeft className="w-4 h-4 mr-2" />Vissza
              </Button>
              <Button 
                onClick={() => setStep(3)} 
                disabled={columnMapping.name === null && columnMapping.name !== 0}
                className="bg-primary"
              >
                Tovább<ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Settings */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Import beállítások
            </CardTitle>
            <CardDescription>
              Az összes importált dolgozóra ugyanazok a beállítások vonatkoznak
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm">Dolgozó típus *</Label>
              <Select value={selectedWorkerType} onValueChange={setSelectedWorkerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Válassz típust..." />
                </SelectTrigger>
                <SelectContent>
                  {workerTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Az összes dolgozó ebbe a típusba kerül</p>
            </div>

            <div className="space-y-1">
              <Label className="text-sm">Kategória</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Az összes dolgozó ebbe a kategóriába kerül</p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">Összefoglaló</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Fájl: <span className="text-foreground">{file?.name}</span></li>
                <li>• Importálandó sorok: <span className="text-foreground">{previewData?.total_rows}</span></li>
                <li>• Típus: <span className="text-foreground">{workerTypes.find(t => t.id === selectedWorkerType)?.name}</span></li>
                <li>• Kategória: <span className="text-foreground">{selectedCategory}</span></li>
                <li>• Hozzárendelt oszlopok: <span className="text-foreground">
                  {Object.entries(columnMapping).filter(([k, v]) => v !== null).length} / {WORKER_FIELDS.length}
                </span></li>
              </ul>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="w-4 h-4 mr-2" />Vissza
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={importing || !selectedWorkerType}
                className="bg-primary"
              >
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Importálás...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Importálás ({previewData?.total_rows} sor)
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Result */}
      {step === 4 && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Import befejezve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{importResult.imported}</p>
                <p className="text-sm text-green-700 dark:text-green-400">Sikeresen importálva</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-amber-600">{importResult.skipped}</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">Kihagyva</p>
              </div>
            </div>

            {importResult.errors?.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm flex items-center gap-1">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  Hibák
                </Label>
                <div className="bg-destructive/10 rounded-lg p-3 max-h-32 overflow-auto">
                  {importResult.errors.map((err, idx) => (
                    <p key={idx} className="text-xs text-destructive">{err}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={resetImport}>
                Új import
              </Button>
              <Button onClick={() => navigate("/workers")} className="bg-primary">
                Dolgozók megtekintése
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
