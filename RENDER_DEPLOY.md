# 🚀 CRM4 - RENDER.COM TELEPÍTÉSI ÚTMUTATÓ (100% INGYENES!)

## 🎯 Miért Render.com?

✅ **100% INGYENES** tier elérhető
✅ Automatikus deploy GitHub-ról
✅ Beépített MongoDB (ingyenes tier)
✅ HTTPS automatikusan
✅ Nincs szükség szerver adminisztrációra
✅ Automatikus újraindítás ha leáll

---

## 📋 ELŐFELTÉTELEK

1. **GitHub account** (ingyenes)
2. **Render.com account** (ingyenes)
3. **A CRM4 kód GitHub-on** (már megvan a repodban!)

---

## 🚀 LÉPÉSRŐL LÉPÉSRE TELEPÍTÉS

### **1. LÉPÉS: GitHub Repo Előkészítése**

#### A) Ha még nincs fent GitHub-on:
```bash
# GitHub-on: Új repository létrehozása (crm4-app)
# Majd:
cd /path/to/your/crm4
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/crm4-app.git
git push -u origin main
```

#### B) Ha már fent van - Skip!

---

### **2. LÉPÉS: Render.com Regisztráció**

1. Menj: https://render.com
2. Kattints: **"Get Started for Free"**
3. Jelentkezz be GitHub account-tal (egyszerűbb!)
4. Engedélyezd a GitHub hozzáférést

✅ **Kész! Ingyenes, nem kell bankkártya!**

---

### **3. LÉPÉS: MongoDB Adatbázis Létrehozása (Ingyenes)**

1. Render Dashboard → **"New +"** gomb
2. Válaszd: **"MongoDB"** vagy használj **MongoDB Atlas** (ingyenes)

#### **Opció A: MongoDB Atlas (AJÁNLOTT - Ingyenes 512MB)**

```
1. Menj: https://www.mongodb.com/cloud/atlas/register
2. Regisztráció (email + jelszó)
3. Cluster létrehozása:
   - Cluster Tier: M0 (FREE) ✅
   - Cloud Provider: AWS
   - Region: Frankfurt (EU)
4. Database Access:
   - Add New User → Username: crm4user, Password: [Generate]
5. Network Access:
   - Add IP: 0.0.0.0/0 (Allow from anywhere)
6. Connect:
   - Drivers → Node.js
   - Connection String másolása:
     mongodb+srv://crm4user:<password>@cluster0.xxxxx.mongodb.net/crm4_db
```

#### **Opció B: Render PostgreSQL helyett MongoDB**
*Megjegyzés: Render natívan PostgreSQL-t támogat ingyen, MongoDB-hez külső szolgáltatás kell (Atlas)*

---

### **4. LÉPÉS: Backend Deploy (FastAPI Python)**

1. Render Dashboard → **"New +"** → **"Web Service"**

2. **Connect Repository:**
   - GitHub → Válaszd ki: `crm4-app` repo
   - Branch: `main`

3. **Configure Service:**
   ```
   Name: crm4-backend
   Region: Frankfurt
   Branch: main
   Root Directory: backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
   Instance Type: Free ✅
   ```

4. **Environment Variables** (kattints: Advanced):
   ```
   MONGO_URL = mongodb+srv://crm4user:PASSWORD@cluster0.xxxxx.mongodb.net/crm4_db
   DB_NAME = crm4_db
   JWT_SECRET = [generálj egy hosszú random stringet - lásd alább]
   CORS_ORIGINS = *
   ```

   **JWT_SECRET generálás:**
   ```bash
   # Futtasd terminálban:
   python3 -c "import secrets; print(secrets.token_urlsafe(48))"
   # Másold ki az eredményt
   ```

5. Kattints: **"Create Web Service"**

⏳ **Várj 5-10 percet** → Backend deploy folyamatban...

✅ **Kész!** Backend URL-ed: `https://crm4-backend.onrender.com`

---

### **5. LÉPÉS: Frontend Deploy (React)**

