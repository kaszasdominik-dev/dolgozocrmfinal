# Dolgozó CRM - PRD (Product Requirements Document)

## Eredeti Probléma Leírás
Magyar nyelvű CRM alkalmazás munkavállalók kezelésére projekteken, helyszín alapú szűréssel.

---

## FÁZIS 1 - Implementált (2026-02-21) ✅

### 1. Tervezett Létszám (planned_headcount)
- ✅ Új mező hozzáadva projektekhez
- ✅ Projekt létrehozáskor/szerkesztéskor megadható

### 2. Aktív Dolgozók Számlálása (active_worker_count)
- ✅ Automatikusan számolja a "Dolgozik" státuszú dolgozókat
- ✅ Projekt lista: dolgozók/tervezett formátum (pl. "1/10")
- ✅ Progress bar megjelenítése százalékkal

### 3. "Jelenlegi Dolgozók" Tab
- ✅ Új tab a projekt részletek oldalon
- ✅ Csak "Dolgozik" státuszú dolgozókat mutatja
- ✅ Oszlopok: Név, Telefon, Kategória, Munkakezdés

### 4. Státusz Változás Naplózása
- ✅ Automatikus bejegyzés a dolgozó notes mezőjébe
- ✅ Időbélyeg formátum: [YYYY-MM-DD HH:MM]
- ✅ Projekt név + státusz + megjegyzés

### 5. TableRow Bug Javítás
- ✅ Hiányzó <TableRow key={w.id}> tag javítva

---

## FÁZIS 2 - Implementált (2026-02-21) ✅

### 1. "Lakcím" → "Lakóhely" Átnevezés
- ✅ WorkerFormPage.js
- ✅ WorkerDetailPage.js  
- ✅ WorkerImportPage.js

### 2. OpenStreetMap/Nominatim Geocoding
- ✅ Automatikus címből koordináta (lat/lng)
- ✅ Megye automatikus felismerése
- ✅ Dolgozó létrehozáskor/módosításkor
- ✅ 100% ingyenes, API kulcs nem szükséges

### 3. Helyszín Alapú Szűrés
- ✅ **Megye dropdown** - 20 magyar megye
- ✅ **Pozíció szűrés** - szabad szöveges
- ✅ **Város/cím keresés** - geocoding + sugár
- ✅ **Sugár slider** - 5-100 km (FB Marketplace stílus)
- ✅ **Haversine távolság számítás** - valós távolság km-ben

### 4. Bulk Geocoding
- ✅ "Címek feldolgozása" gomb admin felületen
- ✅ Háttérben fut, progress megjelenítés
- ✅ 1 kérés/másodperc rate limit (Nominatim policy)
- ✅ Statisztika: geocodolt/összes

---

## Tech Stack
- **Frontend:** React.js + Tailwind CSS + Radix UI + Slider
- **Backend:** FastAPI + MongoDB + httpx
- **Geocoding:** OpenStreetMap/Nominatim (ingyenes)

## API Endpoint-ok (Új)
- `GET /api/counties` - Magyar megyék listája
- `POST /api/geocode` - Egyedi cím geocodolása
- `POST /api/workers/bulk-geocode` - Tömeges geocodolás
- `GET /api/workers/geocode-status/{job_id}` - Job státusz
- `GET /api/workers/geocode-stats` - Geocoding statisztikák

## Szűrő Paraméterek (workers endpoint)
- `county` - Megye szerinti szűrés
- `position_filter` - Pozíció szerinti szűrés
- `center_lat`, `center_lon`, `radius_km` - Távolság szűrés

---

## Felhasználói Személyek
1. **Admin** - Teljes hozzáférés, bulk geocoding
2. **Toborzó** - Saját dolgozók szűrése helyszín szerint

## Tesztelési Eredmények
- **Fázis 1:** Backend 90%, Frontend 70%
- **Fázis 2:** Backend 100%, Frontend 95%

---

## SÖTÉT MÓD JAVÍTÁS (2026-02-21) ✅

### Javított Problémák:
1. ✅ CSS dupla `@layer base` blokkok egyesítése
2. ✅ `body` stílusok áthelyezése az `@layer base` blokkba
3. ✅ `html, body` elemek explicit `bg-background text-foreground` class-ai
4. ✅ Input/Textarea/Select komponensek: `bg-transparent` → `bg-background`
5. ✅ `text-foreground` hozzáadva input komponensekhez
6. ✅ `color-scheme: light dark` hozzáadva input elemekhez
7. ✅ DuplicateResolutionModal `bg-white` → `bg-muted`

### Tesztelési Eredmény:
- Desktop sötét mód: 90%
- Mobil sötét mód: 100% (javítva)
