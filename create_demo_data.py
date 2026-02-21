#!/usr/bin/env python3
"""
Demo adatok létrehozása a CRM-hez
Létrehoz: státuszokat, dolgozó típusokat, dolgozókat, projektet, pozíciókat, próbát
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone, timedelta
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def create_demo_data():
    # MongoDB connection
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🚀 Demo adatok létrehozása...\n")
    
    # 1. Státuszok
    print("📊 Státuszok...")
    statuses = [
        {"id": str(uuid.uuid4()), "name": "Dolgozik", "status_type": "positive", "color": "#10b981"},
        {"id": str(uuid.uuid4()), "name": "Megfelelt", "status_type": "positive", "color": "#3b82f6"},
        {"id": str(uuid.uuid4()), "name": "Nem felelt meg", "status_type": "negative", "color": "#ef4444"},
        {"id": str(uuid.uuid4()), "name": "Nem jelent meg", "status_type": "negative", "color": "#f59e0b"},
        {"id": str(uuid.uuid4()), "name": "Lemondta", "status_type": "negative", "color": "#6b7280"},
        {"id": str(uuid.uuid4()), "name": "Feldolgozás alatt", "status_type": "neutral", "color": "#8b5cf6"},
    ]
    
    for status in statuses:
        existing = await db.statuses.find_one({"name": status["name"]})
        if not existing:
            await db.statuses.insert_one(status)
            print(f"   ✅ {status['name']}")
    
    # 2. Dolgozó típusok
    print("\n👷 Dolgozó típusok...")
    worker_types = [
        {"id": str(uuid.uuid4()), "name": "Állandó dolgozó"},
        {"id": str(uuid.uuid4()), "name": "Ideiglenes"},
        {"id": str(uuid.uuid4()), "name": "Diák"},
        {"id": str(uuid.uuid4()), "name": "Nyugdíjas"},
    ]
    
    for wtype in worker_types:
        existing = await db.worker_types.find_one({"name": wtype["name"]})
        if not existing:
            await db.worker_types.insert_one(wtype)
            print(f"   ✅ {wtype['name']}")
    
    # Get IDs
    dolgozik_status = await db.statuses.find_one({"name": "Dolgozik"})
    megfelelt_status = await db.statuses.find_one({"name": "Megfelelt"})
    permanent_type = await db.worker_types.find_one({"name": "Állandó dolgozó"})
    
    # 3. Dolgozók
    print("\n👥 Dolgozók...")
    workers = [
        {"name": "Kiss Péter", "phone": "+36 30 634 2295", "position": "Gépkezelő", "email": "kiss.peter@email.hu"},
        {"name": "Nagy Anna", "phone": "+36 20 123 4567", "position": "Raktáros", "email": "nagy.anna@email.hu"},
        {"name": "Tóth László", "phone": "+36 70 987 6543", "position": "Targoncás", "email": "toth.laszlo@email.hu"},
        {"name": "Szabó Éva", "phone": "+36 30 555 8888", "position": "Csomagoló", "email": "szabo.eva@email.hu"},
        {"name": "Kovács János", "phone": "+36 20 777 9999", "position": "Operátor", "email": "kovacs.janos@email.hu"},
    ]
    
    worker_ids = []
    for worker_data in workers:
        existing = await db.workers.find_one({"phone": worker_data["phone"]})
        if not existing:
            worker_doc = {
                "id": str(uuid.uuid4()),
                "name": worker_data["name"],
                "phone": worker_data["phone"],
                "email": worker_data["email"],
                "position": worker_data["position"],
                "position_experience": "2+ év tapasztalat",
                "worker_type_id": permanent_type["id"],
                "category": "Demo dolgozók",
                "address": "Budapest",
                "experience": "Tapasztalt munkavállaló",
                "notes": "Demo adat",
                "global_status": "Aktív",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.workers.insert_one(worker_doc)
            worker_ids.append(worker_doc["id"])
            print(f"   ✅ {worker_data['name']} - {worker_data['position']}")
        else:
            worker_ids.append(existing["id"])
    
    # 4. Projekt
    print("\n📁 Projekt...")
    admin = await db.users.find_one({"role": "admin"})
    if not admin:
        print("   ⚠️  Nincs admin user! Futtasd először: python create_test_admin.py")
        return
    
    project_name = "Műanyaggyártó - Gyártósori dolgozók"
    existing_project = await db.projects.find_one({"name": project_name})
    
    if not existing_project:
        project_doc = {
            "id": str(uuid.uuid4()),
            "name": project_name,
            "date": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat().split('T')[0],
            "location": "Budapest, XVII. kerület",
            "company": "PlastTech Kft.",
            "notes": "Azonnali kezdéssel keresünk dolgozókat műanyagipari gyártósorhoz",
            "owner_id": admin["id"],
            "recruiter_ids": [admin["id"]],
            "created_at": datetime.now(timezone.utc).isoformat(),
            "workers": [],
            "positions": [],
            "trials": []
        }
        await db.projects.insert_one(project_doc)
        project_id = project_doc["id"]
        print(f"   ✅ {project_name}")
    else:
        project_id = existing_project["id"]
        print(f"   ℹ️  Projekt már létezik: {project_name}")
    
    # 5. Pozíciók
    print("\n💼 Pozíciók...")
    positions_data = [
        {
            "name": "Gépkezelő",
            "headcount": 5,
            "work_schedule": "2 műszak (6-14, 14-22)",
            "experience_required": "Minimum 1 év gyártósori tapasztalat",
            "qualifications": "Nincs különleges végzettség",
            "physical_requirements": "Állóképesség, 8-10 kg emelés",
            "position_details": "Bruttó 350.000 - 420.000 Ft/hó, cafeteria, műszakpótlék",
            "notes": "Betanítással"
        },
        {
            "name": "Csomagoló",
            "headcount": 3,
            "work_schedule": "1 műszak (7-15)",
            "experience_required": "Nem szükséges",
            "qualifications": "Nincs",
            "physical_requirements": "Max 5 kg emelés",
            "position_details": "Bruttó 280.000 - 320.000 Ft/hó",
            "notes": "Kezdőknek is megfelelő"
        },
    ]
    
    position_ids = []
    for pos_data in positions_data:
        existing_pos = await db.project_positions.find_one({
            "project_id": project_id,
            "name": pos_data["name"]
        })
        if not existing_pos:
            pos_doc = {
                "id": str(uuid.uuid4()),
                "project_id": project_id,
                **pos_data,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.project_positions.insert_one(pos_doc)
            position_ids.append(pos_doc["id"])
            print(f"   ✅ {pos_data['name']} ({pos_data['headcount']} fő)")
        else:
            position_ids.append(existing_pos["id"])
    
    # 6. Próba (Trial)
    print("\n🧪 Próba...")
    trial_date = (datetime.now(timezone.utc) + timedelta(days=3)).isoformat().split('T')[0]
    existing_trial = await db.trials.find_one({
        "project_id": project_id,
        "date": trial_date
    })
    
    if not existing_trial:
        trial_doc = {
            "id": str(uuid.uuid4()),
            "project_id": project_id,
            "date": trial_date,
            "time": "09:00",
            "notes": "Gyárlátogatás és próbamunka",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "workers": []
        }
        await db.trials.insert_one(trial_doc)
        trial_id = trial_doc["id"]
        print(f"   ✅ Próba dátum: {trial_date} 09:00")
    else:
        trial_id = existing_trial["id"]
        print(f"   ℹ️  Próba már létezik: {trial_date}")
    
    # 7. Próba pozíciók
    print("\n📋 Próba pozíciók...")
    for pos_id in position_ids:
        pos = await db.project_positions.find_one({"id": pos_id})
        existing_trial_pos = await db.trial_positions.find_one({
            "trial_id": trial_id,
            "position_id": pos_id
        })
        if not existing_trial_pos:
            trial_pos_doc = {
                "id": str(uuid.uuid4()),
                "trial_id": trial_id,
                "position_id": pos_id,
                "position_name": pos["name"],
                "needed_count": pos["headcount"]
            }
            await db.trial_positions.insert_one(trial_pos_doc)
            print(f"   ✅ {pos['name']}")
    
    # 8. Dolgozók hozzáadása próbához
    print("\n👥 Dolgozók hozzáadása próbához...")
    trial_positions = await db.trial_positions.find({"trial_id": trial_id}, {"_id": 0}).to_list(100)
    
    for i, worker_id in enumerate(worker_ids[:4]):  # Első 4 dolgozó
        worker = await db.workers.find_one({"id": worker_id})
        trial_pos = trial_positions[i % len(trial_positions)]  # Forgó pozíció hozzárendelés
        
        existing_tw = await db.trial_workers.find_one({
            "trial_id": trial_id,
            "worker_id": worker_id
        })
        
        if not existing_tw:
            trial_worker_doc = {
                "id": str(uuid.uuid4()),
                "trial_id": trial_id,
                "worker_id": worker_id,
                "position_id": trial_pos["position_id"],
                "status_id": megfelelt_status["id"] if i < 3 else dolgozik_status["id"],
                "notes": "Demo próba" if i < 3 else "Kiválóan teljesít",
                "added_at": datetime.now(timezone.utc).isoformat(),
                "added_by": admin["id"]
            }
            await db.trial_workers.insert_one(trial_worker_doc)
            print(f"   ✅ {worker['name']} → {trial_pos['position_name']}")
    
    print("\n" + "="*50)
    print("✅ Demo adatok sikeresen létrehozva!")
    print("="*50)
    print("\n📝 Most próbáld ki:")
    print("1. Jelentkezz be: admin@dolgozocrm.hu / Admin123!")
    print(f"2. Nyisd meg a projektet: {project_name}")
    print("3. Menj a 'Próbák' tabra")
    print(f"4. Kattints a 'Másolás (4)' gombra a {trial_date} próbánál")
    print("5. Válaszd ki a mezőket és másold ki az adatokat!\n")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(create_demo_data())
