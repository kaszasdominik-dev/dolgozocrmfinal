from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form, BackgroundTasks, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
from passlib.context import CryptContext
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import io
import json
import ftplib
import asyncio
import httpx
import math
from contextlib import asynccontextmanager

# Import security utilities
from security import (
    validate_password_strength,
    LoginAttemptTracker,
    AuditLogger,
    sanitize_string,
    sanitize_phone,
    sanitize_email,
    validate_jwt_secret
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Exports directory for Excel files
EXPORTS_DIR = ROOT_DIR / "exports"
EXPORTS_DIR.mkdir(exist_ok=True)

# FTP Configuration
FTP_HOST = os.environ.get('FTP_HOST', '')
FTP_USER = os.environ.get('FTP_USER', '')
FTP_PASS = os.environ.get('FTP_PASS', '')
FTP_FOLDER = os.environ.get('FTP_FOLDER', '/dolgozok_backup')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration - MUST be set in environment!
JWT_SECRET = os.environ.get('JWT_SECRET')
if not JWT_SECRET:
    raise ValueError(
        "❌ KRITIKUS HIBA: JWT_SECRET nincs beállítva!\n"
        "Állítsd be a backend/.env file-ban:\n"
        "JWT_SECRET=\"ide-irj-egy-minimum-32-karakteres-random-stringet\"\n"
        "Példa generálás: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
    )

if not validate_jwt_secret(JWT_SECRET):
    raise ValueError(
        "❌ KRITIKUS HIBA: A JWT_SECRET túl gyenge!\n"
        "Használj minimum 32 karakteres, véletlenszerű stringet.\n"
        "Példa generálás: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
    )

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Security
security = HTTPBearer()

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)

# Security utilities
login_tracker = LoginAttemptTracker(db, max_attempts=5, lockout_minutes=15)
audit_logger = AuditLogger(db)

app = FastAPI(title="Dolgozó CRM API - Biztonságos Verzió")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = ""
    role: str = "user"  # "admin" or "user" (toborzó)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: str

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class ProfileUpdate(BaseModel):
    name: str

class WorkerTypeCreate(BaseModel):
    name: str

class WorkerTypeResponse(BaseModel):
    id: str
    name: str

class CategoryCreate(BaseModel):
    name: str
    color: str = "#3b82f6"  # Default blue

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    order: Optional[int] = None

class CategoryResponse(BaseModel):
    id: str
    name: str
    color: str = "#3b82f6"
    order: int = 0
    worker_count: int = 0

class PositionCreate(BaseModel):
    name: str
    worker_type_id: str  # Melyik típushoz tartozik

class PositionResponse(BaseModel):
    id: str
    name: str
    worker_type_id: str
    worker_type_name: Optional[str] = ""

class StatusCreate(BaseModel):
    name: str
    status_type: str = "neutral"  # ÚJ: "positive", "negative", "neutral"
    color: str = "#6b7280"  # ÚJ: Szín

class StatusUpdate(BaseModel):
    name: Optional[str] = None
    status_type: Optional[str] = None  # ÚJ
    color: Optional[str] = None  # ÚJ

class StatusResponse(BaseModel):
    id: str
    name: str
    status_type: str = "neutral"  # ÚJ
    color: str = "#6b7280"  # ÚJ

class TagCreate(BaseModel):
    name: str
    color: str = "#6366f1"

class TagResponse(BaseModel):
    id: str
    name: str
    color: str

class WorkerCreate(BaseModel):
    name: str
    phone: str
    worker_type_id: str
    position: Optional[str] = ""  # Szabad szöveg pozíció
    position_experience: Optional[str] = ""  # Pozícióval kapcsolatos tapasztalat
    category: str = "Felvitt dolgozók"
    address: Optional[str] = ""
    email: Optional[str] = ""
    experience: Optional[str] = ""
    notes: Optional[str] = ""
    global_status: str = "Feldolgozatlan"  # Alap (globális) dolgozói státusz
    project_id: Optional[str] = None  # Opcionális projekt várólistához
    trial_date: Optional[str] = None  # Próba időpont (volt: start_date)
    latitude: Optional[float] = None  # Geocoding koordináta
    longitude: Optional[float] = None  # Geocoding koordináta
    county: Optional[str] = ""  # Megye

class WorkerUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    worker_type_id: Optional[str] = None
    position: Optional[str] = None
    position_experience: Optional[str] = None
    category: Optional[str] = None
    address: Optional[str] = None
    email: Optional[str] = None
    experience: Optional[str] = None
    notes: Optional[str] = None
    global_status: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    county: Optional[str] = None

class WorkerResponse(BaseModel):
    id: str
    name: str
    phone: str
    worker_type_id: str
    worker_type_name: Optional[str] = ""
    position: Optional[str] = ""
    position_experience: Optional[str] = ""
    category: str
    address: str
    email: str
    experience: str
    notes: str
    global_status: str = "Feldolgozatlan"
    tags: List[dict] = []
    project_statuses: List[dict] = []
    owner_id: str
    owner_name: str
    created_at: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    county: Optional[str] = ""

class ProjectCreate(BaseModel):
    name: str
    client_name: Optional[str] = ""  # Ügyfél / cégnév
    date: str
    location: Optional[str] = ""  # Helyszín
    training_location: Optional[str] = ""  # Betanítás / munkavégzés helye
    notes: Optional[str] = ""  # Megjegyzések, elvárások
    recruiter_ids: List[str] = []  # Hozzárendelt toborzók
    planned_headcount: Optional[int] = 0  # Tervezett létszám

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    client_name: Optional[str] = None
    date: Optional[str] = None
    location: Optional[str] = None
    training_location: Optional[str] = None
    notes: Optional[str] = None
    is_closed: Optional[bool] = None
    recruiter_ids: Optional[List[str]] = None
    planned_headcount: Optional[int] = None  # Tervezett létszám

class ProjectResponse(BaseModel):
    id: str
    name: str
    client_name: str = ""
    date: str
    location: str
    training_location: str = ""
    notes: str
    is_closed: bool
    worker_count: int
    position_count: int = 0
    total_headcount: int = 0  # Összesített létszámigény pozíciókból
    trial_count: int = 0
    recruiter_ids: List[str] = []
    recruiters: List[dict] = []
    owner_id: str = ""
    owner_name: str = ""
    created_at: str
    planned_headcount: int = 0  # Tervezett létszám
    active_worker_count: int = 0  # Aktív dolgozók (Dolgozik státusz)

# ==================== PROJECT POSITION MODELS ====================

class ProjectPositionCreate(BaseModel):
    name: str  # Pozíció neve (pl. Operátor, Raktáros)
    headcount: int = 1  # Létszámigény
    work_schedule: Optional[str] = ""  # Munkarend (volt: shift_schedule)
    experience_required: Optional[str] = ""  # Tapasztalat
    qualifications: Optional[str] = ""  # Végzettség / jogosítvány
    physical_requirements: Optional[str] = ""  # Fizikai elvárások
    position_details: Optional[str] = ""  # ÚJ: Pozíció részletei (fizetés, stb.)
    notes: Optional[str] = ""  # Egyéb megjegyzések

class ProjectPositionUpdate(BaseModel):
    name: Optional[str] = None
    headcount: Optional[int] = None
    work_schedule: Optional[str] = None  # Munkarend (volt: shift_schedule)
    experience_required: Optional[str] = None
    qualifications: Optional[str] = None
    physical_requirements: Optional[str] = None
    position_details: Optional[str] = None  # ÚJ: Pozíció részletei
    notes: Optional[str] = None

class ProjectPositionResponse(BaseModel):
    id: str
    project_id: str
    name: str
    headcount: int
    work_schedule: str = ""  # Munkarend (volt: shift_schedule)
    experience_required: str = ""
    qualifications: str = ""
    physical_requirements: str = ""
    position_details: str = ""  # ÚJ: Pozíció részletei
    notes: str = ""
    assigned_workers: int = 0
    created_at: str

# ==================== TRIAL MODELS ====================

class TrialCreate(BaseModel):
    date: str  # Próba dátuma
    time: Optional[str] = ""  # Próba időpontja (pl. "09:00")
    notes: Optional[str] = ""

class TrialUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    notes: Optional[str] = None

class TrialPositionCreate(BaseModel):
    position_id: Optional[str] = None  # Meglévő projekt pozíció ID
    position_name: str  # Pozíció neve (új vagy meglévő)
    headcount: int = 1  # Létszámigény
    hourly_rate: Optional[str] = ""  # Órabér
    accommodation: bool = False  # Van-e szállás
    requirements: str = ""  # Egyéb elvárások
    add_to_project: bool = False  # Új pozíció esetén hozzáadjuk a projekthez?

class TrialPositionResponse(BaseModel):
    id: str
    trial_id: str
    position_id: Optional[str] = None
    position_name: str
    headcount: int = 1
    hourly_rate: str = ""
    accommodation: bool = False
    requirements: str = ""
    assigned_count: int = 0  # Hány dolgozó van hozzárendelve

class TrialResponse(BaseModel):
    id: str
    project_id: str
    date: str
    time: str = ""
    notes: str = ""
    worker_count: int = 0
    workers: List[dict] = []
    positions: List[TrialPositionResponse] = []  # Próba pozíciók
    created_at: str

class TrialWorkerAdd(BaseModel):
    worker_id: str
    position_id: Optional[str] = None  # Melyik próba pozícióra (trial_position_id)

class ProjectWorkerAdd(BaseModel):
    worker_id: str
    status_id: Optional[str] = None

class ProjectRecruiterAdd(BaseModel):
    user_id: str

class ProjectWorkerStatusUpdate(BaseModel):
    status_id: str
    notes: Optional[str] = None

class WorkerHistoryEntry(BaseModel):
    project_id: str
    project_name: str
    project_date: str
    status_id: str
    status_name: str
    notes: str
    updated_at: str

# ==================== WAITLIST MODELS ====================

class WaitlistWorkerAdd(BaseModel):
    worker_id: str
    trial_date: Optional[str] = None  # Próba időpont (volt: start_date)
    notes: Optional[str] = ""

class WaitlistWorkerUpdate(BaseModel):
    trial_date: Optional[str] = None  # Próba időpont (volt: start_date)
    notes: Optional[str] = None

class WaitlistWorkerResponse(BaseModel):
    id: str
    project_id: str
    worker_id: str
    worker_name: str
    worker_phone: str
    worker_email: str = ""
    trial_date: str = ""  # Próba időpont (volt: start_date)
    notes: str = ""
    added_at: str
    added_by: str
    added_by_name: str = ""

# ==================== FORM MODELS ====================

class FormCreate(BaseModel):
    sheet_url: str
    name: Optional[str] = ""
    column_mapping: Dict[str, str]  # {"name": "B", "phone": "C", ...}
    default_category: str = "Felvitt dolgozók"
    sync_frequency: str = "hourly"  # hourly, manual

class FormUpdate(BaseModel):
    name: Optional[str] = None
    column_mapping: Optional[Dict[str, str]] = None
    default_category: Optional[str] = None
    sync_frequency: Optional[str] = None

class FormResponse(BaseModel):
    id: str
    project_id: str
    sheet_url: str
    name: str
    column_mapping: Dict[str, str]
    owner_id: str
    owner_name: str = ""
    shared_with: List[str] = []
    shared_with_names: List[str] = []
    default_category: str
    sync_frequency: str
    last_synced_at: Optional[str] = None
    last_row_processed: int = 0
    lead_count: int = 0
    created_at: str

class FormShareRequest(BaseModel):
    shared_with: List[str]  # User IDs

class FormLeadResponse(BaseModel):
    id: str
    form_id: str
    project_id: str
    name: str
    phone: str
    address: Optional[str] = ""
    email: Optional[str] = ""
    notes: Optional[str] = ""
    submitted_at: Optional[str] = ""
    status: str  # unprocessed, duplicate, processed, ignored
    is_duplicate: bool = False
    duplicate_worker_id: Optional[str] = None
    duplicate_worker: Optional[Dict] = None
    created_at: str

class FormLeadResolve(BaseModel):
    action: str  # keep_both, keep_existing, keep_new, merge
    merge_fields: Optional[List[str]] = None

# ==================== NOTIFICATION MODELS ====================

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    type: str  # "project_assigned", "trial_assigned"
    title: str
    message: str
    link: str = ""
    is_read: bool = False
    created_at: str

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def create_notification(user_id: str, notification_type: str, title: str, message: str, link: str = ""):
    """Helper function to create a notification"""
    notif_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "type": notification_type,
        "title": title,
        "message": message,
        "link": link,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notif_doc)
    return notif_doc

# ==================== GEOCODING HELPER ====================

HUNGARIAN_COUNTIES = [
    "Bács-Kiskun", "Baranya", "Békés", "Borsod-Abaúj-Zemplén", "Budapest",
    "Csongrád-Csanád", "Fejér", "Győr-Moson-Sopron", "Hajdú-Bihar", "Heves",
    "Jász-Nagykun-Szolnok", "Komárom-Esztergom", "Nógrád", "Pest", "Somogy",
    "Szabolcs-Szatmár-Bereg", "Tolna", "Vas", "Veszprém", "Zala"
]

