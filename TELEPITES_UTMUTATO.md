# 📦 CRM4 Dolgozó Kezelő - Telepítési Útmutató

## 🎯 Mi ez a rendszer?

Ez egy **dolgozó és projekt kezelő CRM rendszer** toborzók és HR csapatok számára.

**Funkciók:**
- Dolgozók nyilvántartása
- Projektek kezelése
- Próbák szervezése
- Várólista kezelés
- Statisztikák és jelentések

---

## 💻 Mire van szükség? (Előfeltételek)

### Windows felhasználóknak:
1. **Node.js** (JavaScript futtatókörnyezet)
   - Letöltés: https://nodejs.org/
   - Válaszd az "LTS" verziót (zöld gomb)
   - Telepítés: csak kattints Next-Next-Finish

2. **Python 3.11+** (Backend futtatáshoz)
   - Letöltés: https://www.python.org/downloads/
   - ⚠️ FONTOS: Pipáld be "Add Python to PATH"-t telepítéskor!

3. **MongoDB** (Adatbázis)
   - Letöltés: https://www.mongodb.com/try/download/community
   - Válaszd a "Windows" verziót
   - Telepítés után elindul automatikusan

### macOS felhasználóknak:
1. **Node.js:**
   ```bash
   brew install node
   ```

2. **Python 3:**
   ```bash
   brew install python@3.11
   ```

3. **MongoDB:**
   ```bash
   brew tap mongodb/brew
   brew install mongodb-community
   brew services start mongodb-community
   ```

### Linux (Ubuntu/Debian) felhasználóknak:
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Python 3
sudo apt-get install python3.11 python3-pip

# MongoDB
sudo apt-get install -y mongodb
sudo systemctl start mongodb
```

---

## 🚀 Telepítés lépésről lépésre

### 1. Fájlok letöltése

**GitHub-ról:**
```bash
git clone https://github.com/primeworkscontact-beep/crm4.git
cd crm4/crm4-main
```

**Vagy ZIP letöltés:**
1. Menj a GitHub oldalra
2. Kattints a zöld "Code" gombra
3. "Download ZIP"
4. Csomagold ki egy mappába (pl. `C:\crm4`)

---

### 2. Backend telepítése

#### Windows:
```cmd
cd backend
pip install -r requirements.txt
```

#### macOS / Linux:
```bash
cd backend
pip3 install -r requirements.txt
```

**Ha hiba van:**
- Windows: `python -m pip install -r requirements.txt`
- macOS/Linux: `python3 -m pip install -r requirements.txt`

---

### 3. Frontend telepítése

```bash
cd ../frontend
npm install
```

vagy ha lassú:
```bash
yarn install
```

⏳ **Ez eltarthat 2-5 percig!** Várj türelemmel.

---

### 4. Környezeti változók beállítása

#### Backend (.env file):

Hozd létre: `backend/.env`

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="crm4_database"
CORS_ORIGINS="*"
JWT_SECRET="vv-WjzU9owqZ-1pUowIwTP8xAtNRkyZYfpVCAYo764ldsjRaqj4sy538GiUeMGK-"
```

#### Frontend (.env file):

Hozd létre: `frontend/.env`

```env
REACT_APP_BACKEND_URL=http://localhost:8001/api
```

---

### 5. Teszt Admin létrehozása

```bash
cd ..
python create_test_admin.py
```

**Teszt belépési adatok:**
- Email: `admin@dolgozocrm.hu`
- Jelszó: `Admin123!`

---

### 6. Rendszer indítása

#### Módszer 1: Két terminál (EGYSZERŰ)

**1. Terminál - Backend:**
```bash
cd backend
python server.py
```

Várj amíg megjelenik: `INFO: Uvicorn running on http://0.0.0.0:8001`

**2. Terminál - Frontend:**
```bash
cd frontend
npm start
```

Várj amíg automatikusan megnyílik a böngésző: `http://localhost:3000`

---

#### Módszer 2: Supervisor (HALADÓ - Linux/macOS)

Ha szeretnél mindent egy helyen futtatni:

```bash
# Supervisor telepítése
pip install supervisor

# Indítás
supervisord -c supervisord.conf
supervisorctl status
```

