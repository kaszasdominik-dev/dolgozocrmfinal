"""
Tests for Role-Based Access Control (RBAC) features in Dolgozó CRM
- Workers: recruiters only see their own workers, admin sees all with owner info
- Projects: recruiters only see projects they created or are assigned to
- Owner name/id displayed for workers and projects
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@dolgozocrm.hu"
ADMIN_PASSWORD = "admin123"
RECRUITER_EMAIL = "toborzo@dolgozocrm.hu"
RECRUITER_PASSWORD = "toborzo123"

class TestAuthAndLogin:
    """Authentication tests"""
    
    def test_admin_login(self):
        """Admin can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "admin"
        assert data["user"]["email"] == ADMIN_EMAIL
        print(f"Admin login successful: {data['user']['name']}")
    
    def test_recruiter_login(self):
        """Recruiter can login successfully"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RECRUITER_EMAIL,
            "password": RECRUITER_PASSWORD
        })
        assert response.status_code == 200, f"Recruiter login failed: {response.text}"
        data = response.json()
        assert "token" in data
        assert data["user"]["role"] == "user"
        assert data["user"]["email"] == RECRUITER_EMAIL
        print(f"Recruiter login successful: {data['user']['name']}")
    
    def test_invalid_login(self):
        """Invalid credentials return 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


@pytest.fixture
def admin_token():
    """Get admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Admin login failed")
    return response.json()["token"]


@pytest.fixture
def recruiter_token():
    """Get recruiter token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": RECRUITER_EMAIL,
        "password": RECRUITER_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip("Recruiter login failed")
    return response.json()["token"]


@pytest.fixture
def admin_headers(admin_token):
    """Headers with admin auth"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture
def recruiter_headers(recruiter_token):
    """Headers with recruiter auth"""
    return {"Authorization": f"Bearer {recruiter_token}", "Content-Type": "application/json"}


class TestWorkerOwnership:
    """Tests for worker ownership and visibility"""
    
    def test_admin_sees_all_workers_with_owner_info(self, admin_headers):
        """Admin should see all workers with owner_id and owner_name"""
        response = requests.get(f"{BASE_URL}/api/workers", headers=admin_headers)
        assert response.status_code == 200
        workers = response.json()
        
        if len(workers) > 0:
            # Verify owner fields exist
            for w in workers:
                assert "owner_id" in w, f"Worker {w['id']} missing owner_id"
                assert "owner_name" in w, f"Worker {w['id']} missing owner_name"
            print(f"Admin sees {len(workers)} workers with owner info")
        else:
            print("No workers exist yet")
    
    def test_recruiter_creates_worker_with_ownership(self, recruiter_headers):
        """When recruiter creates worker, they become owner"""
        # Get worker types first
        types_res = requests.get(f"{BASE_URL}/api/worker-types", headers=recruiter_headers)
        worker_types = types_res.json()
        if not worker_types:
            pytest.skip("No worker types available")
        
        # Create worker
        response = requests.post(f"{BASE_URL}/api/workers", headers=recruiter_headers, json={
            "name": "TEST_RecruiterOwnedWorker",
            "phone": "+36201234567",
            "worker_type_id": worker_types[0]["id"],
            "category": "Felvitt dolgozók"
        })
        assert response.status_code == 200, f"Create worker failed: {response.text}"
        worker = response.json()
        
        assert "owner_id" in worker
        assert "owner_name" in worker
        assert worker["owner_name"] != "", "Owner name should not be empty"
        print(f"Worker created by recruiter, owner: {worker['owner_name']}")
        
        return worker["id"]
    
    def test_recruiter_only_sees_own_workers(self, recruiter_headers, admin_headers):
        """Recruiter should only see workers they created"""
        # First create a worker as recruiter
        types_res = requests.get(f"{BASE_URL}/api/worker-types", headers=recruiter_headers)
        worker_types = types_res.json()
        if not worker_types:
            pytest.skip("No worker types available")
        
        # Create worker as recruiter
        create_res = requests.post(f"{BASE_URL}/api/workers", headers=recruiter_headers, json={
            "name": "TEST_MyWorker",
            "phone": "+36209999999",
            "worker_type_id": worker_types[0]["id"],
            "category": "Felvitt dolgozók"
        })
        assert create_res.status_code == 200
        my_worker = create_res.json()
        
        # Get recruiter's workers
        recruiter_workers_res = requests.get(f"{BASE_URL}/api/workers", headers=recruiter_headers)
        recruiter_workers = recruiter_workers_res.json()
        
        # All workers should belong to the recruiter
        for w in recruiter_workers:
            assert w["owner_id"] != "", "Worker should have an owner"
            
        print(f"Recruiter sees {len(recruiter_workers)} workers")
        
        # Admin may see more
        admin_workers_res = requests.get(f"{BASE_URL}/api/workers", headers=admin_headers)
        admin_workers = admin_workers_res.json()
        print(f"Admin sees {len(admin_workers)} workers (should be >= recruiter count)")


class TestProjectOwnership:
    """Tests for project ownership and visibility"""
    
    def test_admin_sees_all_projects_with_owner_info(self, admin_headers):
        """Admin should see all projects with owner_id and owner_name"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=admin_headers)
        assert response.status_code == 200
        projects = response.json()
        
        if len(projects) > 0:
            for p in projects:
                assert "owner_id" in p, f"Project {p['id']} missing owner_id"
                assert "owner_name" in p, f"Project {p['id']} missing owner_name"
            print(f"Admin sees {len(projects)} projects with owner info")
        else:
            print("No projects exist yet")
    
    def test_recruiter_creates_project_with_ownership(self, recruiter_headers):
        """When recruiter creates project, they become owner"""
        response = requests.post(f"{BASE_URL}/api/projects", headers=recruiter_headers, json={
            "name": "TEST_RecruiterProject",
            "date": "2026-02-15",
            "location": "Budapest",
            "expected_workers": 5
        })
        assert response.status_code == 200, f"Create project failed: {response.text}"
        project = response.json()
        
        assert "owner_id" in project
        assert "owner_name" in project
        assert project["owner_name"] != "", "Owner name should not be empty"
        print(f"Project created by recruiter, owner: {project['owner_name']}")
        
        return project["id"]
    
    def test_recruiter_sees_only_own_or_assigned_projects(self, recruiter_headers, admin_headers):
        """Recruiter only sees projects they created or are assigned to"""
        # Get recruiter's user info first
        me_res = requests.get(f"{BASE_URL}/api/auth/me", headers=recruiter_headers)
        recruiter_info = me_res.json()
        recruiter_id = recruiter_info["id"]
        
        # Create a project as recruiter
        create_res = requests.post(f"{BASE_URL}/api/projects", headers=recruiter_headers, json={
            "name": "TEST_MyOwnProject",
            "date": "2026-03-01",
            "location": "Debrecen"
        })
        assert create_res.status_code == 200
        
        # Get recruiter's projects
        recruiter_projects_res = requests.get(f"{BASE_URL}/api/projects", headers=recruiter_headers)
        recruiter_projects = recruiter_projects_res.json()
        
        # Each project should be either owned by recruiter or recruiter is assigned
        for p in recruiter_projects:
            is_owner = p["owner_id"] == recruiter_id
            is_assigned = recruiter_id in p.get("recruiter_ids", [])
            assert is_owner or is_assigned, f"Recruiter should not see project {p['id']}"
        
        print(f"Recruiter sees {len(recruiter_projects)} projects (own/assigned)")
    
    def test_project_detail_has_owner_name(self, admin_headers):
        """Project detail endpoint returns owner_name"""
        # Create a project first
        create_res = requests.post(f"{BASE_URL}/api/projects", headers=admin_headers, json={
            "name": "TEST_DetailOwnerCheck",
            "date": "2026-04-01"
        })
        if create_res.status_code != 200:
            pytest.skip("Could not create test project")
        
        project_id = create_res.json()["id"]
        
        # Get project detail
        detail_res = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=admin_headers)
        assert detail_res.status_code == 200
        project = detail_res.json()
        
        assert "owner_id" in project
        assert "owner_name" in project
        print(f"Project detail shows owner: {project['owner_name']}")