async def geocode_address(address: str) -> dict:
    """Geocode an address using OpenStreetMap Nominatim"""
    if not address or len(address.strip()) < 3:
        return {"latitude": None, "longitude": None, "county": None}
    
    try:
        async with httpx.AsyncClient() as client:
            # Add Hungary to improve results
            search_query = f"{address}, Magyarország"
            response = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={
                    "q": search_query,
                    "format": "json",
                    "limit": 1,
                    "addressdetails": 1,
                    "countrycodes": "hu"
                },
                headers={"User-Agent": "DolgozoCRM/1.0"},
                timeout=10.0
            )
            
            if response.status_code == 200:
                data = response.json()
                if data and len(data) > 0:
                    result = data[0]
                    lat = float(result.get("lat", 0))
                    lon = float(result.get("lon", 0))
                    
                    # Extract county from address details
                    address_details = result.get("address", {})
                    county = address_details.get("county", "") or address_details.get("state", "")
                    
                    # Clean up county name
                    if county:
                        county = county.replace(" megye", "").replace(" vármegye", "")
                    
                    return {
                        "latitude": lat,
                        "longitude": lon,
                        "county": county,
                        "display_name": result.get("display_name", "")
                    }
    except Exception as e:
        logging.error(f"Geocoding error for '{address}': {e}")
    
    return {"latitude": None, "longitude": None, "county": None}

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great circle distance between two points in kilometers"""
    if not all([lat1, lon1, lat2, lon2]):
        return float('inf')
    
    R = 6371  # Earth's radius in kilometers
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Felhasználó nem található")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token lejárt")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Érvénytelen token")

async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Csak admin jogosultsággal")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=dict)
async def register(data: UserCreate, current_user: dict = Depends(require_admin), request: Request = None):
    """Admin csak hozhat létre új felhasználót - BIZTONSÁGOS"""
    # Sanitize inputs
    email = sanitize_email(data.email)
    name = sanitize_string(data.name, max_length=100)
    
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Ez az email már regisztrálva van")
    
    # Strong password validation
    is_valid, error_msg = validate_password_strength(data.password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password": hash_password(data.password),
        "name": name or email.split("@")[0],
        "role": data.role,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Audit log
    ip_addr = request.client.host if request else "unknown"
    await audit_logger.log(
        user_id=current_user["id"],
        user_email=current_user["email"],
        action="created",
        resource_type="user",
        resource_id=user_doc["id"],
        details={"new_user_email": email, "new_user_role": data.role},
        ip_address=ip_addr
    )
    
    return {"message": "Felhasználó létrehozva", "email": email}

@api_router.post("/auth/login", response_model=dict)
@limiter.limit("5/minute")  # Max 5 login attempts per minute per IP
async def login(data: UserLogin, request: Request):
    """Login with rate limiting and account lockout - BIZTONSÁGOS"""
    email = sanitize_email(data.email)
    ip_addr = request.client.host if request else "unknown"
    
    # Check if account is locked out
    is_locked, unlock_time = await login_tracker.is_locked_out(email)
    if is_locked:
        remaining_minutes = int((unlock_time - datetime.now(timezone.utc)).total_seconds() / 60)
        raise HTTPException(
            status_code=429,
            detail=f"Túl sok sikertelen bejelentkezési kísérlet. Próbáld újra {remaining_minutes} perc múlva."
        )
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password"]):
        # Record failed attempt
        await login_tracker.record_failed_attempt(email, ip_addr)
        remaining = await login_tracker.get_remaining_attempts(email)
        
        if remaining > 0:
            raise HTTPException(
                status_code=401,
                detail=f"Hibás email vagy jelszó. Még {remaining} próbálkozásod van."
            )
        else:
            raise HTTPException(
                status_code=429,
                detail="Túl sok sikertelen kísérlet. A fiók 15 percre zárolva."
            )
    
    # Successful login
    await login_tracker.record_successful_attempt(email, ip_addr)
    
    # Audit log
    await audit_logger.log(
        user_id=user["id"],
        user_email=user["email"],
        action="login",
        resource_type="auth",
        details={"success": True},
        ip_address=ip_addr
    )
    
    token = create_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "role": user["role"]
        }
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user.get("name", ""),
        role=user["role"],
        created_at=user.get("created_at", "")
    )

@api_router.get("/auth/audit-logs")
async def get_audit_logs(
    user: dict = Depends(require_admin),
    resource_type: Optional[str] = None,
    limit: int = 100
):
    """Admin audit log lekérése - CSAK ADMIN"""
    logs = await audit_logger.get_logs(resource_type=resource_type, limit=limit)
    return {"logs": logs, "count": len(logs)}

@api_router.get("/auth/my-activity")
async def get_my_activity(user: dict = Depends(get_current_user)):
    """Saját aktivitás lekérése"""
    logs = await audit_logger.get_recent_activity(user["id"], days=30)
    return {"logs": logs, "count": len(logs)}

@api_router.put("/auth/profile")
async def update_profile(data: ProfileUpdate, user: dict = Depends(get_current_user)):
    """Csak admin tudja módosítani a profilt"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Csak admin módosíthatja a profilt")
    await db.users.update_one({"id": user["id"]}, {"$set": {"name": data.name}})
    return {"message": "Profil frissítve"}

@api_router.put("/auth/password")
async def change_password(data: PasswordChange, user: dict = Depends(get_current_user), request: Request = None):
    """Change password with strong validation - BIZTONSÁGOS"""
    db_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    if not verify_password(data.current_password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Hibás jelenlegi jelszó")
    
    # Strong password validation
    is_valid, error_msg = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    await db.users.update_one(
        {"id": user["id"]}, 
        {"$set": {"password": hash_password(data.new_password)}}
    )
    
    # Audit log
    ip_addr = request.client.host if request else "unknown"
    await audit_logger.log(
        user_id=user["id"],
        user_email=user["email"],
        action="password_changed",
        resource_type="auth",
        ip_address=ip_addr
    )
    
    return {"message": "Jelszó megváltoztatva"}

# ==================== WORKER TYPES ====================

@api_router.get("/worker-types", response_model=List[WorkerTypeResponse])
async def get_worker_types(user: dict = Depends(get_current_user)):
    types = await db.worker_types.find({}, {"_id": 0}).to_list(100)
    return [WorkerTypeResponse(**t) for t in types]

@api_router.post("/worker-types", response_model=WorkerTypeResponse)
async def create_worker_type(data: WorkerTypeCreate, user: dict = Depends(require_admin)):
    type_doc = {"id": str(uuid.uuid4()), "name": data.name}
    await db.worker_types.insert_one(type_doc)
    return WorkerTypeResponse(**type_doc)

@api_router.delete("/worker-types/{type_id}")
async def delete_worker_type(type_id: str, user: dict = Depends(require_admin)):
    result = await db.worker_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Típus nem található")
    # Töröljük a típushoz tartozó pozíciókat is
    await db.positions.delete_many({"worker_type_id": type_id})
    return {"message": "Típus törölve"}

# ==================== POSITIONS ====================

@api_router.get("/positions", response_model=List[PositionResponse])
async def get_positions(worker_type_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    """Pozíciók lekérése, opcionálisan típus szerint szűrve"""
    query = {}
    if worker_type_id:
        query["worker_type_id"] = worker_type_id
    
    positions = await db.positions.find(query, {"_id": 0}).to_list(100)
    
    result = []
    for p in positions:
        type_doc = await db.worker_types.find_one({"id": p.get("worker_type_id")}, {"_id": 0})
        result.append(PositionResponse(
            id=p["id"],
            name=p["name"],
            worker_type_id=p["worker_type_id"],
            worker_type_name=type_doc["name"] if type_doc else ""
        ))
    return result

@api_router.post("/positions", response_model=PositionResponse)
async def create_position(data: PositionCreate, user: dict = Depends(require_admin)):
    # Ellenőrizzük, hogy létezik-e a típus
    type_doc = await db.worker_types.find_one({"id": data.worker_type_id}, {"_id": 0})
    if not type_doc:
        raise HTTPException(status_code=404, detail="Típus nem található")
    
    position_doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "worker_type_id": data.worker_type_id
    }
    await db.positions.insert_one(position_doc)
    return PositionResponse(**position_doc, worker_type_name=type_doc["name"])

@api_router.delete("/positions/{position_id}")
async def delete_position(position_id: str, user: dict = Depends(require_admin)):
    result = await db.positions.delete_one({"id": position_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pozíció nem található")
    return {"message": "Pozíció törölve"}

# ==================== STATUSES ====================

@api_router.get("/statuses", response_model=List[StatusResponse])
async def get_statuses(user: dict = Depends(get_current_user)):
    statuses = await db.statuses.find({}, {"_id": 0}).to_list(100)
    return [StatusResponse(
        id=s["id"],
        name=s["name"],
        status_type=s.get("status_type", "neutral"),
        color=s.get("color", "#6b7280")
    ) for s in statuses]

@api_router.post("/statuses", response_model=StatusResponse)
async def create_status(data: StatusCreate, user: dict = Depends(require_admin)):
    """Státusz létrehozása - CSAK ADMIN"""
    status_doc = {
        "id": str(uuid.uuid4()),
        "name": sanitize_string(data.name, max_length=100),
        "status_type": data.status_type,
        "color": data.color
    }
    await db.statuses.insert_one(status_doc)
    return StatusResponse(**status_doc)

@api_router.put("/statuses/{status_id}", response_model=StatusResponse)
async def update_status(status_id: str, data: StatusUpdate, user: dict = Depends(require_admin)):
    """Státusz szerkesztése - CSAK ADMIN"""
    status = await db.statuses.find_one({"id": status_id}, {"_id": 0})
    if not status:
        raise HTTPException(status_code=404, detail="Státusz nem található")
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = sanitize_string(data.name, max_length=100)
    if data.status_type is not None:
        update_data["status_type"] = data.status_type
    if data.color is not None:
        update_data["color"] = data.color
    
    if update_data:
        await db.statuses.update_one({"id": status_id}, {"$set": update_data})
    
    updated = await db.statuses.find_one({"id": status_id}, {"_id": 0})
    return StatusResponse(
        id=updated["id"],
        name=updated["name"],
        status_type=updated.get("status_type", "neutral"),
        color=updated.get("color", "#6b7280")
    )

@api_router.delete("/statuses/{status_id}")
async def delete_status(status_id: str, user: dict = Depends(require_admin)):
    """Státusz törlése - CSAK ADMIN"""
    result = await db.statuses.delete_one({"id": status_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Státusz nem található")
    return {"message": "Státusz törölve"}

# ==================== TAGS ====================

@api_router.get("/tags", response_model=List[TagResponse])
async def get_tags(user: dict = Depends(get_current_user)):
    tags = await db.tags.find({}, {"_id": 0}).to_list(100)
    return [TagResponse(**t) for t in tags]

@api_router.post("/tags", response_model=TagResponse)
async def create_tag(data: TagCreate, user: dict = Depends(require_admin)):
    tag_doc = {"id": str(uuid.uuid4()), "name": data.name, "color": data.color}
    await db.tags.insert_one(tag_doc)
    return TagResponse(**tag_doc)

@api_router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: str, user: dict = Depends(require_admin)):
    result = await db.tags.delete_one({"id": tag_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Jellemző nem található")
    return {"message": "Jellemző törölve"}

# ==================== CATEGORIES ====================

@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(user: dict = Depends(get_current_user)):
    """Kategóriák lekérése worker count-tal és rendezve"""
    categories = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    # Ha nincs még kategória, visszaadjuk az alapértelmezetteket
    if not categories:
        default_categories = [
            {"id": str(uuid.uuid4()), "name": "Felvitt dolgozók", "color": "#3b82f6", "order": 0},
            {"id": str(uuid.uuid4()), "name": "Hideg jelentkező", "color": "#22c55e", "order": 1},
            {"id": str(uuid.uuid4()), "name": "Űrlapon jelentkezett", "color": "#f97316", "order": 2},
            {"id": str(uuid.uuid4()), "name": "Állásra jelentkezett", "color": "#a855f7", "order": 3},
            {"id": str(uuid.uuid4()), "name": "Ingázó", "color": "#64748b", "order": 4},
            {"id": str(uuid.uuid4()), "name": "Szállásos", "color": "#f59e0b", "order": 5},
        ]
        await db.categories.insert_many(default_categories)
        categories = default_categories
    
    # Add worker count to each category
    result = []
    for c in categories:
        worker_count = await db.workers.count_documents({"category": c["name"]})
        result.append(CategoryResponse(
            id=c["id"],
            name=c["name"],
            color=c.get("color", "#3b82f6"),
            order=c.get("order", 0),
            worker_count=worker_count
        ))
    return result

@api_router.get("/categories/stats")
async def get_category_stats(user: dict = Depends(get_current_user)):
    """Kategória statisztikák dashboard-hoz"""
    categories = await db.categories.find({}, {"_id": 0}).sort("order", 1).to_list(100)
    
    stats = []
    total_workers = 0
    for cat in categories:
        count = await db.workers.count_documents({"category": cat["name"]})
        total_workers += count
        stats.append({
            "id": cat["id"],
            "name": cat["name"],
            "color": cat.get("color", "#3b82f6"),
            "count": count
        })
    
    # Recent activity - workers added in last 7 days per category
    from datetime import timedelta
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    recent_stats = []
    for cat in categories:
        recent_count = await db.workers.count_documents({
            "category": cat["name"],
            "created_at": {"$gte": week_ago}
        })
        recent_stats.append({
            "name": cat["name"],
            "color": cat.get("color", "#3b82f6"),
            "count": recent_count
        })
    
    return {
        "total_workers": total_workers,
        "category_stats": stats,
        "recent_activity": recent_stats,
        "categories_count": len(categories)
    }

@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, user: dict = Depends(require_admin)):
    """Új kategória létrehozása - csak admin"""
    # Ellenőrizzük, hogy ne legyen duplikált név
    existing = await db.categories.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Ilyen nevű kategória már létezik")
    
    # Get max order
    max_order_cat = await db.categories.find_one({}, {"_id": 0}, sort=[("order", -1)])
    next_order = (max_order_cat.get("order", 0) + 1) if max_order_cat else 0
    
    category_doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "color": data.color,
        "order": next_order
    }
    await db.categories.insert_one(category_doc)
    return CategoryResponse(**category_doc, worker_count=0)

class CategoryOrderItem(BaseModel):
    id: str
    order: int

class CategoryReorderRequest(BaseModel):
    orders: List[CategoryOrderItem]

@api_router.put("/categories/reorder")
async def reorder_categories(data: CategoryReorderRequest, user: dict = Depends(require_admin)):
    """Kategóriák átrendezése - csak admin"""
    for item in data.orders:
        await db.categories.update_one(
            {"id": item.id},
            {"$set": {"order": item.order}}
        )
    return {"message": "Sorrend frissítve"}

@api_router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, data: CategoryUpdate, user: dict = Depends(require_admin)):
    """Kategória szerkesztése - csak admin"""
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if not category:
        raise HTTPException(status_code=404, detail="Kategória nem található")
    
    update_data = {}
    old_name = category["name"]
    
    if data.name is not None and data.name != old_name:
        # Check for duplicate name
        existing = await db.categories.find_one({"name": data.name, "id": {"$ne": category_id}})
        if existing:
            raise HTTPException(status_code=400, detail="Ilyen nevű kategória már létezik")
        update_data["name"] = data.name
        # Update all workers with old category name
        await db.workers.update_many(
            {"category": old_name},
            {"$set": {"category": data.name}}
        )
    
    if data.color is not None:
        update_data["color"] = data.color
    
    if data.order is not None:
        update_data["order"] = data.order
    
    if update_data:
        await db.categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.categories.find_one({"id": category_id}, {"_id": 0})
    worker_count = await db.workers.count_documents({"category": updated["name"]})
    return CategoryResponse(**updated, worker_count=worker_count)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(require_admin)):
    """Kategória törlése - csak admin"""
    # Ellenőrizzük, hogy nem használja-e dolgozó
    workers_using = await db.workers.count_documents({"category": {"$exists": True}})
    category = await db.categories.find_one({"id": category_id}, {"_id": 0})
    if category:
        workers_with_cat = await db.workers.count_documents({"category": category["name"]})
        if workers_with_cat > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Nem törölhető: {workers_with_cat} dolgozó használja ezt a kategóriát"
            )
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kategória nem található")
    return {"message": "Kategória törölve"}

# ==================== USERS (Admin) ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    return [UserResponse(
        id=u["id"],
        email=u["email"],
        name=u.get("name", ""),
        role=u["role"],
        created_at=u.get("created_at", "")
    ) for u in users]

