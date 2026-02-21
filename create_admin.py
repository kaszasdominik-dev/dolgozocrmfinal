#!/usr/bin/env python3
"""
Create initial admin user for CRM4 system
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import uuid
from datetime import datetime, timezone

# MongoDB connection
mongo_url = "mongodb://localhost:27017"
db_name = "test_database"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin():
    """Create initial admin user"""
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Check if admin exists
    existing = await db.users.find_one({"email": "admin@test.com"})
    if existing:
        print("✅ Admin user already exists")
        return True
    
    # Create admin user
    admin_doc = {
        "id": str(uuid.uuid4()),
        "email": "admin@test.com",
        "password": pwd_context.hash("AdminTest123!"),
        "name": "Test Admin",
        "role": "admin",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(admin_doc)
    print("✅ Admin user created successfully")
    print(f"   Email: {admin_doc['email']}")
    print(f"   Password: AdminTest123!")
    print(f"   Role: {admin_doc['role']}")
    
    client.close()
    return True

if __name__ == "__main__":
    asyncio.run(create_admin())