1. Render Dashboard → **"New +"** → **"Static Site"**

2. **Connect Repository:**
   - GitHub → `crm4-app` repo
   - Branch: `main`

3. **Configure:**
   ```
   Name: crm4-frontend
   Branch: main
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: build
   ```

4. **Environment Variables:**
   ```
   REACT_APP_BACKEND_URL = https://crm4-backend.onrender.com/api
   ```
   ⚠️ **FONTOS:** Cseréld ki `crm4-backend` URL-t az előző lépésben kapott backend URL-re!

5. Kattints: **"Create Static Site"**

⏳ **Várj 3-5 percet** → Frontend build folyamatban...

✅ **Kész!** Frontend URL-ed: `https://crm4-frontend.onrender.com`

---

### **6. LÉPÉS: Teszt Admin Létrehozása**

1. Render Dashboard → **crm4-backend** service
2. Kattints: **"Shell"** (Jobb oldalon)
3. Futtasd:
   ```bash
   cd /opt/render/project/src
   python create_test_admin.py
   ```

✅ **Admin létrehozva!**

**Teszt belépés:**
- Email: `admin@dolgozocrm.hu`
- Jelszó: `Admin123!`

---

### **7. LÉPÉS: Demo Adatok (Opcionális)**

Shell-ben:
```bash
python create_demo_data.py
```

✅ Kész! Demo projekt, dolgozók, próbák létrehozva!

---

## 🎉 TELEPÍTÉS KÉSZ!

### **Alkalmazásod elérése:**

```
Frontend: https://crm4-frontend.onrender.com
Backend API: https://crm4-backend.onrender.com/api
```

### **Bejelentkezés:**
```
Email: admin@dolgozocrm.hu
Jelszó: Admin123!
```

---

## 📊 INGYENES TIER KORLÁTOK

### **Render.com Free Tier:**
```
✅ 512 MB RAM
✅ Unlimited bandwidth
✅ Automatikus SSL/HTTPS
✅ Automatikus deploy (git push)
⚠️ Service leáll 15 perc inaktivitás után
   → Újraindul első kérésnél (~30 sec)
✅ Több service (backend + frontend)
```

### **MongoDB Atlas Free (M0):**
```
✅ 512 MB storage
✅ Megosztott RAM
✅ Korlátlan connections (max 500 egyidejű)
✅ Automated backups
```

**Összesen: 100% INGYENES!** 🎊

---

## 🔧 GYAKORI PROBLÉMÁK & MEGOLDÁSOK

### **1. Backend nem indul el**
```
Hiba: "Module not found"

Megoldás:
1. Render Dashboard → Backend Service
2. Settings → Build Command:
   pip install -r requirements.txt
3. Manual Deploy → Clear build cache & deploy
```

### **2. Frontend nem látja a Backend-et**
```
Hiba: "Network Error" vagy CORS

Megoldás:
1. Ellenőrizd Frontend env var:
   REACT_APP_BACKEND_URL = https://crm4-backend.onrender.com/api
2. Backend CORS_ORIGINS = *
3. Redeploy mindkettő
```

### **3. MongoDB connection failed**
```
Hiba: "Connection timeout"

Megoldás:
1. MongoDB Atlas → Network Access
2. IP Whitelist: 0.0.0.0/0 (Allow all)
3. Database User jelszó ellenőrzés
4. Connection string ellenőrzés (backend env var)
```

### **4. Service leáll automatikusan**
```
Ez normális az ingyenes tier-nél!

Megoldás:
- Első request után ~30 sec-re újraindul
- Vagy: UptimeRobot.com (ingyenes monitoring)
  → Ping-eli a service-t 5 percenként
  → Így nem alszik el
```

### **5. Build timeout**
```
Hiba: "Build exceeded time limit"

Megoldás:
- Frontend: package.json → Töröld a dev dependencies-t build előtt
- Backend: requirements.txt → Csak szükséges package-ek
```

---

## 🚀 AUTOMATIKUS DEPLOY BEÁLLÍTÁSA

**Render automatikusan deploy-ol minden git push-ra!**