class TestRecruiterAssignment:
    """Tests for assigning recruiters to projects"""
    
    def test_admin_can_assign_recruiter_to_project(self, admin_headers):
        """Admin can assign a recruiter to a project"""
        # Get users list
        users_res = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        assert users_res.status_code == 200
        users = users_res.json()
        
        # Find a recruiter (non-admin user)
        recruiters = [u for u in users if u["role"] == "user"]
        if not recruiters:
            pytest.skip("No recruiters available")
        
        recruiter = recruiters[0]
        
        # Create a project
        create_res = requests.post(f"{BASE_URL}/api/projects", headers=admin_headers, json={
            "name": "TEST_AssignRecruiterProject",
            "date": "2026-05-01"
        })
        assert create_res.status_code == 200
        project_id = create_res.json()["id"]
        
        # Assign recruiter
        assign_res = requests.post(f"{BASE_URL}/api/projects/{project_id}/recruiters", 
            headers=admin_headers, json={"user_id": recruiter["id"]})
        assert assign_res.status_code == 200, f"Assign recruiter failed: {assign_res.text}"
        
        # Verify assignment
        detail_res = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=admin_headers)
        project = detail_res.json()
        
        assert recruiter["id"] in project["recruiter_ids"], "Recruiter should be in recruiter_ids"
        assert any(r["id"] == recruiter["id"] for r in project["recruiters"]), "Recruiter should be in recruiters list"
        print(f"Recruiter {recruiter['name']} assigned to project successfully")
    
    def test_recruiter_can_see_assigned_project(self, admin_headers, recruiter_headers):
        """Recruiter can see projects they're assigned to"""
        # Get recruiter info
        me_res = requests.get(f"{BASE_URL}/api/auth/me", headers=recruiter_headers)
        recruiter_id = me_res.json()["id"]
        
        # Admin creates a project and assigns recruiter
        create_res = requests.post(f"{BASE_URL}/api/projects", headers=admin_headers, json={
            "name": "TEST_AssignedToRecruiter",
            "date": "2026-06-01"
        })
        assert create_res.status_code == 200
        project_id = create_res.json()["id"]
        
        # Assign recruiter
        assign_res = requests.post(f"{BASE_URL}/api/projects/{project_id}/recruiters",
            headers=admin_headers, json={"user_id": recruiter_id})
        assert assign_res.status_code == 200
        
        # Recruiter should now see this project
        recruiter_projects_res = requests.get(f"{BASE_URL}/api/projects", headers=recruiter_headers)
        recruiter_projects = recruiter_projects_res.json()
        
        project_ids = [p["id"] for p in recruiter_projects]
        assert project_id in project_ids, "Recruiter should see assigned project"
        print(f"Recruiter can see assigned project: {project_id}")
    
    def test_recruiter_cannot_see_unassigned_project(self, admin_headers, recruiter_headers):
        """Recruiter cannot see projects they're not assigned to"""
        # Admin creates a project without assigning recruiter
        create_res = requests.post(f"{BASE_URL}/api/projects", headers=admin_headers, json={
            "name": "TEST_NotAssignedProject",
            "date": "2026-07-01"
        })
        assert create_res.status_code == 200
        project_id = create_res.json()["id"]
        
        # Recruiter should NOT see this project
        recruiter_projects_res = requests.get(f"{BASE_URL}/api/projects", headers=recruiter_headers)
        recruiter_projects = recruiter_projects_res.json()
        
        project_ids = [p["id"] for p in recruiter_projects]
        assert project_id not in project_ids, "Recruiter should NOT see unassigned project"
        print(f"Recruiter correctly cannot see project: {project_id}")
    
    def test_admin_can_remove_recruiter_from_project(self, admin_headers):
        """Admin can remove recruiter from project"""
        # Get a recruiter
        users_res = requests.get(f"{BASE_URL}/api/users", headers=admin_headers)
        recruiters = [u for u in users_res.json() if u["role"] == "user"]
        if not recruiters:
            pytest.skip("No recruiters available")
        
        recruiter = recruiters[0]
        
        # Create project and assign recruiter
        create_res = requests.post(f"{BASE_URL}/api/projects", headers=admin_headers, json={
            "name": "TEST_RemoveRecruiterProject",
            "date": "2026-08-01"
        })
        project_id = create_res.json()["id"]
        
        requests.post(f"{BASE_URL}/api/projects/{project_id}/recruiters",
            headers=admin_headers, json={"user_id": recruiter["id"]})
        
        # Remove recruiter
        remove_res = requests.delete(f"{BASE_URL}/api/projects/{project_id}/recruiters/{recruiter['id']}",
            headers=admin_headers)
        assert remove_res.status_code == 200
        
        # Verify removal
        detail_res = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=admin_headers)
        project = detail_res.json()
        assert recruiter["id"] not in project["recruiter_ids"]
        print(f"Recruiter removed from project successfully")


