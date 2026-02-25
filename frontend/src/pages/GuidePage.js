import { useState } from "react";
import { useAuth } from "@/App";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  BookOpen, Users, FolderKanban, Settings, FileSpreadsheet, 
  Calendar, Shield, CheckCircle2, ArrowRight,
  PlusCircle, Edit3, Search, Briefcase, MousePointer2, Info,
  AlertCircle, Layers, Clock, MapPin
} from "lucide-react";

export default function GuidePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeTab, setActiveTab] = useState(isAdmin ? "basics" : "worker-guide");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary/10 rounded-lg">
          <BookOpen className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground">Használati Útmutató</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? "Teljes CRM kezelési útmutató adminisztrátoroknak" : "Toborzói útmutató - Dolgozók és projektek kezelése"}
          </p>
        </div>
      </div>

      {/* Role Badge */}
      <Badge variant={isAdmin ? "default" : "secondary"} className="text-sm px-3 py-1">
        <Shield className="w-3 h-3 mr-1.5" />
        {isAdmin ? "Admin - Teljes hozzáférés" : "Toborzó"}
      </Badge>

      {isAdmin ? <AdminGuide activeTab={activeTab} setActiveTab={setActiveTab} /> : <RecruiterGuide activeTab={activeTab} setActiveTab={setActiveTab} />}
    </div>
  );
}