```bash
# Workflow:
1. Változtatás a kódban
2. git add .
3. git commit -m "Fix: xyz"
4. git push origin main
5. Render automatikusan észleli és deploy-ol!
```

✅ **Nincs több manual deploy!**

---

## 📈 FRISSÍTÉS (Update)

### **Ha változtatást csinálsz:**

```bash
# Lokálisan:
git add .
git commit -m "Feature: új funkció"
git push origin main

# Render.com:
→ Automatikusan deploy-ol! ✅
```

### **Manual redeploy (ha kell):**
```
Render Dashboard → Service → Manual Deploy
```

---

## 💰 KÖLTSÉG ÖSSZEFOGLALÓ

| Szolgáltatás | Költség |
|--------------|---------|
| Render.com Backend | **€0** |
| Render.com Frontend | **€0** |
| MongoDB Atlas (512MB) | **€0** |
| Domain (opcionális) | ~€10/év |
| SSL Certificate | **€0** (auto) |
| **ÖSSZESEN** | **€0/hó** 🎉 |

---

## 🌐 SAJÁT DOMAIN HOZZÁADÁSA (Opcionális)

### **Ha van saját domain-ed (pl. crm4.hu):**

1. **Render Dashboard:**
   - Frontend Service → Settings → Custom Domain
   - Add: `crm4.hu` és `www.crm4.hu`

2. **Domain szolgáltatónál (pl. tarhely.eu):**
   ```
   DNS Records:
   A     @     76.76.21.21
   CNAME www   crm4-frontend.onrender.com
   ```

3. **SSL:**
   - Render automatikusan generál SSL certificate-et
   - ~5-10 perc után HTTPS működik

✅ **Kész! Elérhető: https://crm4.hu**

---

## 🔒 BIZTONSÁGI BEÁLLÍTÁSOK (Production)

### **1. CORS szigorítás:**
```
Backend Environment Variables:
CORS_ORIGINS = https://crm4-frontend.onrender.com,https://crm4.hu
```

### **2. MongoDB IP Whitelist:**
```
Ha tudd a Render IP-ket, szűkítsd!
(Alapból 0.0.0.0/0 OK ingyen verzióhoz)
```

### **3. JWT_SECRET:**
```
SOHA ne commitold Git-be!
Mindig Environment Variable-ben!
```

---

## 📊 MONITORING & LOGS

### **Backend Logs:**
```
Render Dashboard → Backend Service → Logs
→ Real-time log stream
```

### **Frontend Logs:**
```
Render Dashboard → Frontend Static Site → Deploys
→ Build logs
```

### **Database Monitoring:**
```
MongoDB Atlas → Dashboard → Metrics
→ Connections, Operations, Storage
```

---

## 🎓 TOVÁBBI FORRÁSOK

- **Render Docs:** https://render.com/docs
- **MongoDB Atlas Docs:** https://www.mongodb.com/docs/atlas/
- **CRM4 GitHub:** https://github.com/primeworkscontact-beep/crm4

---

## ✅ CHECKLIST - TELEPÍTÉS UTÁN

- [ ] Backend elérhető: `https://crm4-backend.onrender.com/api`
- [ ] Frontend betölt: `https://crm4-frontend.onrender.com`
- [ ] Admin bejelentkezés működik
- [ ] MongoDB kapcsolat OK
- [ ] Dolgozók hozzáadása működik
- [ ] Projektek létrehozása működik
- [ ] Google Forms integráció tesztelhető (opcionális)
- [ ] Automatikus deploy tesztelve (git push)

---

## 🎊 GRATULÁLUNK!

**A CRM4 online és 100% ingyen fut! 🚀**

Ha kérdés van:
1. Nézd meg a Render logs-ot
2. Ellenőrizd az Environment Variables-t
3. MongoDB Atlas connection string OK-e?

**Élvezd a használatot! 💪**

---

**Készítette:** CRM4 Team
**Verzió:** 1.0 - Render.com Deploy
**Dátum:** 2025-02-20
