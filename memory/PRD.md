# Dolgozó CRM - PRD (Product Requirements Document)

## Eredeti Probléma Leírás
Magyar nyelvű CRM alkalmazás munkavállalók kezelésére projekteken.

### Implementált Funkciók (2026-02-21)

#### 1. Tervezett Létszám (planned_headcount)
- ✅ Új mező hozzáadva projektekhez
- ✅ Projekt létrehozáskor megadható
- ✅ Projekt szerkesztéskor módosítható

#### 2. Aktív Dolgozók Számlálása (active_worker_count)
- ✅ Automatikusan számolja a "Dolgozik" státuszú dolgozókat
- ✅ Projekt lista: dolgozók/tervezett formátum (pl. "1/10")
- ✅ Progress bar megjelenítése százalékkal

#### 3. "Jelenlegi Dolgozók" Tab
- ✅ Új tab a projekt részletek oldalon
- ✅ Csak "Dolgozik" státuszú dolgozókat mutatja
- ✅ Oszlopok: Név, Telefon, Kategória, Munkakezdés

#### 4. Státusz Változás Naplózása
- ✅ Automatikus bejegyzés a dolgozó notes mezőjébe
- ✅ Időbélyeg formátum: [YYYY-MM-DD HH:MM]
- ✅ Projekt név + státusz + megjegyzés

#### 5. TableRow Bug Javítás
- ✅ Hiányzó <TableRow key={w.id}> tag javítva a Workers tab-ban

## Következő Fázisok

### P0 - Magas Prioritás
- [ ] "Lakcím" átnevezése "Lakóhely"-re
- [ ] OpenStreetMap/Nominatim geocoding integráció
- [ ] Koordináták tárolása dolgozóknál

### P1 - Közepes Prioritás  
- [ ] Interaktív térkép szűrés (FB Marketplace stílus)
- [ ] Megye szerinti szűrés dropdown
- [ ] Sugár beállítás slider (10-100km)

### P2 - Alacsony Prioritás
- [ ] Bulk geocoding progress UI (1/1000 dolgozó)
- [ ] Geocoding review felület problémás címekhez

## Tech Stack
- **Frontend:** React.js + Tailwind CSS + Radix UI
- **Backend:** FastAPI + MongoDB
- **Geocoding:** OpenStreetMap/Nominatim (terv)

## Felhasználói Személyek
1. **Admin** - Teljes hozzáférés, projektek kezelése
2. **Toborzó** - Saját dolgozók kezelése, hozzárendelt projektek

## API Endpoint-ok
- `GET /api/projects` - active_worker_count, planned_headcount
- `GET /api/projects/{id}` - active_worker_count, planned_headcount, workers
- `PUT /api/projects/{id}/workers/{worker_id}/status` - Státusz naplózás

## Tesztelési Eredmények
- Backend: 90%
- Frontend: 70%
- Összesítve: 85%