@api_router.get("/users/stats")
async def get_user_stats(user: dict = Depends(require_admin)):
    """Toborzónként hány dolgozót vitt fel"""
    pipeline = [
        {"$group": {"_id": "$owner_id", "count": {"$sum": 1}}},
    ]
    stats = await db.workers.aggregate(pipeline).to_list(100)
    
    result = []
    for s in stats:
        owner = await db.users.find_one({"id": s["_id"]}, {"_id": 0, "password": 0})
        if owner:
            result.append({
                "user_id": s["_id"],
                "user_name": owner.get("name", owner["email"]),
                "user_email": owner["email"],
                "worker_count": s["count"]
            })
    return result

# ==================== WORKERS ====================

@api_router.get("/workers", response_model=List[WorkerResponse])
async def get_workers(
    search: Optional[str] = None,
    category: Optional[str] = None,
    worker_type_id: Optional[str] = None,
    tag_id: Optional[str] = None,
    owner_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    
    # Toborzó csak saját dolgozóit látja
    if user["role"] != "admin":
        query["owner_id"] = user["id"]
    elif owner_id:
        query["owner_id"] = owner_id
    
    if category:
        query["category"] = category
    if worker_type_id:
        query["worker_type_id"] = worker_type_id
    if tag_id:
        query["tag_ids"] = tag_id
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"address": {"$regex": search, "$options": "i"}},
            {"experience": {"$regex": search, "$options": "i"}},
            {"position": {"$regex": search, "$options": "i"}}
        ]
    
    workers = await db.workers.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Enrich with type names, tags, project statuses
    result = []
    for w in workers:
        # Get type name
        type_doc = await db.worker_types.find_one({"id": w.get("worker_type_id")}, {"_id": 0})
        w["worker_type_name"] = type_doc["name"] if type_doc else ""
        
        # Position is now free text
        w["position"] = w.get("position", "")
        w["position_experience"] = w.get("position_experience", "")
        
        # Global status
        w["global_status"] = w.get("global_status", "Feldolgozatlan")
        
        # Get tags
        tag_ids = w.get("tag_ids", [])
        tags = []
        for tid in tag_ids:
            tag = await db.tags.find_one({"id": tid}, {"_id": 0})
            if tag:
                tags.append(tag)
        w["tags"] = tags
        
        # Get project statuses
        project_workers = await db.project_workers.find(
            {"worker_id": w["id"]}, {"_id": 0}
        ).sort("updated_at", -1).to_list(100)
        
        project_statuses = []
        for pw in project_workers:
            project = await db.projects.find_one({"id": pw["project_id"]}, {"_id": 0})
            status = await db.statuses.find_one({"id": pw.get("status_id")}, {"_id": 0})
            if project:
                project_statuses.append({
                    "project_id": project["id"],
                    "project_name": project["name"],
                    "project_date": project.get("date", ""),
                    "status_id": pw.get("status_id", ""),
                    "status_name": status["name"] if status else "Hozzárendelve",
                    "notes": pw.get("notes", ""),
                    "updated_at": pw.get("updated_at", "")
                })
        w["project_statuses"] = project_statuses
        
        # Get owner name
        owner = await db.users.find_one({"id": w.get("owner_id")}, {"_id": 0, "password": 0})
        w["owner_name"] = owner.get("name", owner["email"]) if owner else ""
        
        result.append(WorkerResponse(**w))
    
    return result

@api_router.get("/workers/{worker_id}", response_model=WorkerResponse)
async def get_worker(worker_id: str, user: dict = Depends(get_current_user)):
    query = {"id": worker_id}
    if user["role"] != "admin":
        query["owner_id"] = user["id"]
    
    w = await db.workers.find_one(query, {"_id": 0})
    if not w:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    # Enrich
    type_doc = await db.worker_types.find_one({"id": w.get("worker_type_id")}, {"_id": 0})
    w["worker_type_name"] = type_doc["name"] if type_doc else ""
    
    # Position is now free text
    w["position"] = w.get("position", "")
    w["position_experience"] = w.get("position_experience", "")
    
    # Global status
    w["global_status"] = w.get("global_status", "Feldolgozatlan")
    
    tag_ids = w.get("tag_ids", [])
    tags = []
    for tid in tag_ids:
        tag = await db.tags.find_one({"id": tid}, {"_id": 0})
        if tag:
            tags.append(tag)
    w["tags"] = tags
    
    project_workers = await db.project_workers.find(
        {"worker_id": w["id"]}, {"_id": 0}
    ).sort("updated_at", -1).to_list(100)
    
    project_statuses = []
    for pw in project_workers:
        project = await db.projects.find_one({"id": pw["project_id"]}, {"_id": 0})
        status = await db.statuses.find_one({"id": pw.get("status_id")}, {"_id": 0})
        if project:
            project_statuses.append({
                "project_id": project["id"],
                "project_name": project["name"],
                "project_date": project.get("date", ""),
                "status_id": pw.get("status_id", ""),
                "status_name": status["name"] if status else "Hozzárendelve",
                "notes": pw.get("notes", ""),
                "updated_at": pw.get("updated_at", "")
            })
    w["project_statuses"] = project_statuses
    
    owner = await db.users.find_one({"id": w.get("owner_id")}, {"_id": 0, "password": 0})
    w["owner_name"] = owner.get("name", owner["email"]) if owner else ""
    
    return WorkerResponse(**w)

@api_router.post("/workers", response_model=WorkerResponse)
async def create_worker(data: WorkerCreate, user: dict = Depends(get_current_user)):
    if len(data.name) < 2:
        raise HTTPException(status_code=400, detail="A név minimum 2 karakter legyen")
    
    worker_doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "phone": data.phone,
        "worker_type_id": data.worker_type_id,
        "position": data.position or "",
        "position_experience": data.position_experience or "",
        "category": data.category,
        "address": data.address or "",
        "email": data.email or "",
        "experience": data.experience or "",
        "notes": data.notes or "",
        "global_status": data.global_status or "Feldolgozatlan",
        "tag_ids": [],
        "owner_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.workers.insert_one(worker_doc)
    
    # Ha project_id meg van adva, hozzáadjuk a várólistához
    if data.project_id:
        project = await db.projects.find_one({"id": data.project_id}, {"_id": 0})
        if project:
            # Ellenőrizzük, hogy a user hozzáfér-e a projekthez
            if user["role"] != "admin" and user["id"] not in project.get("recruiter_ids", []):
                raise HTTPException(status_code=403, detail="Nincs jogosultságod ehhez a projekthez")
            
            waitlist_doc = {
                "id": str(uuid.uuid4()),
                "project_id": data.project_id,
                "worker_id": worker_doc["id"],
                "trial_date": data.trial_date or "",  # ÚJ: trial_date
                "notes": "",
                "added_at": datetime.now(timezone.utc).isoformat(),
                "added_by": user["id"]
            }
            await db.project_waitlist.insert_one(waitlist_doc)
    
    worker_doc["worker_type_name"] = ""
    worker_doc["tags"] = []
    worker_doc["project_statuses"] = []
    worker_doc["owner_name"] = user.get("name", user["email"])
    
    return WorkerResponse(**worker_doc)

