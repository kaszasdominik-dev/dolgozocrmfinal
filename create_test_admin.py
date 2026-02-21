#!/usr/bin/env python3
"""
Teszt admin user létrehozása a CRM-hez
Email: admin@dolgozocrm.hu
Password: Admin123! (erős jelszó policy miatt)
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_admin():
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    # Check if admin exists
    existing = await db.users.find_one({"email": "admin@dolgozocrm.hu"})
    if existing:
        print("✅ Admin user már létezik!")
        print(f"   Email: admin@dolgozocrm.hu")
        print(f"   Role: {existing.get('role', 'N/A')}")
        return
    
    # Create admin user
    admin_doc = {
        "id": str(uuid.uuid4()),
        "email": "admin@dolgozocrm.hu",
        "password": pwd_context.hash("Admin123!"),
        "name": "Teszt Admin",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_doc)
    
    print("🎉 Teszt Admin sikeresen létrehozva!")
    print(f"   Email: admin@dolgozocrm.hu")
    print(f"   Jelszó: Admin123!")
    print(f"   Szerepkör: admin")
    print("")
    print("⚠️  FONTOS: Az új biztonságos jelszó policy miatt erős jelszó kell:")
    print("   - Minimum 8 karakter")
    print("   - Legalább 1 nagybetű")
    print("   - Legalább 1 kisbetű")
    print("   - Legalább 1 szám")
    print("   - Legalább 1 speciális karakter (!@#$%...)")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_admin())