---

## 🌐 Használat

### 1. Böngészőben nyisd meg:
```
http://localhost:3000
```

### 2. Jelentkezz be:
- Email: `admin@dolgozocrm.hu`
- Jelszó: `Admin123!`

### 3. Kezdd el használni! 🎉

---

## 📱 Mobilon is működik?

**Igen!** A rendszer telefonbarát (responsive).

Ha szeretnéd **telefonról** is elérni:
1. Nézd meg a számítógéped IP címét:
   - Windows: `ipconfig`
   - macOS/Linux: `ifconfig` vagy `ip addr`
   
2. Telefonon nyisd meg:
   ```
   http://[SZÁMÍTÓGÉP_IP]:3000
   ```
   
   Pl: `http://192.168.1.105:3000`

⚠️ **Fontos:** A telefon és számítógép ugyanazon a WiFi-n legyenek!

---

## ❓ Gyakori hibák és megoldások

### "Port 8001 already in use"
**Megoldás:** Már fut egy backend. Állítsd le:
```bash
# Windows
taskkill /F /IM python.exe

# macOS/Linux
pkill -f "python server.py"
```

### "Port 3000 already in use"
**Megoldás:** Már fut egy frontend:
```bash
# Windows
taskkill /F /IM node.exe

# macOS/Linux
pkill -f "react-scripts"
```

### "MongoDB connection failed"
**Megoldás:** MongoDB nem fut. Indítsd el:
```bash
# Windows
net start MongoDB

# macOS
brew services start mongodb-community

# Linux
sudo systemctl start mongodb
```

### "Module not found"
**Megoldás:** Telepítsd újra a függőségeket:
```bash
# Backend
pip install -r backend/requirements.txt

# Frontend
cd frontend && npm install
```

---

## 🛑 Leállítás

### Backend:
- Nyomd meg: `Ctrl + C` a terminálban

### Frontend:
- Nyomd meg: `Ctrl + C` a terminálban

### MongoDB (ha szeretnéd):
```bash
# Windows
net stop MongoDB

# macOS
brew services stop mongodb-community

# Linux
sudo systemctl stop mongodb
```

---

## 🔐 Biztonság éles használathoz

Ha **interneten** szeretnéd elérhetővé tenni:

1. **JWT_SECRET változtatása:**
   - Generálj új secretet: https://randomkeygen.com/
   - Frissítsd `backend/.env`-ben

2. **CORS beállítás:**
   ```env
   CORS_ORIGINS="https://sajat-domain.hu"
   ```

3. **HTTPS használata** (SSL tanúsítvány)

4. **MongoDB jelszó védelem**

5. **Tűzfal beállítások**

⚠️ **Javasoljuk:** Használj felhő szolgáltatást (Heroku, DigitalOcean, AWS)

---

## 📞 Segítség

Ha elakadtál:
1. Nézd meg a **hibaüzenetet**
2. Google-ozz rá: "nodejs error ..." vagy "python error ..."
3. Kérdezd meg ChatGPT-t vagy Claude-ot
4. Keress fejlesztőt aki segít a telepítésben

---

## ✅ Sikeres telepítés ellenőrzése

Ha minden OK, akkor:
- ✅ `http://localhost:3000` betöltődik
- ✅ Be tudsz jelentkezni admin@dolgozocrm.hu-val
- ✅ Látsz dashboardot
- ✅ Tudsz dolgozót hozzáadni
- ✅ Tudsz projektet létrehozni

**Gratulálunk! A CRM működik! 🎊**

---

## 🎓 Nehéz lesz programozó tudás nélkül?

**Telepítés:** Közepes nehézség (1-2 óra első alkalommal)

**Használat:** Könnyű! Felhasználóbarát felület.

**Karbantartás:** 
- Alapszintű számítógépes ismeretek kellenek
- Ha elakadsz, keress egy IT-s segítséget a telepítéshez

**Javaslat:**
- Első telepítéshez kérj segítséget egy programozótól/IT-stól
- Utána már te is kezeled egyszerűen

---

**Készítette:** Emergent AI Agent
**Verzió:** 1.0 (2025 Február)
**Utolsó frissítés:** 2025-02-20
