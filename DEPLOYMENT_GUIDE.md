# 🚀 Dolgozó CRM - Deployment Guide

## 📋 Környezeti Változók Beállítása

### Backend (.env)

Másold le a `backend/.env.example` fájlt `backend/.env` névre, és töltsd ki:

```env
MONGO_URL="mongodb://localhost:27017"
DB_NAME="dolgozocrm"
CORS_ORIGINS="*"
JWT_SECRET="GENERÁLJ_RANDOM_STRING_IT"
GROQ_API_KEY="GROQ_API_KULCSOD"
```

**Hol szerzed be:**
- **GROQ_API_KEY**: https://console.groq.com → API Keys
- **JWT_SECRET**: Generálj random string-et (pl. `openssl rand -base64 32`)
- **MONGO_URL**: MongoDB Atlas connection string (https://mongodb.com)

### Frontend (.env)

Másold le a `frontend/.env.example` fájlt `frontend/.env` névre:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
WDS_SOCKET_PORT=443
ENABLE_HEALTH_CHECK=false
```

Production-re állítsd át: `REACT_APP_BACKEND_URL=https://your-backend.onrender.com`

---

## 🔐 BIZTONSÁGI FIGYELMEZTETÉS

**⚠️ SOHA NE COMMITÁLD A .env FÁJLOKAT!**

A `.gitignore` védett, de ha véletlenül mégis commitálnád:
1. Azonnal generálj új API kulcsokat!
2. Töröld a régi kulcsokat a service provider-nél
3. Használd a `git-filter-repo` vagy `BFG Repo-Cleaner` eszközt

---

## 🚀 Render.com Deploy

### 1. MongoDB Atlas Setup
- Hozz létre ingyenes clustert: https://mongodb.com
- Másold ki a connection string-et
- IP Whitelist: 0.0.0.0/0 (bármely IP)

### 2. Backend Deploy (Render)
- New → Web Service
- Repo: GitHub repo URL
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn server:app --host 0.0.0.0 --port $PORT`

**Environment Variables:**
```
GROQ_API_KEY=your_groq_key
JWT_SECRET=your_jwt_secret
MONGO_URL=mongodb+srv://...
DB_NAME=dolgozocrm_production
CORS_ORIGINS=https://your-frontend.onrender.com
```

### 3. Frontend Deploy (Render)
- New → Static Site
- Root directory: `frontend`
- Build command: `yarn install && yarn build`
- Publish directory: `build`

**Environment Variables:**
```
REACT_APP_BACKEND_URL=https://your-backend.onrender.com
```

---

## ✅ Post-Deploy Checklist

- [ ] Backend elérhető: `https://your-backend.onrender.com/health`
- [ ] Frontend betölt
- [ ] Login működik
- [ ] CV Import AI működik
- [ ] Gender detection működik
- [ ] Excel import háttérben fut

---

## 🆘 Hibaelhárítás

**Backend nem indul:**
- Ellenőrizd a Render logs-ot
- Nézd meg hogy minden ENV változó be van-e állítva

**Frontend nem ér el backend-et:**
- CORS_ORIGINS tartalmazza a frontend URL-t?
- REACT_APP_BACKEND_URL helyes?

**MongoDB connection hiba:**
- IP Whitelist 0.0.0.0/0?
- Connection string helyes?

---

**📧 Support:** Ha elakadtál, nézd meg a Render dokumentációt vagy kérdezz!