@api_router.put("/workers/{worker_id}", response_model=WorkerResponse)
async def update_worker(worker_id: str, data: WorkerUpdate, user: dict = Depends(get_current_user)):
    query = {"id": worker_id}
    if user["role"] != "admin":
        query["owner_id"] = user["id"]
    
    worker = await db.workers.find_one(query, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.workers.update_one({"id": worker_id}, {"$set": update_data})
    
    return await get_worker(worker_id, user)

@api_router.delete("/workers/{worker_id}")
async def delete_worker(worker_id: str, user: dict = Depends(require_admin)):
    """Csak admin törölhet"""
    result = await db.workers.delete_one({"id": worker_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    # Töröljük a projekt kapcsolatokat is
    await db.project_workers.delete_many({"worker_id": worker_id})
    
    return {"message": "Dolgozó törölve"}

@api_router.post("/workers/{worker_id}/tags/{tag_id}")
async def add_tag_to_worker(worker_id: str, tag_id: str, user: dict = Depends(get_current_user)):
    query = {"id": worker_id}
    if user["role"] != "admin":
        query["owner_id"] = user["id"]
    
    worker = await db.workers.find_one(query)
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    await db.workers.update_one(
        {"id": worker_id},
        {"$addToSet": {"tag_ids": tag_id}}
    )
    return {"message": "Jellemző hozzáadva"}

@api_router.delete("/workers/{worker_id}/tags/{tag_id}")
async def remove_tag_from_worker(worker_id: str, tag_id: str, user: dict = Depends(get_current_user)):
    query = {"id": worker_id}
    if user["role"] != "admin":
        query["owner_id"] = user["id"]
    
    worker = await db.workers.find_one(query)
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    await db.workers.update_one(
        {"id": worker_id},
        {"$pull": {"tag_ids": tag_id}}
    )
    return {"message": "Jellemző eltávolítva"}

# ==================== PROJECTS ====================

@api_router.get("/projects", response_model=List[ProjectResponse])
async def get_projects(user: dict = Depends(get_current_user)):
    """Toborzó csak azokat a projekteket látja, ahol ő hozta létre VAGY hozzá van rendelve"""
    projects = await db.projects.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Lekérjük a "Dolgozik" státuszt az aktív dolgozók számlálásához
    dolgozik_status = await db.statuses.find_one({"name": "Dolgozik"}, {"_id": 0})
    
    result = []
    for p in projects:
        count = await db.project_workers.count_documents({"project_id": p["id"]})
        position_count = await db.project_positions.count_documents({"project_id": p["id"]})
        trial_count = await db.trials.count_documents({"project_id": p["id"]})
        
        # Calculate total headcount from positions
        positions = await db.project_positions.find({"project_id": p["id"]}, {"_id": 0}).to_list(100)
        total_headcount = sum(pos.get("headcount", 0) for pos in positions)
        
        # Aktív dolgozók számlálása (Dolgozik státusz)
        active_worker_count = 0
        if dolgozik_status:
            active_worker_count = await db.project_workers.count_documents({
                "project_id": p["id"],
                "status_id": dolgozik_status["id"]
            })
        
        recruiter_ids = p.get("recruiter_ids", [])
        owner_id = p.get("owner_id", "")
        
        # Ha toborzó, csak azokat mutassa ahol ő hozta létre VAGY hozzá van rendelve
        if user["role"] != "admin":
            if owner_id != user["id"] and user["id"] not in recruiter_ids:
                continue
        
        # Get recruiter names
        recruiters = []
        for rid in recruiter_ids:
            r = await db.users.find_one({"id": rid}, {"_id": 0, "password": 0})
            if r:
                recruiters.append({"id": r["id"], "name": r.get("name", r["email"]), "email": r["email"]})
        
        # Get owner name
        owner_name = ""
        if owner_id:
            owner = await db.users.find_one({"id": owner_id}, {"_id": 0, "password": 0})
            if owner:
                owner_name = owner.get("name", owner["email"])
        
        result.append(ProjectResponse(
            id=p["id"],
            name=p["name"],
            client_name=p.get("client_name", ""),
            date=p["date"],
            location=p.get("location", ""),
            training_location=p.get("training_location", ""),
            notes=p.get("notes", ""),
            is_closed=p.get("is_closed", False),
            worker_count=count,
            position_count=position_count,
            total_headcount=total_headcount,
            trial_count=trial_count,
            recruiter_ids=recruiter_ids,
            recruiters=recruiters,
            owner_id=owner_id,
            owner_name=owner_name,
            created_at=p.get("created_at", ""),
            planned_headcount=p.get("planned_headcount", 0),
            active_worker_count=active_worker_count
        ))
    
    return result

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, user: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    # Ellenőrizzük jogosultságot
    recruiter_ids = p.get("recruiter_ids", [])
    owner_id = p.get("owner_id", "")
    if user["role"] != "admin" and owner_id != user["id"] and user["id"] not in recruiter_ids:
        raise HTTPException(status_code=403, detail="Nincs hozzáférésed ehhez a projekthez")
    
    # Lekérjük a "Dolgozik" státuszt az aktív dolgozók számlálásához
    dolgozik_status = await db.statuses.find_one({"name": "Dolgozik"}, {"_id": 0})
    
    # Get workers
    pw_list = await db.project_workers.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    workers = []
    active_worker_count = 0
    for pw in pw_list:
        w = await db.workers.find_one({"id": pw["worker_id"]}, {"_id": 0})
        if w:
            # Toborzó csak saját dolgozóit látja a projektben
            if user["role"] != "admin" and w.get("owner_id") != user["id"]:
                continue
            status = await db.statuses.find_one({"id": pw.get("status_id")}, {"_id": 0})
            type_doc = await db.worker_types.find_one({"id": w.get("worker_type_id")}, {"_id": 0})
            owner = await db.users.find_one({"id": w.get("owner_id")}, {"_id": 0, "password": 0})
            
            status_name = status["name"] if status else "Hozzárendelve"
            
            # Számoljuk az aktív dolgozókat
            if dolgozik_status and pw.get("status_id") == dolgozik_status["id"]:
                active_worker_count += 1
            
            workers.append({
                "id": w["id"],
                "name": w["name"],
                "phone": w["phone"],
                "category": w["category"],
                "global_status": w.get("global_status", "Feldolgozatlan"),
                "worker_type_name": type_doc["name"] if type_doc else "",
                "status_id": pw.get("status_id", ""),
                "status_name": status_name,
                "notes": pw.get("notes", ""),
                "added_by": owner.get("name", owner["email"]) if owner else "",
                "added_at": pw.get("created_at", ""),
                "created_at": pw.get("created_at", "")
            })
    
    total_count = await db.project_workers.count_documents({"project_id": project_id})
    
    # Get positions
    positions = await db.project_positions.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    total_headcount = sum(pos.get("headcount", 0) for pos in positions)
    
    # Get trials with positions
    trials = await db.trials.find({"project_id": project_id}, {"_id": 0}).sort("date", 1).to_list(100)
    for trial in trials:
        trial_workers = await db.trial_workers.find({"trial_id": trial["id"]}, {"_id": 0}).to_list(100)
        trial["worker_count"] = len(trial_workers)
        
        # Get trial positions
        trial_positions = await db.trial_positions.find({"trial_id": trial["id"]}, {"_id": 0}).to_list(50)
        trial_pos_response = []
        for tp in trial_positions:
            assigned = await db.trial_workers.count_documents({
                "trial_id": trial["id"],
                "trial_position_id": tp["id"]
            })
            trial_pos_response.append({
                **tp,
                "assigned_count": assigned
            })
        trial["positions"] = trial_pos_response
        
        # Get worker details
        workers_list = []
        for tw in trial_workers:
            w = await db.workers.find_one({"id": tw["worker_id"]}, {"_id": 0})
            if w:
                trial_pos = await db.trial_positions.find_one({"id": tw.get("trial_position_id")}, {"_id": 0}) if tw.get("trial_position_id") else None
                workers_list.append({
                    "id": w["id"],
                    "name": w["name"],
                    "phone": w.get("phone", ""),
                    "trial_position_id": tw.get("trial_position_id", ""),
                    "position_name": trial_pos["position_name"] if trial_pos else ""
                })
        trial["workers"] = workers_list
    
    # Get recruiter names
    recruiters = []
    for rid in recruiter_ids:
        r = await db.users.find_one({"id": rid}, {"_id": 0, "password": 0})
        if r:
            recruiters.append({"id": r["id"], "name": r.get("name", r["email"]), "email": r["email"]})
    
    # Get owner name
    owner_name = ""
    if owner_id:
        owner = await db.users.find_one({"id": owner_id}, {"_id": 0, "password": 0})
        if owner:
            owner_name = owner.get("name", owner["email"])
    
    return {
        "id": p["id"],
        "name": p["name"],
        "client_name": p.get("client_name", ""),
        "date": p["date"],
        "location": p.get("location", ""),
        "training_location": p.get("training_location", ""),
        "notes": p.get("notes", ""),
        "is_closed": p.get("is_closed", False),
        "worker_count": total_count,
        "total_headcount": total_headcount,
        "recruiter_ids": recruiter_ids,
        "recruiters": recruiters,
        "owner_id": owner_id,
        "owner_name": owner_name,
        "workers": workers,
        "positions": positions,
        "trials": trials,
        "created_at": p.get("created_at", ""),
        "planned_headcount": p.get("planned_headcount", 0),
        "active_worker_count": active_worker_count
    }

@api_router.post("/projects", response_model=ProjectResponse)
async def create_project(data: ProjectCreate, user: dict = Depends(require_admin)):
    """Csak admin hozhat létre projektet"""
    project_doc = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "client_name": data.client_name or "",
        "date": data.date,
        "location": data.location or "",
        "training_location": data.training_location or "",
        "notes": data.notes or "",
        "recruiter_ids": data.recruiter_ids,
        "is_closed": False,
        "owner_id": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "planned_headcount": data.planned_headcount or 0
    }
    await db.projects.insert_one(project_doc)
    
    owner_name = user.get("name", user["email"])
    return ProjectResponse(**project_doc, worker_count=0, position_count=0, total_headcount=0, trial_count=0, recruiters=[], owner_name=owner_name, active_worker_count=0)

@api_router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(project_id: str, data: ProjectUpdate, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated = await db.projects.find_one({"id": project_id}, {"_id": 0})
    count = await db.project_workers.count_documents({"project_id": project_id})
    position_count = await db.project_positions.count_documents({"project_id": project_id})
    trial_count = await db.trials.count_documents({"project_id": project_id})
    
    # Calculate total headcount
    positions = await db.project_positions.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    total_headcount = sum(pos.get("headcount", 0) for pos in positions)
    
    # Aktív dolgozók számlálása
    dolgozik_status = await db.statuses.find_one({"name": "Dolgozik"}, {"_id": 0})
    active_worker_count = 0
    if dolgozik_status:
        active_worker_count = await db.project_workers.count_documents({
            "project_id": project_id,
            "status_id": dolgozik_status["id"]
        })
    
    # Get recruiters
    recruiters = []
    for rid in updated.get("recruiter_ids", []):
        r = await db.users.find_one({"id": rid}, {"_id": 0, "password": 0})
        if r:
            recruiters.append({"id": r["id"], "name": r.get("name", r["email"]), "email": r["email"]})
    
    # Get owner name
    owner_name = ""
    owner_id = updated.get("owner_id", "")
    if owner_id:
        owner = await db.users.find_one({"id": owner_id}, {"_id": 0, "password": 0})
        if owner:
            owner_name = owner.get("name", owner["email"])
    
    return ProjectResponse(**updated, worker_count=count, position_count=position_count, total_headcount=total_headcount, trial_count=trial_count, recruiters=recruiters, owner_name=owner_name, active_worker_count=active_worker_count)

@api_router.post("/projects/{project_id}/recruiters")
async def add_recruiter_to_project(project_id: str, data: ProjectRecruiterAdd, user: dict = Depends(require_admin)):
    """Admin hozzárendel egy toborzót a projekthez"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    target_user = await db.users.find_one({"id": data.user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    # Check if already assigned
    if data.user_id in project.get("recruiter_ids", []):
        return {"message": "Toborzó már hozzá van rendelve"}
    
    await db.projects.update_one(
        {"id": project_id},
        {"$addToSet": {"recruiter_ids": data.user_id}}
    )
    
    # Create notification for the recruiter
    await create_notification(
        user_id=data.user_id,
        notification_type="project_assigned",
        title="Új projekt hozzárendelés",
        message=f"Hozzárendeltek a(z) '{project['name']}' projekthez",
        link=f"/projects/{project_id}"
    )
    
    return {"message": "Toborzó hozzárendelve a projekthez"}

@api_router.delete("/projects/{project_id}/recruiters/{user_id}")
async def remove_recruiter_from_project(project_id: str, user_id: str, user: dict = Depends(require_admin)):
    """Admin eltávolít egy toborzót a projektből"""
    result = await db.projects.update_one(
        {"id": project_id},
        {"$pull": {"recruiter_ids": user_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    return {"message": "Toborzó eltávolítva a projektről"}

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, user: dict = Depends(require_admin)):
    """Csak admin törölhet projektet"""
    result = await db.projects.delete_one({"id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    await db.project_workers.delete_many({"project_id": project_id})
    await db.project_positions.delete_many({"project_id": project_id})
    await db.trials.delete_many({"project_id": project_id})
    return {"message": "Projekt törölve"}

# ==================== PROJECT POSITIONS ====================

@api_router.get("/projects/{project_id}/positions", response_model=List[ProjectPositionResponse])
async def get_project_positions(project_id: str, user: dict = Depends(get_current_user)):
    """Projekt pozícióinak lekérése"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    positions = await db.project_positions.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    
    result = []
    for pos in positions:
        # Count assigned workers for this position
        assigned_workers = await db.project_workers.count_documents({
            "project_id": project_id,
            "position_id": pos["id"]
        })
        # Backward compatibility: map shift_schedule to work_schedule
        result.append(ProjectPositionResponse(
            id=pos["id"],
            project_id=pos["project_id"],
            name=pos["name"],
            headcount=pos["headcount"],
            work_schedule=pos.get("work_schedule", pos.get("shift_schedule", "")),  # Backward compatible
            experience_required=pos.get("experience_required", ""),
            qualifications=pos.get("qualifications", ""),
            physical_requirements=pos.get("physical_requirements", ""),
            position_details=pos.get("position_details", ""),
            notes=pos.get("notes", ""),
            created_at=pos.get("created_at", ""),
            assigned_workers=assigned_workers
        ))
    
    return result

@api_router.post("/projects/{project_id}/positions", response_model=ProjectPositionResponse)
async def create_project_position(project_id: str, data: ProjectPositionCreate, user: dict = Depends(require_admin)):
    """Pozíció létrehozása projekthez - csak admin"""
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    position_doc = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "name": sanitize_string(data.name, max_length=100),
        "headcount": data.headcount,
        "work_schedule": data.work_schedule or "",  # ÚJ: work_schedule
        "experience_required": data.experience_required or "",
        "qualifications": data.qualifications or "",
        "physical_requirements": data.physical_requirements or "",
        "position_details": data.position_details or "",  # ÚJ: position_details
        "notes": data.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.project_positions.insert_one(position_doc)
    
    return ProjectPositionResponse(**position_doc, assigned_workers=0)

@api_router.put("/projects/{project_id}/positions/{position_id}", response_model=ProjectPositionResponse)
async def update_project_position(project_id: str, position_id: str, data: ProjectPositionUpdate, user: dict = Depends(require_admin)):
    """Pozíció szerkesztése - csak admin"""
    position = await db.project_positions.find_one({"id": position_id, "project_id": project_id})
    if not position:
        raise HTTPException(status_code=404, detail="Pozíció nem található")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.project_positions.update_one({"id": position_id}, {"$set": update_data})
    
    updated = await db.project_positions.find_one({"id": position_id}, {"_id": 0})
    assigned_workers = await db.project_workers.count_documents({
        "project_id": project_id,
        "position_id": position_id
    })
    
    return ProjectPositionResponse(**updated, assigned_workers=assigned_workers)

@api_router.delete("/projects/{project_id}/positions/{position_id}")
async def delete_project_position(project_id: str, position_id: str, user: dict = Depends(require_admin)):
    """Pozíció törlése - csak admin"""
    result = await db.project_positions.delete_one({"id": position_id, "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pozíció nem található")
    
    # Remove position_id from project_workers
    await db.project_workers.update_many(
        {"project_id": project_id, "position_id": position_id},
        {"$unset": {"position_id": ""}}
    )
    
    return {"message": "Pozíció törölve"}

# ==================== WAITLIST (VÁRÓLISTA) ====================

@api_router.get("/projects/{project_id}/waitlist", response_model=List[WaitlistWorkerResponse])
async def get_project_waitlist(project_id: str, user: dict = Depends(get_current_user)):
    """Get all workers in project waitlist"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    # Check permission
    if user["role"] != "admin" and user["id"] not in project.get("recruiter_ids", []):
        raise HTTPException(status_code=403, detail="Nincs jogosultságod ehhez a projekthez")
    
    waitlist_entries = await db.project_waitlist.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    
    result = []
    for entry in waitlist_entries:
        worker = await db.workers.find_one({"id": entry["worker_id"]}, {"_id": 0})
        if worker:
            added_by_user = await db.users.find_one({"id": entry["added_by"]}, {"_id": 0})
            result.append(WaitlistWorkerResponse(
                id=entry["id"],
                project_id=entry["project_id"],
                worker_id=entry["worker_id"],
                worker_name=worker["name"],
                worker_phone=worker["phone"],
                worker_email=worker.get("email", ""),
                trial_date=entry.get("trial_date", entry.get("start_date", "")),  # Backward compatible
                notes=entry.get("notes", ""),
                added_at=entry["added_at"],
                added_by=entry["added_by"],
                added_by_name=added_by_user.get("name", added_by_user["email"]) if added_by_user else ""
            ))
    
    return result

@api_router.post("/projects/{project_id}/waitlist")
async def add_worker_to_waitlist(project_id: str, data: WaitlistWorkerAdd, user: dict = Depends(get_current_user)):
    """Add a worker to project waitlist"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    # Check permission
    if user["role"] != "admin" and user["id"] not in project.get("recruiter_ids", []):
        raise HTTPException(status_code=403, detail="Nincs jogosultságod ehhez a projekthez")
    
    # Check if worker exists
    worker = await db.workers.find_one({"id": data.worker_id}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    # Check if worker already in waitlist
    existing = await db.project_waitlist.find_one({"project_id": project_id, "worker_id": data.worker_id})
    if existing:
        raise HTTPException(status_code=400, detail="A dolgozó már a várólistán van")
    
    waitlist_doc = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "worker_id": data.worker_id,
        "trial_date": data.trial_date or "",  # ÚJ: trial_date
        "notes": data.notes or "",
        "added_at": datetime.now(timezone.utc).isoformat(),
        "added_by": user["id"]
    }
    await db.project_waitlist.insert_one(waitlist_doc)
    
    return {"message": "Dolgozó hozzáadva a várólistához", "id": waitlist_doc["id"]}

@api_router.put("/projects/{project_id}/waitlist/{worker_id}")
async def update_waitlist_entry(project_id: str, worker_id: str, data: WaitlistWorkerUpdate, user: dict = Depends(get_current_user)):
    """Update waitlist entry"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    if user["role"] != "admin" and user["id"] not in project.get("recruiter_ids", []):
        raise HTTPException(status_code=403, detail="Nincs jogosultságod")
    
    entry = await db.project_waitlist.find_one({"project_id": project_id, "worker_id": worker_id})
    if not entry:
        raise HTTPException(status_code=404, detail="Dolgozó nincs a várólistán")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.project_waitlist.update_one(
            {"project_id": project_id, "worker_id": worker_id},
            {"$set": update_data}
        )
    
    return {"message": "Várólista frissítve"}

@api_router.delete("/projects/{project_id}/waitlist/{worker_id}")
async def remove_worker_from_waitlist(project_id: str, worker_id: str, user: dict = Depends(get_current_user)):
    """Remove worker from project waitlist"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    if user["role"] != "admin" and user["id"] not in project.get("recruiter_ids", []):
        raise HTTPException(status_code=403, detail="Nincs jogosultságod")
    
    result = await db.project_waitlist.delete_one({"project_id": project_id, "worker_id": worker_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Dolgozó nincs a várólistán")
    
    return {"message": "Dolgozó eltávolítva a várólistáról"}

# ==================== TRIALS (PRÓBÁK) ====================

@api_router.get("/projects/{project_id}/trials", response_model=List[TrialResponse])
async def get_project_trials(project_id: str, user: dict = Depends(get_current_user)):
    """Projekt próbáinak lekérése"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    trials = await db.trials.find({"project_id": project_id}, {"_id": 0}).sort("date", 1).to_list(100)
    
    result = []
    for trial in trials:
        # Get workers for this trial
        trial_workers_list = await db.trial_workers.find({"trial_id": trial["id"]}, {"_id": 0}).to_list(100)
        
        workers = []
        for tw in trial_workers_list:
            w = await db.workers.find_one({"id": tw["worker_id"]}, {"_id": 0})
            if w:
                # Toborzó csak saját dolgozóit látja
                if user["role"] != "admin" and w.get("owner_id") != user["id"]:
                    continue
                # Get trial position name if assigned
                trial_pos = await db.trial_positions.find_one({"id": tw.get("trial_position_id")}, {"_id": 0}) if tw.get("trial_position_id") else None
                workers.append({
                    "id": w["id"],
                    "name": w["name"],
                    "phone": w["phone"],
                    "trial_position_id": tw.get("trial_position_id", ""),
                    "position_name": trial_pos["position_name"] if trial_pos else "",
                    "added_at": tw.get("created_at", "")
                })
        
        # Get trial positions
        trial_positions = await db.trial_positions.find({"trial_id": trial["id"]}, {"_id": 0}).to_list(50)
        positions_response = []
        for tp in trial_positions:
            # Count assigned workers for this position
            assigned = await db.trial_workers.count_documents({
                "trial_id": trial["id"],
                "trial_position_id": tp["id"]
            })
            positions_response.append(TrialPositionResponse(
                **tp,
                assigned_count=assigned
            ))
        
        result.append(TrialResponse(
            **trial,
            worker_count=len(trial_workers_list),
            workers=workers,
            positions=positions_response
        ))
    
    return result

@api_router.post("/projects/{project_id}/trials", response_model=TrialResponse)
async def create_trial(project_id: str, data: TrialCreate, user: dict = Depends(require_admin)):
    """Próba létrehozása - csak admin"""
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    trial_doc = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "date": data.date,
        "time": data.time or "",
        "notes": data.notes or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.trials.insert_one(trial_doc)
    
    return TrialResponse(**trial_doc, worker_count=0, workers=[], positions=[])

@api_router.put("/projects/{project_id}/trials/{trial_id}", response_model=TrialResponse)
async def update_trial(project_id: str, trial_id: str, data: TrialUpdate, user: dict = Depends(require_admin)):
    """Próba szerkesztése - csak admin"""
    trial = await db.trials.find_one({"id": trial_id, "project_id": project_id})
    if not trial:
        raise HTTPException(status_code=404, detail="Próba nem található")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        await db.trials.update_one({"id": trial_id}, {"$set": update_data})
    
    updated = await db.trials.find_one({"id": trial_id}, {"_id": 0})
    worker_count = await db.trial_workers.count_documents({"trial_id": trial_id})
    
    return TrialResponse(**updated, worker_count=worker_count, workers=[])

@api_router.delete("/projects/{project_id}/trials/{trial_id}")
async def delete_trial(project_id: str, trial_id: str, user: dict = Depends(require_admin)):
    """Próba törlése - csak admin"""
    result = await db.trials.delete_one({"id": trial_id, "project_id": project_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Próba nem található")
    
    # Delete trial workers and positions
    await db.trial_workers.delete_many({"trial_id": trial_id})
    await db.trial_positions.delete_many({"trial_id": trial_id})
    
    return {"message": "Próba törölve"}

# ==================== TRIAL POSITIONS ====================

@api_router.get("/projects/{project_id}/trials/{trial_id}/positions")
async def get_trial_positions(project_id: str, trial_id: str, user: dict = Depends(get_current_user)):
    """Próba pozícióinak lekérése"""
    trial = await db.trials.find_one({"id": trial_id, "project_id": project_id})
    if not trial:
        raise HTTPException(status_code=404, detail="Próba nem található")
    
    positions = await db.trial_positions.find({"trial_id": trial_id}, {"_id": 0}).to_list(50)
    result = []
    for tp in positions:
        assigned = await db.trial_workers.count_documents({
            "trial_id": trial_id,
            "trial_position_id": tp["id"]
        })
        result.append(TrialPositionResponse(**tp, assigned_count=assigned))
    return result

@api_router.post("/projects/{project_id}/trials/{trial_id}/positions", response_model=TrialPositionResponse)
async def add_trial_position(project_id: str, trial_id: str, data: TrialPositionCreate, user: dict = Depends(get_current_user)):
    """Pozíció hozzáadása próbához"""
    trial = await db.trials.find_one({"id": trial_id, "project_id": project_id})
    if not trial:
        raise HTTPException(status_code=404, detail="Próba nem található")
    
    # Check if position name already exists in trial
    existing = await db.trial_positions.find_one({
        "trial_id": trial_id,
        "position_name": data.position_name
    })
    if existing:
        raise HTTPException(status_code=400, detail="Ez a pozíció már hozzá van adva ehhez a próbához")
    
    # If add_to_project is True, add to project positions too
    if data.add_to_project:
        existing_project_pos = await db.project_positions.find_one({
            "project_id": project_id,
            "name": data.position_name
        })
        if not existing_project_pos:
            project_pos_doc = {
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                "name": data.position_name,
                "headcount": data.headcount,
                "shift_schedule": "",
                "experience_required": data.requirements,
                "qualifications": "",
                "physical_requirements": "",
                "notes": "",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.project_positions.insert_one(project_pos_doc)
            data.position_id = project_pos_doc["id"]
    
    trial_pos_doc = {
        "id": str(uuid.uuid4()),
        "trial_id": trial_id,
        "position_id": data.position_id or "",
        "position_name": data.position_name,
        "headcount": data.headcount,
        "hourly_rate": data.hourly_rate or "",
        "accommodation": data.accommodation,
        "requirements": data.requirements,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.trial_positions.insert_one(trial_pos_doc)
    
    return TrialPositionResponse(**trial_pos_doc, assigned_count=0)

@api_router.put("/projects/{project_id}/trials/{trial_id}/positions/{position_id}")
async def update_trial_position(project_id: str, trial_id: str, position_id: str, data: TrialPositionCreate, user: dict = Depends(get_current_user)):
    """Próba pozíció szerkesztése"""
    trial_pos = await db.trial_positions.find_one({"id": position_id, "trial_id": trial_id})
    if not trial_pos:
        raise HTTPException(status_code=404, detail="Pozíció nem található")
    
    update_data = {
        "position_name": data.position_name,
        "headcount": data.headcount,
        "hourly_rate": data.hourly_rate or "",
        "accommodation": data.accommodation,
        "requirements": data.requirements
    }
    await db.trial_positions.update_one({"id": position_id}, {"$set": update_data})
    
    updated = await db.trial_positions.find_one({"id": position_id}, {"_id": 0})
    assigned = await db.trial_workers.count_documents({"trial_id": trial_id, "trial_position_id": position_id})
    return TrialPositionResponse(**updated, assigned_count=assigned)

@api_router.delete("/projects/{project_id}/trials/{trial_id}/positions/{position_id}")
async def delete_trial_position(project_id: str, trial_id: str, position_id: str, user: dict = Depends(get_current_user)):
    """Próba pozíció törlése"""
    result = await db.trial_positions.delete_one({"id": position_id, "trial_id": trial_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pozíció nem található")
    
    # Remove position assignment from workers
    await db.trial_workers.update_many(
        {"trial_id": trial_id, "trial_position_id": position_id},
        {"$set": {"trial_position_id": ""}}
    )
    
    return {"message": "Pozíció törölve"}

# ==================== TRIAL WORKERS ====================

@api_router.post("/projects/{project_id}/trials/{trial_id}/workers")
async def add_worker_to_trial(project_id: str, trial_id: str, data: TrialWorkerAdd, user: dict = Depends(get_current_user)):
    """Dolgozó hozzáadása próbához"""
    trial = await db.trials.find_one({"id": trial_id, "project_id": project_id}, {"_id": 0})
    if not trial:
        raise HTTPException(status_code=404, detail="Próba nem található")
    
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    
    worker = await db.workers.find_one({"id": data.worker_id}, {"_id": 0})
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    existing = await db.trial_workers.find_one({
        "trial_id": trial_id,
        "worker_id": data.worker_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Dolgozó már hozzá van rendelve ehhez a próbához")
    
    tw_doc = {
        "id": str(uuid.uuid4()),
        "trial_id": trial_id,
        "worker_id": data.worker_id,
        "trial_position_id": data.position_id or "",  # This is now trial_position_id
        "added_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.trial_workers.insert_one(tw_doc)
    
    # Send notification to worker's owner (recruiter) if different from current user
    if worker.get("owner_id") and worker["owner_id"] != user["id"]:
        await create_notification(
            user_id=worker["owner_id"],
            notification_type="trial_assigned",
            title="Dolgozó próbára beosztva",
            message=f"A(z) '{worker['name']}' dolgozódat beosztották a '{project['name'] if project else 'Projekt'}' próbájára ({trial['date']})",
            link=f"/projects/{project_id}"
        )
    
    return {"message": "Dolgozó hozzáadva a próbához"}

@api_router.put("/projects/{project_id}/trials/{trial_id}/workers/{worker_id}/position")
async def assign_worker_to_trial_position(project_id: str, trial_id: str, worker_id: str, trial_position_id: str = "", user: dict = Depends(get_current_user)):
    """Dolgozó pozícióhoz rendelése a próbán belül"""
    result = await db.trial_workers.update_one(
        {"trial_id": trial_id, "worker_id": worker_id},
        {"$set": {"trial_position_id": trial_position_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Dolgozó nem található ezen a próbán")
    return {"message": "Pozíció frissítve"}

@api_router.delete("/projects/{project_id}/trials/{trial_id}/workers/{worker_id}")
async def remove_worker_from_trial(project_id: str, trial_id: str, worker_id: str, user: dict = Depends(get_current_user)):
    """Dolgozó eltávolítása próbáról"""
    result = await db.trial_workers.delete_one({
        "trial_id": trial_id,
        "worker_id": worker_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kapcsolat nem található")
    return {"message": "Dolgozó eltávolítva a próbáról"}

@api_router.post("/projects/{project_id}/workers")
async def add_worker_to_project(project_id: str, data: ProjectWorkerAdd, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    worker = await db.workers.find_one({"id": data.worker_id})
    if not worker:
        raise HTTPException(status_code=404, detail="Dolgozó nem található")
    
    existing = await db.project_workers.find_one({
        "project_id": project_id,
        "worker_id": data.worker_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Dolgozó már hozzá van rendelve")
    
    pw_doc = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "worker_id": data.worker_id,
        "status_id": data.status_id or "",
        "added_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.project_workers.insert_one(pw_doc)
    return {"message": "Dolgozó hozzáadva a projekthez"}

@api_router.delete("/projects/{project_id}/workers/{worker_id}")
async def remove_worker_from_project(project_id: str, worker_id: str, user: dict = Depends(get_current_user)):
    result = await db.project_workers.delete_one({
        "project_id": project_id,
        "worker_id": worker_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kapcsolat nem található")
    return {"message": "Dolgozó eltávolítva a projektről"}

@api_router.put("/projects/{project_id}/workers/{worker_id}/status")
async def update_worker_status_in_project(
    project_id: str, 
    worker_id: str, 
    data: ProjectWorkerStatusUpdate,
    user: dict = Depends(get_current_user)
):
    update_fields = {
        "status_id": data.status_id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    if data.notes is not None:
        update_fields["notes"] = data.notes
    
    result = await db.project_workers.update_one(
        {"project_id": project_id, "worker_id": worker_id},
        {"$set": update_fields}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kapcsolat nem található")
    
    # Státusz változás naplózása a dolgozó notes mezőjébe
    status = await db.statuses.find_one({"id": data.status_id}, {"_id": 0})
    if status:
        timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        
        # Projekt neve lekérése
        project = await db.projects.find_one({"id": project_id}, {"_id": 0, "name": 1})
        project_name = project["name"] if project else "Ismeretlen projekt"
        
        # Meglévő notes lekérése
        worker_doc = await db.workers.find_one({"id": worker_id}, {"_id": 0})
        existing_notes = worker_doc.get("notes", "") if worker_doc else ""
        
        # Új történet bejegyzés
        new_entry = f"[{timestamp}] {project_name} - Státusz: {status['name']}"
        if data.notes:
            new_entry += f" - {data.notes}"
        
        # Összefűzés
        updated_notes = f"{new_entry}\n{existing_notes}" if existing_notes else new_entry
        
        # Mentés
        await db.workers.update_one(
            {"id": worker_id},
            {"$set": {"notes": updated_notes}}
        )
    
    return {"message": "Státusz frissítve"}

@api_router.get("/projects/{project_id}/archive")
async def get_project_archive(project_id: str, user: dict = Depends(get_current_user)):
    """
    KUKA - Negatív státuszú dolgozók (akik már voltak próbán, de nem váltak be)
    """
    # Get all statuses marked as "negative"
    negative_statuses = await db.statuses.find(
        {"status_type": "negative"},
        {"_id": 0}
    ).to_list(100)
    
    negative_status_ids = [s["id"] for s in negative_statuses]
    
    if not negative_status_ids:
        return {"workers": [], "count": 0}
    
    # Get workers with negative status in this project (from trials or project_workers)
    archived_workers = []
    
    # 1. Check project_workers for negative statuses
    project_worker_relations = await db.project_workers.find(
        {
            "project_id": project_id,
            "status_id": {"$in": negative_status_ids}
        },
        {"_id": 0}
    ).to_list(1000)
    
    for rel in project_worker_relations:
        worker = await db.workers.find_one({"id": rel["worker_id"]}, {"_id": 0})
        if worker:
            status = await db.statuses.find_one({"id": rel["status_id"]}, {"_id": 0})
            archived_workers.append({
                "id": worker["id"],
                "name": worker["name"],
                "phone": worker["phone"],
                "email": worker.get("email", ""),
                "status_id": rel["status_id"],
                "status_name": status["name"] if status else "Ismeretlen",
                "status_color": status.get("color", "#6b7280") if status else "#6b7280",
                "notes": rel.get("notes", ""),
                "updated_at": rel.get("updated_at", ""),
                "source": "project"
            })
    
    # 2. Check trial workers for negative statuses
    trials = await db.trials.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    for trial in trials:
        trial_workers = await db.trial_workers.find(
            {
                "trial_id": trial["id"],
                "status_id": {"$in": negative_status_ids}
            },
            {"_id": 0}
        ).to_list(1000)
        
        for tw in trial_workers:
            # Check if already added from project_workers
            if not any(w["id"] == tw["worker_id"] for w in archived_workers):
                worker = await db.workers.find_one({"id": tw["worker_id"]}, {"_id": 0})
                if worker:
                    status = await db.statuses.find_one({"id": tw["status_id"]}, {"_id": 0})
                    archived_workers.append({
                        "id": worker["id"],
                        "name": worker["name"],
                        "phone": worker["phone"],
                        "email": worker.get("email", ""),
                        "status_id": tw["status_id"],
                        "status_name": status["name"] if status else "Ismeretlen",
                        "status_color": status.get("color", "#6b7280") if status else "#6b7280",
                        "notes": tw.get("notes", ""),
                        "updated_at": tw.get("added_at", ""),
                        "trial_date": trial.get("date", ""),
                        "source": "trial"
                    })
    
    # Sort by updated_at desc
    archived_workers.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    
    return {
        "workers": archived_workers,
        "count": len(archived_workers)
    }

@api_router.get("/projects/{project_id}/summary")
async def get_project_summary(project_id: str, user: dict = Depends(get_current_user)):
    """
    ÖSSZESÍTÉS - Státusz alapú statisztika
    """
    # Check user permission
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    # Admin sees all, toborzó only if assigned or owner
    if user["role"] != "admin":
        if project.get("owner_id") != user["id"] and user["id"] not in project.get("recruiter_ids", []):
            raise HTTPException(status_code=403, detail="Nincs jogosultságod ehhez a projekthez")
    
    # Get all statuses
    all_statuses = await db.statuses.find({}, {"_id": 0}).to_list(100)
    
    # Count workers by status
    status_counts = []
    total_workers = 0
    
    for status in all_statuses:
        count = await db.project_workers.count_documents({
            "project_id": project_id,
            "status_id": status["id"]
        })
        
        if count > 0:
            status_counts.append({
                "status_id": status["id"],
                "status_name": status["name"],
                "status_type": status.get("status_type", "neutral"),
                "color": status.get("color", "#6b7280"),
                "count": count
            })
            total_workers += count
    
    # Sort by count desc
    status_counts.sort(key=lambda x: x["count"], reverse=True)
    
    # Position fill rate
    positions = await db.project_positions.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    total_headcount = sum(p.get("headcount", 0) for p in positions)
    
    # Workers in positive status (dolgozik, megfelelt, stb.)
    positive_statuses = [s for s in all_statuses if s.get("status_type") == "positive"]
    positive_status_ids = [s["id"] for s in positive_statuses]
    active_workers = await db.project_workers.count_documents({
        "project_id": project_id,
        "status_id": {"$in": positive_status_ids}
    })
    
    fill_rate = (active_workers / total_headcount * 100) if total_headcount > 0 else 0
    
    return {
        "total_workers": total_workers,
        "active_workers": active_workers,
        "total_positions": len(positions),
        "total_headcount": total_headcount,
        "fill_rate": round(fill_rate, 1),
        "status_breakdown": status_counts
    }

# ==================== EXCEL EXPORT ====================

async def generate_excel_for_user(user_id: str, user_name: str):
    """Generate Excel file for a specific recruiter with workers grouped by category"""
    wb = Workbook()
    
    # Styles
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="6366F1", end_color="6366F1", fill_type="solid")
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Get categories from database
    db_categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    categories = [c["name"] for c in db_categories] if db_categories else [
        "Felvitt dolgozók", "Hideg jelentkező", "Űrlapon jelentkezett", 
        "Állásra jelentkezett", "Ingázó", "Szállásos"
    ]
    
    # Remove default sheet
    wb.remove(wb.active)
    
    for cat in categories:
        workers = await db.workers.find(
            {"owner_id": user_id, "category": cat}, {"_id": 0}
        ).sort("name", 1).to_list(1000)
        
        if not workers:
            continue
            
        # Create sheet for category
        ws = wb.create_sheet(title=cat[:31])  # Excel max 31 chars
        
        # Headers
        headers = ["Név", "Telefon", "Email", "Lakcím", "Típus", "Tapasztalat", "Felvéve"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
            cell.alignment = Alignment(horizontal="center")
        
        # Data
        for row, worker in enumerate(workers, 2):
            type_doc = await db.worker_types.find_one({"id": worker.get("worker_type_id")}, {"_id": 0})
            type_name = type_doc["name"] if type_doc else ""
            
            ws.cell(row=row, column=1, value=worker["name"]).border = border
            ws.cell(row=row, column=2, value=worker["phone"]).border = border
            ws.cell(row=row, column=3, value=worker.get("email", "")).border = border
            ws.cell(row=row, column=4, value=worker.get("address", "")).border = border
            ws.cell(row=row, column=5, value=type_name).border = border
            ws.cell(row=row, column=6, value=worker.get("experience", "")).border = border
            ws.cell(row=row, column=7, value=worker.get("created_at", "")[:10]).border = border
        
        # Auto-width columns
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            ws.column_dimensions[column].width = min(max_length + 2, 50)
    
    # If no sheets were created, add summary
    if not wb.sheetnames:
        ws = wb.create_sheet(title="Összefoglaló")
        ws.cell(row=1, column=1, value="Nincs dolgozó ebben a kategóriában")
    
    # Save file
    safe_name = "".join(c for c in user_name if c.isalnum() or c in " -_").strip() or "export"
    filename = f"{safe_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = EXPORTS_DIR / filename
    wb.save(filepath)
    
    return filepath, filename

@api_router.get("/export/workers")
async def export_workers_excel(user: dict = Depends(get_current_user)):
    """Export current user's workers to Excel"""
    user_name = user.get("name") or user["email"].split("@")[0]
    filepath, filename = await generate_excel_for_user(user["id"], user_name)
    
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@api_router.get("/export/workers/{user_id}")
async def export_user_workers_excel(user_id: str, admin: dict = Depends(require_admin)):
    """Admin can export any user's workers to Excel"""
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="Felhasználó nem található")
    
    user_name = target_user.get("name") or target_user["email"].split("@")[0]
    filepath, filename = await generate_excel_for_user(user_id, user_name)
    
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@api_router.get("/export/all")
async def export_all_workers_excel(admin: dict = Depends(require_admin)):
    """Admin exports all workers grouped by recruiter and category"""
    wb = Workbook()
    
    # Styles
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="6366F1", end_color="6366F1", fill_type="solid")
    recruiter_fill = PatternFill(start_color="E0E7FF", end_color="E0E7FF", fill_type="solid")
    border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Get all users
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
    
    # Remove default sheet
    wb.remove(wb.active)
    
    for u in users:
        workers = await db.workers.find({"owner_id": u["id"]}, {"_id": 0}).sort("category", 1).to_list(1000)
        
        if not workers:
            continue
        
        user_name = u.get("name") or u["email"].split("@")[0]
        sheet_name = user_name[:31]  # Excel max 31 chars
        
        # Handle duplicate sheet names
        if sheet_name in wb.sheetnames:
            sheet_name = f"{sheet_name[:28]}_{len(wb.sheetnames)}"
        
        ws = wb.create_sheet(title=sheet_name)
        
        # Headers
        headers = ["Név", "Telefon", "Email", "Kategória", "Típus", "Lakcím", "Felvéve"]
        for col, header in enumerate(headers, 1):
            cell = ws.cell(row=1, column=col, value=header)
            cell.font = header_font
            cell.fill = header_fill
            cell.border = border
        
        # Data
        for row, worker in enumerate(workers, 2):
            type_doc = await db.worker_types.find_one({"id": worker.get("worker_type_id")}, {"_id": 0})
            type_name = type_doc["name"] if type_doc else ""
            
            ws.cell(row=row, column=1, value=worker["name"]).border = border
            ws.cell(row=row, column=2, value=worker["phone"]).border = border
            ws.cell(row=row, column=3, value=worker.get("email", "")).border = border
            ws.cell(row=row, column=4, value=worker["category"]).border = border
            ws.cell(row=row, column=5, value=type_name).border = border
            ws.cell(row=row, column=6, value=worker.get("address", "")).border = border
            ws.cell(row=row, column=7, value=worker.get("created_at", "")[:10]).border = border
        
        # Auto-width
        for col in ws.columns:
            max_length = 0
            column = col[0].column_letter
            for cell in col:
                try:
                    if len(str(cell.value)) > max_length:
                        max_length = len(str(cell.value))
                except:
                    pass
            ws.column_dimensions[column].width = min(max_length + 2, 50)
    
    if not wb.sheetnames:
        ws = wb.create_sheet(title="Összefoglaló")
        ws.cell(row=1, column=1, value="Nincs dolgozó a rendszerben")
    
    filename = f"osszes_dolgozo_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    filepath = EXPORTS_DIR / filename
    wb.save(filepath)
    
    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

# ==================== SEED DATA ====================

@api_router.post("/seed")
async def seed_data():
    """Initialize default data"""
    # Check if already seeded
    admin = await db.users.find_one({"email": "admin@dolgozocrm.hu"})
    if admin:
        return {"message": "Adatok már léteznek"}
    
    # Create admin user
    admin_doc = {
        "id": str(uuid.uuid4()),
        "email": "admin@dolgozocrm.hu",
        "password": hash_password("admin123"),
        "name": "Admin",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin_doc)
    
    # Create test recruiter
    recruiter_doc = {
        "id": str(uuid.uuid4()),
        "email": "toborzo@dolgozocrm.hu",
        "password": hash_password("toborzo123"),
        "name": "Teszt Toborzó",
        "role": "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(recruiter_doc)
    
    # Worker types with positions
    type_positions = {
        "Betanított munkás": ["Csomagoló", "Komissiózó", "Összeszerelő", "Gyártósori munkás"],
        "Szakmunkás": ["Hegesztő", "Villanyszerelő", "Lakatos", "Esztergályos", "CNC gépkezelő", "Szerszámkészítő"],
        "Targoncás": ["Homlok targoncás", "Oldal targoncás", "Reach truck kezelő", "Magasraktári targoncás"],
        "Gépkezelő": ["Présgép kezelő", "Fröccsöntő gép kezelő", "Hajlítógép kezelő", "Varrógép kezelő"],
        "Raktáros": ["Áruátvevő", "Kiadó", "Leltáros", "Raktári adminisztrátor"],
        "Segédmunkás": ["Takarító", "Anyagmozgató", "Betanított segéd", "Kézi rakodó"]
    }
    
    for type_name, positions in type_positions.items():
        type_id = str(uuid.uuid4())
        await db.worker_types.insert_one({"id": type_id, "name": type_name})
        for pos in positions:
            await db.positions.insert_one({
                "id": str(uuid.uuid4()),
                "name": pos,
                "worker_type_id": type_id
            })
    
    # Statuses
    statuses = ["Jelentkezett", "Megerősítve", "Dolgozik", "Megfelelt", "Nem felelt meg", "Lemondta", "Nem jelent meg"]
    for s in statuses:
        await db.statuses.insert_one({"id": str(uuid.uuid4()), "name": s})
    
    # Tags
    tags = [
        {"name": "Megbízható", "color": "#22c55e"},
        {"name": "Tapasztalt", "color": "#3b82f6"},
        {"name": "Ajánlott", "color": "#f97316"},
        {"name": "Saját autó", "color": "#8b5cf6"},
        {"name": "Éjszakás", "color": "#6366f1"}
    ]
    for t in tags:
        await db.tags.insert_one({"id": str(uuid.uuid4()), **t})
    
    return {"message": "Seed adatok létrehozva", "admin_email": "admin@dolgozocrm.hu", "admin_password": "admin123"}

# ==================== EXCEL IMPORT ====================

class ExcelColumnMapping(BaseModel):
    name: Optional[int] = None  # Column index for name
    phone: Optional[int] = None
    email: Optional[int] = None
    address: Optional[int] = None
    position: Optional[int] = None
    experience: Optional[int] = None
    notes: Optional[int] = None

class ExcelImportSettings(BaseModel):
    column_mapping: Dict[str, Optional[int]]  # field_name -> column_index
    worker_type_id: str  # Required worker type
    category: str = "Felvitt dolgozók"  # Default category for all
    global_status: str = "Feldolgozatlan"
    start_row: int = 2  # Skip header row
    apply_same_to_all: bool = True  # Apply same category/type to all

@api_router.post("/workers/import/preview")
async def preview_excel_import(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """Preview Excel file - returns first 10 rows and column headers"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Csak .xlsx vagy .xls fájl tölthető fel")
    
    try:
        contents = await file.read()
        wb = load_workbook(filename=io.BytesIO(contents), read_only=True, data_only=True)
        ws = wb.active
        
        # Get headers (first row)
        headers = []
        for col in range(1, ws.max_column + 1):
            cell_value = ws.cell(row=1, column=col).value
            headers.append(str(cell_value) if cell_value else f"Oszlop {col}")
        
        # Get preview rows (first 10 data rows)
        preview_rows = []
        for row in range(2, min(12, ws.max_row + 1)):
            row_data = []
            for col in range(1, ws.max_column + 1):
                cell_value = ws.cell(row=row, column=col).value
                row_data.append(str(cell_value) if cell_value else "")
            preview_rows.append(row_data)
        
        wb.close()
        
        return {
            "filename": file.filename,
            "total_rows": ws.max_row - 1,  # Exclude header
            "columns": headers,
            "preview_rows": preview_rows,
            "column_count": len(headers)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Hiba a fájl olvasásakor: {str(e)}")

@api_router.post("/workers/import")
async def import_workers_from_excel(
    file: UploadFile = File(...),
    settings: str = Form(...),  # JSON string of ExcelImportSettings
    user: dict = Depends(get_current_user)
):
    """Import workers from Excel file with column mapping"""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Csak .xlsx vagy .xls fájl tölthető fel")
    
    try:
        import_settings = json.loads(settings)
    except:
        raise HTTPException(status_code=400, detail="Érvénytelen beállítások")
    
    column_mapping = import_settings.get("column_mapping", {})
    worker_type_id = import_settings.get("worker_type_id", "")
    category = import_settings.get("category", "Felvitt dolgozók")
    global_status = import_settings.get("global_status", "Feldolgozatlan")
    start_row = import_settings.get("start_row", 2)
    
    # Validate worker_type_id
    worker_type = await db.worker_types.find_one({"id": worker_type_id})
    if not worker_type:
        raise HTTPException(status_code=400, detail="Érvénytelen dolgozó típus")
    
    # Name column is required
    name_col = column_mapping.get("name")
    if name_col is None:
        raise HTTPException(status_code=400, detail="Név oszlop megadása kötelező")
    
    try:
        contents = await file.read()
        wb = load_workbook(filename=io.BytesIO(contents), read_only=True, data_only=True)
        ws = wb.active
        
        imported_count = 0
        skipped_count = 0
        errors = []
        
        # Process rows (up to 1000)
        max_rows = min(ws.max_row, start_row + 1000)
        
        for row_idx in range(start_row, max_rows + 1):
            try:
                # Get name (required)
                name_value = ws.cell(row=row_idx, column=name_col + 1).value  # +1 because openpyxl is 1-indexed
                if not name_value or str(name_value).strip() == "":
                    skipped_count += 1
                    continue
                
                name = str(name_value).strip()
                if len(name) < 2:
                    skipped_count += 1
                    continue
                
                # Get optional fields
                phone_col = column_mapping.get("phone")
                phone = str(ws.cell(row=row_idx, column=phone_col + 1).value or "").strip() if phone_col is not None else ""
                
                email_col = column_mapping.get("email")
                email = str(ws.cell(row=row_idx, column=email_col + 1).value or "").strip() if email_col is not None else ""
                
                address_col = column_mapping.get("address")
                address = str(ws.cell(row=row_idx, column=address_col + 1).value or "").strip() if address_col is not None else ""
                
                position_col = column_mapping.get("position")
                position = str(ws.cell(row=row_idx, column=position_col + 1).value or "").strip() if position_col is not None else ""
                
                experience_col = column_mapping.get("experience")
                experience = str(ws.cell(row=row_idx, column=experience_col + 1).value or "").strip() if experience_col is not None else ""
                
                notes_col = column_mapping.get("notes")
                notes = str(ws.cell(row=row_idx, column=notes_col + 1).value or "").strip() if notes_col is not None else ""
                
                # Create worker document
                worker_doc = {
                    "id": str(uuid.uuid4()),
                    "name": name,
                    "phone": phone,
                    "worker_type_id": worker_type_id,
                    "position": position,
                    "position_experience": "",
                    "category": category,
                    "address": address,
                    "email": email,
                    "experience": experience,
                    "notes": notes,
                    "global_status": global_status,
                    "tag_ids": [],
                    "owner_id": user["id"],
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.workers.insert_one(worker_doc)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Sor {row_idx}: {str(e)}")
                skipped_count += 1
        
        wb.close()
        
        return {
            "message": f"{imported_count} dolgozó sikeresen importálva",
            "imported": imported_count,
            "skipped": skipped_count,
            "errors": errors[:10] if errors else []  # Return first 10 errors
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Hiba az importálás során: {str(e)}")

# ==================== FTP SYNC / BACKUP ====================

def generate_recruiter_excel(recruiter_id: str, recruiter_name: str, workers: list) -> bytes:
    """Generate Excel file with all worker data for a recruiter"""
    wb = Workbook()
    ws = wb.active
    ws.title = "Dolgozók"
    
    # Headers
    headers = [
        "Teljes név", "Telefon", "Email", "Lakcím", "Pozíció", 
        "Tapasztalat", "Kategória", "Típus", "Globális státusz",
        "Projektek", "Megjegyzés", "Létrehozva"
    ]
    
    # Style for headers
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    header_alignment = Alignment(horizontal="center", vertical="center")
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Write headers
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = thin_border
    
    # Write data
    for row_idx, w in enumerate(workers, 2):
        # Get project statuses as string
        project_info = ""
        if w.get("project_statuses"):
            project_info = "; ".join([
                f"{ps.get('project_name', '')}: {ps.get('status_name', '')}" 
                for ps in w.get("project_statuses", [])
            ])
        
        row_data = [
            w.get("name", ""),
            w.get("phone", ""),
            w.get("email", ""),
            w.get("address", ""),
            w.get("position", ""),
            w.get("experience", ""),
            w.get("category", ""),
            w.get("worker_type_name", ""),
            w.get("global_status", "Feldolgozatlan"),
            project_info,
            w.get("notes", ""),
            w.get("created_at", "")[:10] if w.get("created_at") else ""
        ]
        
        for col, value in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col, value=value)
            cell.border = thin_border
            cell.alignment = Alignment(vertical="center")
    
    # Adjust column widths
    column_widths = [20, 15, 25, 30, 15, 20, 15, 15, 15, 40, 30, 12]
    for i, width in enumerate(column_widths, 1):
        ws.column_dimensions[chr(64 + i)].width = width
    
    # Freeze header row
    ws.freeze_panes = "A2"
    
    # Save to bytes
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()

async def sync_to_ftp():
    """Sync all recruiter Excel files to FTP server"""
    if not FTP_HOST or not FTP_USER or not FTP_PASS:
        logger.warning("FTP credentials not configured, skipping sync")
        return {"status": "skipped", "reason": "FTP not configured"}
    
    try:
        # Get all users (recruiters)
        users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
        
        # Connect to FTP
        ftp = ftplib.FTP(FTP_HOST)
        ftp.login(FTP_USER, FTP_PASS)
        
        # Try to create/change to backup folder
        try:
            ftp.cwd(FTP_FOLDER)
        except:
            try:
                ftp.mkd(FTP_FOLDER)
                ftp.cwd(FTP_FOLDER)
            except:
                pass  # Folder might already exist
        
        synced_files = []
        today = datetime.now().strftime("%Y-%m-%d")
        
        for user in users:
            user_id = user["id"]
            user_name = user.get("name", user.get("email", "unknown")).replace(" ", "_").replace("@", "_at_")
            
            # Get all workers for this user
            workers_cursor = db.workers.find({"owner_id": user_id}, {"_id": 0})
            workers = await workers_cursor.to_list(10000)
            
            if not workers:
                continue
            
            # Enrich workers with type names and project statuses
            for w in workers:
                # Get type name
                type_doc = await db.worker_types.find_one({"id": w.get("worker_type_id")}, {"_id": 0})
                w["worker_type_name"] = type_doc["name"] if type_doc else ""
                
                # Get project statuses
                pw_list = await db.project_workers.find({"worker_id": w["id"]}, {"_id": 0}).to_list(100)
                project_statuses = []
                for pw in pw_list:
                    project = await db.projects.find_one({"id": pw["project_id"]}, {"_id": 0})
                    status = await db.statuses.find_one({"id": pw.get("status_id")}, {"_id": 0})
                    if project:
                        project_statuses.append({
                            "project_name": project["name"],
                            "status_name": status["name"] if status else "Hozzárendelve"
                        })
                w["project_statuses"] = project_statuses
            
            # Generate Excel
            excel_data = generate_recruiter_excel(user_id, user_name, workers)
            
            # Upload to FTP
            filename = f"{user_name}_dolgozok_{today}.xlsx"
            ftp.storbinary(f"STOR {filename}", io.BytesIO(excel_data))
            synced_files.append(filename)
            logger.info(f"FTP: Uploaded {filename} with {len(workers)} workers")
        
        ftp.quit()
        
        return {
            "status": "success",
            "synced_files": synced_files,
            "date": today
        }
        
    except Exception as e:
        logger.error(f"FTP sync error: {str(e)}")
        return {"status": "error", "message": str(e)}

@api_router.post("/sync/ftp")
async def trigger_ftp_sync(user: dict = Depends(require_admin)):
    """Manually trigger FTP sync (admin only)"""
    result = await sync_to_ftp()
    return result

@api_router.get("/sync/status")
async def get_sync_status(user: dict = Depends(require_admin)):
    """Get FTP sync configuration status"""
    return {
        "ftp_configured": bool(FTP_HOST and FTP_USER and FTP_PASS),
        "ftp_host": FTP_HOST if FTP_HOST else "Not configured",
        "ftp_folder": FTP_FOLDER
    }

# ==================== HEALTH ====================

# ==================== NOTIFICATIONS ====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(user: dict = Depends(get_current_user)):
    """Felhasználó értesítéseinek lekérése"""
    notifications = await db.notifications.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return [NotificationResponse(**n) for n in notifications]

@api_router.get("/notifications/unread-count")
async def get_unread_notification_count(user: dict = Depends(get_current_user)):
    """Olvasatlan értesítések száma"""
    count = await db.notifications.count_documents({
        "user_id": user["id"],
        "is_read": False
    })
    return {"count": count}

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, user: dict = Depends(get_current_user)):
    """Értesítés olvasottként jelölése"""
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": user["id"]},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Értesítés nem található")
    return {"message": "Megjelölve olvasottként"}

@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(user: dict = Depends(get_current_user)):
    """Összes értesítés olvasottként jelölése"""
    await db.notifications.update_many(
        {"user_id": user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "Összes értesítés olvasottként jelölve"}

@api_router.delete("/notifications/{notification_id}")
async def delete_notification(notification_id: str, user: dict = Depends(get_current_user)):
    """Értesítés törlése"""
    result = await db.notifications.delete_one({
        "id": notification_id,
        "user_id": user["id"]
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Értesítés nem található")
    return {"message": "Értesítés törölve"}

# ==================== CALENDAR ====================

@api_router.get("/calendar/trials")
async def get_calendar_trials(user: dict = Depends(get_current_user)):
    """Naptár események - próbák. Admin minden próbát lát, toborzó a sajátját."""
    trials = await db.trials.find({}, {"_id": 0}).to_list(1000)
    
    events = []
    for trial in trials:
        project = await db.projects.find_one({"id": trial["project_id"]}, {"_id": 0})
        if not project:
            continue
        
        # Check visibility for recruiters
        if user["role"] != "admin":
            # Toborzó csak azokat a próbákat látja, ahol van dolgozója
            trial_workers = await db.trial_workers.find({"trial_id": trial["id"]}, {"_id": 0}).to_list(100)
            worker_ids = [tw["worker_id"] for tw in trial_workers]
            
            # Check if any of these workers belong to the recruiter
            own_workers = await db.workers.count_documents({
                "id": {"$in": worker_ids},
                "owner_id": user["id"]
            })
            
            # Also check if recruiter is assigned to the project
            if own_workers == 0 and user["id"] not in project.get("recruiter_ids", []):
                continue
        
        # Get worker count for the trial
        trial_worker_count = await db.trial_workers.count_documents({"trial_id": trial["id"]})
        
        # Build event
        event_date = trial["date"]
        event_time = trial.get("time", "")
        
        # Create datetime string
        if event_time:
            start_datetime = f"{event_date}T{event_time}:00"
            # Assume 2 hour duration for trials
            end_hour = int(event_time.split(":")[0]) + 2
            end_time = f"{end_hour:02d}:{event_time.split(':')[1] if ':' in event_time else '00'}"
            end_datetime = f"{event_date}T{end_time}:00"
        else:
            start_datetime = f"{event_date}T09:00:00"
            end_datetime = f"{event_date}T11:00:00"
        
        events.append({
            "id": trial["id"],
            "title": f"{project['name']} - Próba",
            "start": start_datetime,
            "end": end_datetime,
            "project_id": project["id"],
            "project_name": project["name"],
            "project_client": project.get("client_name", ""),
            "location": project.get("location", ""),
            "training_location": project.get("training_location", ""),
            "notes": trial.get("notes", ""),
            "worker_count": trial_worker_count,
            "color": "#6366f1",  # Indigo
            "type": "trial"
        })
    
    return events

@api_router.get("/calendar/projects")
async def get_calendar_projects(user: dict = Depends(get_current_user)):
    """Projekt dátumok a naptárban"""
    if user["role"] == "admin":
        projects = await db.projects.find({}, {"_id": 0}).to_list(1000)
    else:
        # Toborzó csak hozzárendelt projekteket látja
        projects = await db.projects.find({
            "$or": [
                {"owner_id": user["id"]},
                {"recruiter_ids": user["id"]}
            ]
        }, {"_id": 0}).to_list(1000)
    
    events = []
    for p in projects:
        if not p.get("date"):
            continue
        
        worker_count = await db.project_workers.count_documents({"project_id": p["id"]})
        
        events.append({
            "id": p["id"],
            "title": p["name"],
            "start": f"{p['date']}T00:00:00",
            "end": f"{p['date']}T23:59:59",
            "allDay": True,
            "client_name": p.get("client_name", ""),
            "location": p.get("location", ""),
            "worker_count": worker_count,
            "is_closed": p.get("is_closed", False),
            "color": "#22c55e" if not p.get("is_closed") else "#94a3b8",  # Green or gray
            "type": "project"
        })
    
    return events

@api_router.get("/")
async def root():
    return {"message": "Dolgozó CRM API", "status": "running"}

@api_router.get("/health")
async def health():
    return {"status": "healthy"}

# ==================== FORMS API ====================

from google_sheets_helper import (
    fetch_public_sheet_data,
    auto_detect_columns,
    extract_row_data,
    get_preview_data,
    validate_column_mapping
)

@api_router.post("/forms/test-connection")
async def test_form_connection(data: dict, user: dict = Depends(get_current_user)):
    """Test Google Sheets connection and auto-detect columns"""
    sheet_url = data.get("sheet_url")
    if not sheet_url:
        raise HTTPException(status_code=400, detail="sheet_url kötelező")
    
    success, sheet_data, error = fetch_public_sheet_data(sheet_url)
    
    if not success:
        raise HTTPException(status_code=400, detail=error)
    
    # Auto-detect columns
    detected_mapping = auto_detect_columns(sheet_data)
    
    # Get preview
    preview = get_preview_data(sheet_data, detected_mapping, max_rows=3)
    
    return {
        "success": True,
        "row_count": len(sheet_data) - 1,  # Exclude header
        "headers": sheet_data[0] if sheet_data else [],
        "detected_mapping": detected_mapping,
        "preview": preview
    }

@api_router.get("/projects/{project_id}/forms", response_model=List[FormResponse])
async def get_project_forms(project_id: str, user: dict = Depends(get_current_user)):
    """Get forms for a project (filtered by permissions)"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    # Admin sees all forms
    if user["role"] == "admin":
        forms_cursor = db.project_forms.find(
            {"project_id": project_id},
            {"_id": 0}
        )
    else:
        # User sees only own + shared forms
        forms_cursor = db.project_forms.find(
            {
                "project_id": project_id,
                "$or": [
                    {"owner_id": user["id"]},
                    {"shared_with": user["id"]}
                ]
            },
            {"_id": 0}
        )
    
    forms = await forms_cursor.to_list(100)
    
    # Enrich with user names and lead counts
    result = []
    for form in forms:
        # Owner name
        owner = await db.users.find_one({"id": form["owner_id"]}, {"_id": 0})
        form["owner_name"] = owner.get("name", owner["email"]) if owner else "Ismeretlen"
        
        # Shared with names
        shared_names = []
        for user_id in form.get("shared_with", []):
            u = await db.users.find_one({"id": user_id}, {"_id": 0})
            if u:
                shared_names.append(u.get("name", u["email"]))
        form["shared_with_names"] = shared_names
        
        # Lead count
        lead_count = await db.form_leads.count_documents({
            "form_id": form["id"],
            "status": {"$in": ["unprocessed", "duplicate"]}
        })
        form["lead_count"] = lead_count
        
        result.append(FormResponse(**form))
    
    return result

@api_router.post("/projects/{project_id}/forms", response_model=FormResponse)
async def create_project_form(
    project_id: str,
    data: FormCreate,
    user: dict = Depends(get_current_user)
):
    """Create a new form for a project"""
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Projekt nem található")
    
    # Validate column mapping
    is_valid, error_msg = validate_column_mapping(data.column_mapping)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)
    
    # Test connection
    success, sheet_data, error = fetch_public_sheet_data(data.sheet_url)
    if not success:
        raise HTTPException(status_code=400, detail=f"Kapcsolódási hiba: {error}")
    
    # Create form
    form_doc = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "sheet_url": data.sheet_url,
        "name": data.name or "Google Űrlap",
        "column_mapping": data.column_mapping,
        "owner_id": user["id"],
        "shared_with": [],
        "default_category": data.default_category,
        "sync_frequency": data.sync_frequency,
        "last_synced_at": None,
        "last_row_processed": 1,  # Skip header
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.project_forms.insert_one(form_doc)
    
    # Initial sync
    await sync_form(form_doc["id"])
    
    # Return with enriched data
    owner = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    form_doc["owner_name"] = owner.get("name", owner["email"])
    form_doc["shared_with_names"] = []
    form_doc["lead_count"] = await db.form_leads.count_documents({
        "form_id": form_doc["id"],
        "status": {"$in": ["unprocessed", "duplicate"]}
    })
    
    return FormResponse(**form_doc)

async def sync_form(form_id: str):
    """Sync a form - fetch new rows from Google Sheets"""
    form = await db.project_forms.find_one({"id": form_id}, {"_id": 0})
    if not form:
        return
    
    # Fetch sheet data
    success, sheet_data, error = fetch_public_sheet_data(form["sheet_url"])
    if not success:
        logger.error(f"Form sync failed for {form_id}: {error}")
        return
    
    if len(sheet_data) <= form["last_row_processed"]:
        # No new rows
        await db.project_forms.update_one(
            {"id": form_id},
            {"$set": {"last_synced_at": datetime.now(timezone.utc).isoformat()}}
        )
        return
    
    # Process new rows
    new_rows = sheet_data[form["last_row_processed"]:]
    
    for row in new_rows:
        extracted = extract_row_data(row, form["column_mapping"])
        
        if not extracted.get("name") and not extracted.get("phone"):
            continue  # Skip empty rows
        
        phone = extracted.get("phone", "").strip()
        if not phone:
            continue
        
        # Check duplicate (only within owner's workers)
        existing_worker = await db.workers.find_one({
            "phone": phone,
            "$or": [
                {"created_by": form["owner_id"]},
                {"created_by": {"$in": form.get("shared_with", [])}}
            ]
        }, {"_id": 0})
        
        # Create lead
        lead_doc = {
            "id": str(uuid.uuid4()),
            "form_id": form_id,
            "project_id": form["project_id"],
            "name": extracted.get("name", ""),
            "phone": phone,
            "address": extracted.get("address", ""),
            "email": extracted.get("email", ""),
            "notes": extracted.get("notes", ""),
            "submitted_at": extracted.get("date", ""),
            "status": "duplicate" if existing_worker else "unprocessed",
            "duplicate_worker_id": existing_worker["id"] if existing_worker else None,
            "processed_by": None,
            "processed_at": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.form_leads.insert_one(lead_doc)
    
    # Update form
    await db.project_forms.update_one(
        {"id": form_id},
        {
            "$set": {
                "last_synced_at": datetime.now(timezone.utc).isoformat(),
                "last_row_processed": len(sheet_data)
            }
        }
    )

@api_router.post("/projects/{project_id}/forms/{form_id}/sync")
async def manual_sync_form(
    project_id: str,
    form_id: str,
    user: dict = Depends(get_current_user)
):
    """Manually sync a form"""
    form = await db.project_forms.find_one({"id": form_id}, {"_id": 0})
    if not form or form["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Űrlap nem található")
    
    # Check permission
    if user["role"] != "admin" and form["owner_id"] != user["id"] and user["id"] not in form.get("shared_with", []):
        raise HTTPException(status_code=403, detail="Nincs jogosultságod")
    
    await sync_form(form_id)
    
    return {"message": "Szinkronizálás befejezve"}

@api_router.put("/projects/{project_id}/forms/{form_id}", response_model=FormResponse)
async def update_project_form(
    project_id: str,
    form_id: str,
    data: FormUpdate,
    user: dict = Depends(get_current_user)
):
    """Update form settings (only owner or admin)"""
    form = await db.project_forms.find_one({"id": form_id}, {"_id": 0})
    if not form or form["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Űrlap nem található")
    
    # Check permission
    if user["role"] != "admin" and form["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Csak a tulajdonos vagy admin módosíthatja")
    
    update_data = {}
    if data.name is not None:
        update_data["name"] = data.name
    if data.column_mapping is not None:
        is_valid, error_msg = validate_column_mapping(data.column_mapping)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        update_data["column_mapping"] = data.column_mapping
    if data.default_category is not None:
        update_data["default_category"] = data.default_category
    if data.sync_frequency is not None:
        update_data["sync_frequency"] = data.sync_frequency
    
    if update_data:
        await db.project_forms.update_one({"id": form_id}, {"$set": update_data})
    
    updated_form = await db.project_forms.find_one({"id": form_id}, {"_id": 0})
    owner = await db.users.find_one({"id": updated_form["owner_id"]}, {"_id": 0})
    updated_form["owner_name"] = owner.get("name", owner["email"])
    updated_form["shared_with_names"] = []
    updated_form["lead_count"] = 0
    
    return FormResponse(**updated_form)

@api_router.delete("/projects/{project_id}/forms/{form_id}")
async def delete_project_form(
    project_id: str,
    form_id: str,
    user: dict = Depends(get_current_user)
):
    """Delete a form (only owner or admin)"""
    form = await db.project_forms.find_one({"id": form_id}, {"_id": 0})
    if not form or form["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Űrlap nem található")
    
    # Check permission
    if user["role"] != "admin" and form["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Csak a tulajdonos vagy admin törölheti")
    
    # Delete form and leads
    await db.project_forms.delete_one({"id": form_id})
    await db.form_leads.delete_many({"form_id": form_id})
    
    return {"message": "Űrlap törölve"}

@api_router.post("/projects/{project_id}/forms/{form_id}/share")
async def share_form(
    project_id: str,
    form_id: str,
    data: FormShareRequest,
    user: dict = Depends(require_admin)  # Only admin can share
):
    """Share form with other recruiters (admin only)"""
    form = await db.project_forms.find_one({"id": form_id}, {"_id": 0})
    if not form or form["project_id"] != project_id:
        raise HTTPException(status_code=404, detail="Űrlap nem található")
    
    # Update shared_with
    await db.project_forms.update_one(
        {"id": form_id},
        {"$set": {"shared_with": data.shared_with}}
    )
    
    return {"message": "Megosztás mentve", "shared_with": data.shared_with}

@api_router.get("/projects/{project_id}/form-leads", response_model=List[FormLeadResponse])
async def get_form_leads(project_id: str, user: dict = Depends(get_current_user)):
    """Get all unprocessed/duplicate leads for a project"""
    # Get forms user has access to
    if user["role"] == "admin":
        forms = await db.project_forms.find({"project_id": project_id}, {"_id": 0}).to_list(100)
    else:
        forms = await db.project_forms.find(
            {
                "project_id": project_id,
                "$or": [
                    {"owner_id": user["id"]},
                    {"shared_with": user["id"]}
                ]
            },
            {"_id": 0}
        ).to_list(100)
    
    form_ids = [f["id"] for f in forms]
    
    # Get leads
    leads = await db.form_leads.find(
        {
            "form_id": {"$in": form_ids},
            "status": {"$in": ["unprocessed", "duplicate"]}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Enrich duplicates
    result = []
    for lead in leads:
        if lead["status"] == "duplicate" and lead.get("duplicate_worker_id"):
            worker = await db.workers.find_one({"id": lead["duplicate_worker_id"]}, {"_id": 0})
            if worker:
                lead["duplicate_worker"] = worker
        
        lead["is_duplicate"] = (lead["status"] == "duplicate")
        result.append(FormLeadResponse(**lead))
    
    return result

@api_router.post("/form-leads/{lead_id}/resolve")
async def resolve_duplicate_lead(
    lead_id: str,
    data: FormLeadResolve,
    user: dict = Depends(get_current_user)
):
    """Resolve a duplicate lead"""
    lead = await db.form_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Jelentkező nem található")
    
    if data.action == "keep_both":
        # Create new worker from lead
        form = await db.project_forms.find_one({"id": lead["form_id"]}, {"_id": 0})
        worker_type = await db.worker_types.find_one({}, {"_id": 0})
        
        worker_doc = {
            "id": str(uuid.uuid4()),
            "name": lead["name"],
            "phone": lead["phone"],
            "address": lead["address"],
            "email": lead["email"] or "",
            "notes": lead["notes"] or "",
            "worker_type_id": worker_type["id"] if worker_type else "",
            "position": "",
            "position_experience": "",
            "category": form["default_category"],
            "experience": "",
            "global_status": "Feldolgozatlan (űrlap)",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": user["id"]
        }
        await db.workers.insert_one(worker_doc)
        
        await db.form_leads.update_one(
            {"id": lead_id},
            {"$set": {"status": "processed", "processed_by": user["id"], "processed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "Új dolgozó létrehozva", "worker_id": worker_doc["id"]}
    
    elif data.action == "keep_existing":
        # Just mark as processed (ignore)
        await db.form_leads.update_one(
            {"id": lead_id},
            {"$set": {"status": "ignored", "processed_by": user["id"], "processed_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"message": "Meglévő dolgozó megtartva"}
    
    elif data.action == "keep_new":
        # Update existing worker with new data
        if not lead.get("duplicate_worker_id"):
            raise HTTPException(status_code=400, detail="Nincs meglévő dolgozó")
        
        await db.workers.update_one(
            {"id": lead["duplicate_worker_id"]},
            {"$set": {
                "name": lead["name"],
                "address": lead["address"],
                "email": lead["email"] or "",
                "notes": lead["notes"] or "",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        await db.form_leads.update_one(
            {"id": lead_id},
            {"$set": {"status": "processed", "processed_by": user["id"], "processed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "Meglévő dolgozó frissítve"}
    
    elif data.action == "merge":
        # Merge: update only empty fields
        if not lead.get("duplicate_worker_id"):
            raise HTTPException(status_code=400, detail="Nincs meglévő dolgozó")
        
        worker = await db.workers.find_one({"id": lead["duplicate_worker_id"]}, {"_id": 0})
        if not worker:
            raise HTTPException(status_code=404, detail="Meglévő dolgozó nem található")
        
        updates = {}
        if not worker.get("address") and lead.get("address"):
            updates["address"] = lead["address"]
        if not worker.get("email") and lead.get("email"):
            updates["email"] = lead["email"]
        if not worker.get("notes") and lead.get("notes"):
            updates["notes"] = lead["notes"]
        
        if updates:
            updates["updated_at"] = datetime.now(timezone.utc).isoformat()
            await db.workers.update_one({"id": lead["duplicate_worker_id"]}, {"$set": updates})
        
        await db.form_leads.update_one(
            {"id": lead_id},
            {"$set": {"status": "processed", "processed_by": user["id"], "processed_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"message": "Adatok egyesítve", "updated_fields": list(updates.keys())}
    
    raise HTTPException(status_code=400, detail="Érvénytelen művelet")

@api_router.post("/form-leads/{lead_id}/add-to-project")
async def add_lead_to_project(lead_id: str, user: dict = Depends(get_current_user)):
    """Add lead as worker and to project"""
    lead = await db.form_leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Jelentkező nem található")
    
    # Create worker
    form = await db.project_forms.find_one({"id": lead["form_id"]}, {"_id": 0})
    worker_type = await db.worker_types.find_one({}, {"_id": 0})
    
    worker_doc = {
        "id": str(uuid.uuid4()),
        "name": lead["name"],
        "phone": lead["phone"],
        "address": lead["address"],
        "email": lead["email"] or "",
        "notes": lead["notes"] or "",
        "worker_type_id": worker_type["id"] if worker_type else "",
        "position": "",
        "position_experience": "",
        "category": form["default_category"],
        "experience": "",
        "global_status": "Feldolgozatlan (űrlap)",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": user["id"]
    }
    await db.workers.insert_one(worker_doc)
    
    # Add to project waitlist
    waitlist_doc = {
        "id": str(uuid.uuid4()),
        "project_id": lead["project_id"],
        "worker_id": worker_doc["id"],
        "trial_date": "",
        "notes": f"Űrlapról: {form.get('name', 'Google Űrlap')}",
        "added_at": datetime.now(timezone.utc).isoformat(),
        "added_by": user["id"]
    }
    await db.project_waitlist.insert_one(waitlist_doc)
    
    # Mark lead as processed
    await db.form_leads.update_one(
        {"id": lead_id},
        {"$set": {"status": "processed", "processed_by": user["id"], "processed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Dolgozó hozzáadva a várólistához", "worker_id": worker_doc["id"]}

# ==================== APP CONFIG ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