// ==================== ADMIN ÚTMUTATÓ ====================
function AdminGuide({ activeTab, setActiveTab }) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="basics">Alapok</TabsTrigger>
        <TabsTrigger value="workers">Dolgozók</TabsTrigger>
        <TabsTrigger value="projects">Projektek</TabsTrigger>
        <TabsTrigger value="admin">Admin</TabsTrigger>
      </TabsList>

      <TabsContent value="basics" className="space-y-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>CRM Alapok - Admin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Admin jogkör:</strong> Minden dolgozót és projektet látsz és kezelhetsz. 
                Toborzókat rendelhetsz projektekhez, akik csak saját dolgozóikat kezelik.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <QuickLink icon={Users} title="Dolgozók" desc="Minden dolgozó kezelése, látod ki melyik toborzóé" />
              <QuickLink icon={FolderKanban} title="Projektek" desc="Projektek létrehozása, szerkesztése, dolgozók hozzárendelése" />
              <QuickLink icon={Calendar} title="Naptár" desc="Próbák és projektek naptár nézetben" />
              <QuickLink icon={Settings} title="Beállítások" desc="Kategóriák, státuszok, típusok kezelése" />
              <QuickLink icon={Shield} title="Admin" desc="Toborzók (felhasználók) kezelése" />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="workers" className="space-y-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Dolgozók kezelése (Admin)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section
              title="1. Dolgozó hozzáadása"
              steps={[
                "Jobb felső 'Új dolgozó' gomb",
                "Töltsd ki: Név, Telefon (kötelező)",
                "Kategória (pl. Ingázós), Pozíció (pl. CNC élhajlító)",
                "'Dolgozó hozzáadása' → Kész!"
              ]}
            />

            <Section
              title="2. Projekthez adás"
              steps={[
                "Dolgozó sorában: 'Projekthez adás' gomb",
                "Válaszd ki a PROJEKTET",
                "Válaszd ki a STÁTUSZT (Dolgozik / Próbára vár / Próba megbeszélve)",
                "Ha 'Próba megbeszélve': Válaszd ki a PRÓBÁT és POZÍCIÓT",
                "'Projekthez adás' → Dolgozó hozzáadva a projekt Kanban-jára"
              ]}
            />

            <Section
              title="3. Keresés és szűrés"
              steps={[
                "Keresőmező: Név, telefon, email alapján",
                "Kategória szűrő, Típus szűrő",
                "Térképes keresés: Cím + sugár alapján",
                "Toborzó szűrő: Szűrés tulajdonos szerint"
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="projects" className="space-y-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Projektek kezelése (Admin)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section
              title="1. Projekt létrehozása"
              steps={[
                "'Új projekt' gomb",
                "Töltsd ki: Név, Ügyfél, Dátum, Helyszín",
                "Rendeld hozzá a Toborzókat",
                "'Projekt létrehozása' → Kész!"
              ]}
            />

            <Section
              title="2. Dolgozók kezelése Kanban-on"
              steps={[
                "Projekt megnyitása → Dolgozók fül",
                "4 oszlop: Feldolgozás / Próbára vár / Próba megbeszélve / Dolgozik",
                "Húzd át a dolgozókat oszlopok között (Drag & Drop)",
                "Státusz automatikusan frissül!"
              ]}
            />

            <Section
              title="3. Próba létrehozása"
              steps={[
                "Projekt → Próbák fül → 'Új próba'",
                "Dátum, Idő (pl. 2026.03.15, 08:00)",
                "Pozíciók: Név, Létszám, Órabér (pl. CNC operátor, 5 fő, 2000 Ft/óra)",
                "Dolgozók hozzáadása pozíciókhoz",
                "Próba megjelenik a naptárban!"
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="admin" className="space-y-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin funkciók</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section
              title="1. Toborzók kezelése"
              steps={[
                "Admin menü → 'Új felhasználó'",
                "Email, Név, Jelszó",
                "Szerepkör: Admin (minden) vagy Toborzó (csak saját dolgozók)",
                "Toborzó CSAK saját dolgozóit látja és kezeli!"
              ]}
            />

            <Section
              title="2. Toborzó projekthez rendelése"
              steps={[
                "Projekt → Toborzók fül → 'Toborzó hozzáadása'",
                "Válaszd ki a toborzót",
                "A toborzó ezután látja a projektet",
                "A toborzó csak saját dolgozóit adhatja a projekthez!"
              ]}
            />

            <Section
              title="3. Beállítások"
              steps={[
                "Beállítások → Kategóriák: Új kategória + Szín + Sorrend",
                "Státuszok: Projekt dolgozó státuszok",
                "Típusok: Dolgozó típusok (Szakmunkás, Betanított)",
                "Jellemzők: Tag-ek dolgozókhoz"
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// ==================== TOBORZÓ ÚTMUTATÓ ====================
function RecruiterGuide({ activeTab, setActiveTab }) {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="worker-guide">Dolgozók kezelése</TabsTrigger>
        <TabsTrigger value="project-guide">Projektek</TabsTrigger>
      </TabsList>

      <TabsContent value="worker-guide" className="space-y-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Dolgozók kezelése (Toborzó)</CardTitle>
            <CardDescription>Saját dolgozók kezelése és projektekhez adása</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section
              title="1. Dolgozó hozzáadása"
              steps={[
                "Dolgozók menü → 'Új dolgozó' gomb",
                "Töltsd ki: Név, Telefonszám (kötelező)",
                "Kategória (pl. Ingázós), Pozíció (pl. Hegesztő)",
                "'Dolgozó hozzáadása' → Kész!"
              ]}
            />

            <Section
              title="2. Dolgozó projekthez adása ⭐"
              steps={[
                "Dolgozó sorában: 'Projekthez adás' gomb (mappa ikon)",
                "1️⃣ Válaszd ki a PROJEKTET (amelyhez hozzá vagy rendelve)",
                "2️⃣ Válaszd ki a STÁTUSZT:",
                "   • Feldolgozatlan: Még nincs véglegesítve",
                "   • Próbára vár: Várja a próba időpontját",
                "   • Próba megbeszélve: Konkrét próba kiválasztása!",
                "   • Dolgozik: Már dolgozik a projekten",
                "   • Tiltólista: Nem dolgozhat",
                "3️⃣ Ha 'Próba megbeszélve': Válaszd ki a PRÓBÁT és POZÍCIÓT",
                "'Projekthez adás' → Dolgozó hozzáadva! ✅"
              ]}
            />

            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-900/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 dark:text-blue-100">
                <strong>Példa:</strong> Ha Kiss Jánosnak március 15-re próbát beszéltél meg, válaszd:
                Státusz: "Próba megbeszélve" → Próba: "Március 15, 08:00" → Pozíció: "CNC operátor"
              </AlertDescription>
            </Alert>

            <Section
              title="3. Keresés"
              steps={[
                "Keresőmező: Név, telefonszám, email",
                "Kategória szűrő, Típus szűrő",
                "Térképes keresés: Cím + sugár alapján"
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="project-guide" className="space-y-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>Projektek</CardTitle>
            <CardDescription>Projektek kezelése</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Section
              title="Dolgozók megtekintése projektben"
              steps={[
                "Nyisd meg a projektet → Dolgozók fül",
                "4 oszlop: Feldolgozás / Próbára vár / Próba megbeszélve / Dolgozik",
                "Húzd át a dolgozót másik státuszba → Automatikus frissítés"
              ]}
            />

            <Section
              title="Próbák megtekintése"
              steps={[
                "Projekt → Próbák fül",
                "Lásd a próbákat dátummal, idővel",
                "Dolgozók a próbában láthatók"
              ]}
            />

            <Section
              title="Tippek"
              steps={[
                "⚡ Gyors hozzáadás: Dolgozók → Projekthez adás gomb",
                "📅 Naptár: Lásd a próbákat és projekteket",
                "⚠️ 'Próba megbeszélve' = próba és pozíció választása kötelező!"
              ]}
            />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

// ==================== HELPER KOMPONENSEK ====================
function Section({ title, steps }) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-foreground">{title}</h3>
      <ol className="space-y-2 ml-2">
        {steps.map((step, idx) => (
          <li key={idx} className="flex items-start gap-3 text-sm">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-semibold text-xs flex-shrink-0 mt-0.5">
              {idx + 1}
            </span>
            <span className="text-muted-foreground flex-1">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function QuickLink({ icon: Icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1">
        <h4 className="font-medium text-foreground text-sm">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-muted-foreground mt-1" />
    </div>
  );
}
