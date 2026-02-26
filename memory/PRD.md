# Dolgozó CRM - PRD

## Eredeti Problémaállítás
A felhasználó egy meglévő CRM-rendszer felülvizsgálatát és továbbfejlesztését kérte. A rendszer adminisztrátorok és toborzók számára készült dolgozók, projektek és jelentkezők kezelésére.

## Architektúra

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Fő API szerver
- MongoDB adatbázis: test_database
- Google Sheets integráció: `/app/backend/google_sheets_helper.py`

### Frontend (React + TailwindCSS + Shadcn/UI)
- `/app/frontend/src/pages/DashboardPage.js` - Admin és toborzó dashboard
- `/app/frontend/src/pages/WorkersPage.js` - Dolgozók listázása
- `/app/frontend/src/pages/ProjectDetailPage.js` - Projekt részletek + Kanban pipeline
- `/app/frontend/src/pages/NotificationsPage.js` - Értesítések
- `/app/frontend/src/components/FormSettingsDialog.js` - Google Sheets integráció
- `/app/frontend/src/components/DashboardLayout.js` - Fő layout

## Bejelentkezési Adatok
- **Admin:** admin@crm.hu / Admin123!
- **Toborzó:** toborzo@crm.hu / Toborzo123!

## Elvégzett Feladatok

### 2026-02-26 - E2E Tesztelés ✅
- Teljes rendszer E2E tesztelés: **100% sikeres** (backend: 24/24 teszt, frontend: összes funkció működik)
- Tesztelt funkciók:
  - Admin és Toborzó bejelentkezés
  - Dashboard KPI-ok és grafikonok
  - Projektek listázása és Kanban pipeline (4 státusz oszlop)
  - Értesítések oldal és számláló
  - FormSettingsDialog (Select.Item hiba javítva)
  - Google Sheets integráció (14 sor találva a teszt táblázatban)
  - Próbák fül: Admin létrehozhat, Toborzó csak olvashat
  - Sötét mód működik

### Korábbi munkamenetek
- Státusz szinkronizáció rendszer
- Projekt+Pozíció kötelező választás
- Dashboard implementáció (admin/toborzó specifikus)
- Duplikációkezelés űrlap jelentkezőknél
- Jogosultsági rendszer finomhangolás
- Értesítési számláló javítás
- Dark mode UI javítások

## Egységes Státuszok
| Státusz | Szín | Leírás |
|---------|------|--------|
| Feldolgozatlan | szürke | Még nem feldolgozott |
| Próbára vár | narancs | Próbára vár |
| Próba megbeszélve | lila | Próba időpont megbeszélve |
| Dolgozik | zöld | Aktív dolgozó |
| Tiltólista | piros | Nem dolgozhat |

## API Végpontok
- `POST /api/auth/login` - Bejelentkezés
- `GET /api/dashboard/admin-stats` - Admin dashboard statisztikák
- `GET /api/dashboard/recruiter-stats` - Toborzó dashboard statisztikák
- `GET /api/projects` - Projektek listázása
- `GET /api/projects/{id}` - Projekt részletek
- `POST /api/projects/{id}/workers` - Dolgozó hozzáadása projekthez
- `GET /api/notifications` - Értesítések
- `POST /api/forms/test-connection` - Google Sheets kapcsolat teszt

## Teszt Eredmények (2026-02-26)
- **Backend:** 100% ✅ (24/24 teszt)
- **Frontend:** 100% ✅ (összes tesztelt funkció működik)
- **Teszt fájlok:** `/app/backend/tests/test_crm_api.py`, `/app/test_reports/iteration_11.json`

## Prioritás Lista

### P0 - Kész ✅
- [x] E2E tesztelés
- [x] FormSettingsDialog Select.Item hiba javítás
- [x] Google Sheets integráció
- [x] Jogosultsági rendszer (Próbák fül)
- [x] Értesítési számláló

### P1 - Későbbi / Refaktorálás
- [ ] ProjectDetailPage.js refaktorálása (~2800 sor → kisebb komponensek)
- [ ] Session management javítása
- [ ] Tiltólista dolgozók exportálása
