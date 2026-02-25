# Dolgozó CRM - PRD

## Eredeti Problémaállítás
A dolgozó CRM státuszainak szinkronizálása. A projekt szintű és a globális CRM lista státuszait összhangba kellett hozni az alábbi egységes rendszer szerint:
- Feldolgozatlan
- Próbára vár
- Próba megbeszélve
- Dolgozik
- Tiltólista (Nem dolgozhat)

Kiegészítő követelmény: 
- Ha egy dolgozó projektnél kukába kerül, automatikusan "Feldolgozatlan" státuszú lesz a globális listában.
- Ha projekt-specifikus státuszt választ (Próbára vár, Próba megbeszélve, Dolgozik), kötelező projekt ÉS pozíció választás.

## Architektúra

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Fő API szerver
- MongoDB adatbázis: test_database

### Frontend (React + TailwindCSS)
- `/app/frontend/src/pages/WorkerFormPage.js` - Új dolgozó / Szerkesztés
- `/app/frontend/src/pages/WorkersPage.js` - Dolgozók listázása
- `/app/frontend/src/pages/ProjectDetailPage.js` - Projekt részletek + Pipeline
- `/app/frontend/src/pages/DashboardPage.js` - Áttekintő oldal
- `/app/frontend/src/pages/WorkerDetailPage.js` - Dolgozó részletek
- `/app/frontend/src/components/FormLeadsTab.js` - Űrlap jelentkezők kezelése

## Elvégzett Feladatok (2026-02-25)

### 1. Státusz Szinkronizáció - TELJES ✅
- Minden "Feldolgozás alatt" → "Feldolgozatlan" átnevezés
- Minden "Máshol dolgozik", "Inaktív" → eltávolítva
- "Tiltólista" státusz hozzáadva mindenhová
- Backend és frontend egységes státuszok

### 2. Projekt+Pozíció Kötelező Választás ✅
- Ha "Próbára vár", "Próba megbeszélve" vagy "Dolgozik" státuszt választ új dolgozónál:
  - Felugrik "Projekt és pozíció választás" dialog
  - Kötelező projekt kiválasztása
  - Kötelező legalább egy pozíció kiválasztása
  - Megerősítés gomb disabled amíg nincs pozíció
- Ha "Feldolgozatlan" vagy "Tiltólista" → nincs projekt/pozíció kényszer

### 3. Frissített Helyek
- WorkerFormPage.js: Új dolgozó státusz dropdown + projekt+pozíció dialog
- WorkersPage.js: Státusz szűrő, státusz színek
- ProjectDetailPage.js: Pipeline oszlopok (Tiltólista hozzáadva)
- DashboardPage.js: "Feldolgozatlan" statisztika kártya + színek
- WorkerDetailPage.js: Státusz badge színek
- FormLeadsTab.js: "Feldolgozatlan" gomb
- GuidePage.js: Dokumentáció frissítve

## Alapértelmezett Bejelentkezési Adatok
- Email: admin@crm.hu
- Jelszó: Admin123!

## Egységes Státuszok
| Státusz | Szín | Emoji | Leírás |
|---------|------|-------|--------|
| Feldolgozatlan | #9CA3AF (szürke) | ⚪ | Még nem feldolgozott |
| Próbára vár | #F97316 (narancs) | 🟠 | Próbára vár |
| Próba megbeszélve | #8B5CF6 (lila) | 🟣 | Próba időpont megbeszélve |
| Dolgozik | #10B981 (zöld) | 🟢 | Aktív dolgozó |
| Tiltólista | #EF4444 (piros) | 🔴 | Nem dolgozhat |

## Teszt Eredmények
- Backend: 100% ✅
- Frontend: 70% (session management korlátok miatt)

## API Végpontok
- `GET /api/statuses` - Projekt státuszok (Feldolgozatlan, Próbára vár, Próba megbeszélve, Dolgozik, Tiltólista, Kuka)
- `GET /api/global-statuses` - Globális státuszok (5 db)
- `POST /api/sync-statuses` - Régi státuszok migrálása (admin only)

## Prioritás Lista

### P0 - Kész ✅
- [x] Egységes státuszok minden helyen
- [x] Projekt+pozíció kötelező választás
- [x] Kuka → Feldolgozatlan automatikus váltás

### P1 - Későbbi
- [ ] Session management javítása
- [ ] Tiltólista dolgozók exportálása