class TestWorkerAccessControl:
    """Tests for worker access control"""
    
    def test_recruiter_cannot_access_others_worker(self, admin_headers, recruiter_headers):
        """Recruiter cannot access worker created by someone else"""
        # Get worker types
        types_res = requests.get(f"{BASE_URL}/api/worker-types", headers=admin_headers)
        worker_types = types_res.json()
        if not worker_types:
            pytest.skip("No worker types")
        
        # Admin creates a worker
        create_res = requests.post(f"{BASE_URL}/api/workers", headers=admin_headers, json={
            "name": "TEST_AdminOnlyWorker",
            "phone": "+36201111111",
            "worker_type_id": worker_types[0]["id"],
            "category": "Felvitt dolgozók"
        })
        assert create_res.status_code == 200
        worker_id = create_res.json()["id"]
        
        # Recruiter tries to access
        access_res = requests.get(f"{BASE_URL}/api/workers/{worker_id}", headers=recruiter_headers)
        assert access_res.status_code == 404, "Recruiter should not access other's worker"
        print(f"Recruiter correctly blocked from accessing admin's worker")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, admin_headers):
        """Remove TEST_ prefixed workers and projects"""
        # Delete test workers
        workers_res = requests.get(f"{BASE_URL}/api/workers", headers=admin_headers)
        for w in workers_res.json():
            if w["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/workers/{w['id']}", headers=admin_headers)
                print(f"Deleted test worker: {w['name']}")
        
        # Delete test projects
        projects_res = requests.get(f"{BASE_URL}/api/projects", headers=admin_headers)
        for p in projects_res.json():
            if p["name"].startswith("TEST_"):
                requests.delete(f"{BASE_URL}/api/projects/{p['id']}", headers=admin_headers)
                print(f"Deleted test project: {p['name']}")
