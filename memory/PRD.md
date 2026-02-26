# Dolgozó CRM - PRD

## Eredeti Problémaállítás
A felhasználó egy meglévő CRM-rendszer felülvizsgálatát és továbbfejlesztését kérte. A rendszer adminisztrátorok és toborzók számára készült dolgozók, projektek és jelentkezők kezelésére.

## Architektúra

### Backend (FastAPI + MongoDB)
- `/app/backend/server.py` - Fő API szerver
- `/app/backend/bulk_email.py` - Bulk Email modul (Gmail OAuth)
- MongoDB adatbázis: test_database
- Google Sheets integráció: `/app/backend/google_sheets_helper.py`

### Frontend (React + TailwindCSS + Shadcn/UI)
- `/app/frontend/src/pages/DashboardPage.js` - Admin és toborzó dashboard
- `/app/frontend/src/pages/WorkersPage.js` - Dolgozók listázása
- `/app/frontend/src/pages/ProjectDetailPage.js` - Projekt részletek + Kanban pipeline
- `/app/frontend/src/pages/BulkEmailPage.js` - Bulk Email modul
- `/app/frontend/src/pages/UnsubscribePage.js` - Leiratkozás oldal
- `/app/frontend/src/pages/NotificationsPage.js` - Értesítések
- `/app/frontend/src/components/FormSettingsDialog.js` - Google Sheets integráció
- `/app/frontend/src/components/DashboardLayout.js` - Fő layout

## Bejelentkezési Adatok
- **Admin:** admin@crm.hu / Admin123!
- **Toborzó:** toborzo@crm.hu / Toborzo123!

## Elvégzett Feladatok

### 2026-02-26 - Bulk Email Modul ✅
- **Bulk Email menüpont** hozzáadva
- **Gmail OAuth integráció** - minden felhasználó saját Gmail fiókját kapcsolhatja
- **Email sablonok** - felhasználónként külön (nem látják egymásét)
- **Dolgozó sablonok** - mentett szűrések gyors kiválasztáshoz
- **Kampány rendszer** - automatikus sorban állás, 500 email/nap limit
- **24 órás számláló** - látható mennyi email küldhető még
- **Leiratkozás link** - minden emailben egyedi link, dolgozó megjelölése
- **Leiratkozás oldal** - /leiratkozas/{token}

### 2026-02-26 - Pozíció jogosultság ✅
- Toborzók csak megtekinthetik a pozíciókat (nem hozhatnak létre/szerkeszthetnek)

### 2026-02-26 - UI módosítások ✅
- "Jó úton vagy! 🎉" sor eltávolítva toborzó dashboardból
- Böngésző tab cím: "Dolgozó CRM"

### Korábbi - E2E Tesztelés ✅
- Backend: 24/24 teszt sikeres
- Frontend: összes funkció működik

## API Végpontok - Bulk Email

| Endpoint | Leírás |
|----------|--------|
| `GET /api/bulk-email/gmail/auth-url` | Gmail OAuth URL |
| `GET /api/oauth/gmail/callback` | OAuth callback |
| `GET /api/bulk-email/gmail/status` | Gmail státusz + napi számláló |
| `DELETE /api/bulk-email/gmail/disconnect` | Gmail leválasztás |
| `GET/POST/PUT/DELETE /api/bulk-email/templates` | Email sablonok CRUD |
| `GET/POST/PUT/DELETE /api/bulk-email/worker-templates` | Dolgozó sablonok CRUD |
| `GET/POST /api/bulk-email/campaigns` | Kampányok |
| `PUT /api/bulk-email/campaigns/{id}/pause` | Kampány szüneteltetés |
| `PUT /api/bulk-email/campaigns/{id}/resume` | Kampány folytatás |
| `POST /api/leiratkozas/{token}` | Leiratkozás feldolgozás |

## Prioritás Lista

### P0 - Kész ✅
- [x] Bulk Email modul
- [x] Gmail OAuth integráció
- [x] Email/Dolgozó sablonok
- [x] Kampány rendszer 500/nap limittel
- [x] Leiratkozás funkció
- [x] Pozíció jogosultság (toborzó read-only)

### P1 - Várakozik (felhasználói beállítás kell)
- [ ] Google Cloud Console credentials beállítása (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)

### P2 - Későbbi
- [ ] ProjectDetailPage.js refaktorálása (~2800 sor)
- [ ] Email megnyitás tracking (opcionális)
