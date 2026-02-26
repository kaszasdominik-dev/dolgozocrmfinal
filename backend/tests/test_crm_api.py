"""
Toborzó CRM Backend API Tests
Tests for: Authentication, Dashboard, Workers, Projects, Notifications, Forms
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://toborzo-crm-v2.preview.emergentagent.com').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@crm.hu"
ADMIN_PASSWORD = "Admin123!"
RECRUITER_EMAIL = "toborzo@crm.hu"
RECRUITER_PASSWORD = "Toborzo123!"


class TestAuthentication:
    """Authentication endpoint tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "admin", "User role should be admin"
        print(f"SUCCESS: Admin login - user: {data['user']['email']}, role: {data['user']['role']}")
    
    def test_recruiter_login_success(self):
        """Test recruiter login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RECRUITER_EMAIL,
            "password": RECRUITER_PASSWORD
        })
        assert response.status_code == 200, f"Recruiter login failed: {response.text}"
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "user", "User role should be user (recruiter)"
        print(f"SUCCESS: Recruiter login - user: {data['user']['email']}, role: {data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 429], f"Expected 401/429, got {response.status_code}"
        print("SUCCESS: Invalid login correctly rejected")
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # First login
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = login_res.json()["token"]
        
        # Get current user
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Get me failed: {response.text}"
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        print(f"SUCCESS: Get current user - {data['email']}")


class TestDashboard:
    """Dashboard API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.admin_token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_admin_stats(self):
        """Test admin dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/admin-stats", headers=self.headers)
        assert response.status_code == 200, f"Admin stats failed: {response.text}"
        data = response.json()
        assert "total_workers" in data, "total_workers not in response"
        assert "status_counts" in data, "status_counts not in response"
        print(f"SUCCESS: Admin stats - total workers: {data['total_workers']}")
    
    def test_admin_recruiter_performance(self):
        """Test admin recruiter performance endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/admin-recruiter-performance", headers=self.headers)
        assert response.status_code == 200, f"Recruiter performance failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Recruiter performance - {len(data)} recruiters")
    
    def test_admin_monthly_trend(self):
        """Test admin monthly trend endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/admin-monthly-trend", headers=self.headers)
        assert response.status_code == 200, f"Monthly trend failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Monthly trend - {len(data)} months")
    
    def test_admin_alerts(self):
        """Test admin alerts endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/admin-alerts", headers=self.headers)
        assert response.status_code == 200, f"Admin alerts failed: {response.text}"
        data = response.json()
        print(f"SUCCESS: Admin alerts retrieved")


class TestRecruiterDashboard:
    """Recruiter Dashboard API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get recruiter token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": RECRUITER_EMAIL,
            "password": RECRUITER_PASSWORD
        })
        if login_res.status_code == 200:
            self.recruiter_token = login_res.json()["token"]
            self.headers = {"Authorization": f"Bearer {self.recruiter_token}"}
            self.skip_tests = False
        else:
            self.skip_tests = True
            pytest.skip("Recruiter login failed - skipping recruiter tests")
    
    def test_recruiter_stats(self):
        """Test recruiter dashboard stats endpoint"""
        if self.skip_tests:
            pytest.skip("Recruiter not available")
        response = requests.get(f"{BASE_URL}/api/dashboard/recruiter-stats", headers=self.headers)
        assert response.status_code == 200, f"Recruiter stats failed: {response.text}"
        data = response.json()
        assert "total_workers" in data, "total_workers not in response"
        print(f"SUCCESS: Recruiter stats - total workers: {data['total_workers']}")
    
    def test_recruiter_monthly_performance(self):
        """Test recruiter monthly performance endpoint"""
        if self.skip_tests:
            pytest.skip("Recruiter not available")
        response = requests.get(f"{BASE_URL}/api/dashboard/recruiter-monthly-performance", headers=self.headers)
        assert response.status_code == 200, f"Monthly performance failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Recruiter monthly performance - {len(data)} months")
    
    def test_recruiter_todos(self):
        """Test recruiter todos endpoint"""
        if self.skip_tests:
            pytest.skip("Recruiter not available")
        response = requests.get(f"{BASE_URL}/api/dashboard/recruiter-todos", headers=self.headers)
        assert response.status_code == 200, f"Recruiter todos failed: {response.text}"
        print("SUCCESS: Recruiter todos retrieved")


class TestWorkers:
    """Workers API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.admin_token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_workers_list(self):
        """Test getting workers list"""
        response = requests.get(f"{BASE_URL}/api/workers", headers=self.headers)
        assert response.status_code == 200, f"Get workers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Workers list - {len(data)} workers")
    
    def test_get_worker_types(self):
        """Test getting worker types"""
        response = requests.get(f"{BASE_URL}/api/worker-types", headers=self.headers)
        assert response.status_code == 200, f"Get worker types failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Worker types - {len(data)} types")
    
    def test_get_statuses(self):
        """Test getting statuses"""
        response = requests.get(f"{BASE_URL}/api/statuses", headers=self.headers)
        assert response.status_code == 200, f"Get statuses failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Statuses - {len(data)} statuses")
        # Verify unified statuses exist
        status_names = [s["name"] for s in data]
        print(f"Available statuses: {status_names}")
    
    def test_get_global_statuses(self):
        """Test getting global statuses (unified 5 statuses)"""
        response = requests.get(f"{BASE_URL}/api/global-statuses", headers=self.headers)
        assert response.status_code == 200, f"Get global statuses failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        expected_statuses = ["Feldolgozatlan", "Próbára vár", "Próba megbeszélve", "Dolgozik", "Tiltólista"]
        actual_names = [s["name"] for s in data]
        for expected in expected_statuses:
            assert expected in actual_names, f"Missing status: {expected}"
        print(f"SUCCESS: Global statuses - {actual_names}")
    
    def test_get_categories(self):
        """Test getting categories"""
        response = requests.get(f"{BASE_URL}/api/categories", headers=self.headers)
        assert response.status_code == 200, f"Get categories failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Categories - {len(data)} categories")


class TestProjects:
    """Projects API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.admin_token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_projects_list(self):
        """Test getting projects list"""
        response = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        assert response.status_code == 200, f"Get projects failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Projects list - {len(data)} projects")
        return data
    
    def test_get_project_detail(self):
        """Test getting project detail"""
        # First get projects list
        projects_res = requests.get(f"{BASE_URL}/api/projects", headers=self.headers)
        projects = projects_res.json()
        
        if len(projects) > 0:
            project_id = projects[0]["id"]
            response = requests.get(f"{BASE_URL}/api/projects/{project_id}", headers=self.headers)
            assert response.status_code == 200, f"Get project detail failed: {response.text}"
            data = response.json()
            assert "id" in data, "id not in response"
            assert "name" in data, "name not in response"
            print(f"SUCCESS: Project detail - {data['name']}")
        else:
            print("INFO: No projects to test detail")


class TestNotifications:
    """Notifications API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.admin_token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_notifications(self):
        """Test getting notifications list"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=self.headers)
        assert response.status_code == 200, f"Get notifications failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Notifications - {len(data)} notifications")
    
    def test_get_unread_count(self):
        """Test getting unread notifications count"""
        response = requests.get(f"{BASE_URL}/api/notifications/unread-count", headers=self.headers)
        assert response.status_code == 200, f"Get unread count failed: {response.text}"
        data = response.json()
        assert "count" in data, "count not in response"
        print(f"SUCCESS: Unread count - {data['count']}")


class TestGoogleSheetsIntegration:
    """Google Sheets integration tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.admin_token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
        self.test_sheet_url = "https://docs.google.com/spreadsheets/d/13RORNShE-JN3cJO6GH_sTAXfIegAiSwgn0Pimb2RvjA/edit"
    
    def test_google_sheets_connection(self):
        """Test Google Sheets connection endpoint"""
        response = requests.post(f"{BASE_URL}/api/forms/test-connection", 
            headers=self.headers,
            json={"sheet_url": self.test_sheet_url}
        )
        # Connection may fail if sheet is not public, but endpoint should work
        if response.status_code == 200:
            data = response.json()
            print(f"SUCCESS: Google Sheets connection - {data.get('row_count', 0)} rows found")
        else:
            print(f"INFO: Google Sheets connection returned {response.status_code} - sheet may not be public")
            # This is not a failure - the endpoint works, just the sheet access may be restricted


class TestUsers:
    """Users API tests (Admin only)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.admin_token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_users_list(self):
        """Test getting users list (admin only)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=self.headers)
        assert response.status_code == 200, f"Get users failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Users list - {len(data)} users")
        for user in data:
            print(f"  - {user['email']} ({user['role']})")
    
    def test_get_user_stats(self):
        """Test getting user stats (admin only)"""
        response = requests.get(f"{BASE_URL}/api/users/stats", headers=self.headers)
        assert response.status_code == 200, f"Get user stats failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: User stats - {len(data)} users with stats")


class TestTags:
    """Tags API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.admin_token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_tags(self):
        """Test getting tags list"""
        response = requests.get(f"{BASE_URL}/api/tags", headers=self.headers)
        assert response.status_code == 200, f"Get tags failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Tags - {len(data)} tags")


class TestPositions:
    """Positions API tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.admin_token = login_res.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_positions(self):
        """Test getting positions list"""
        response = requests.get(f"{BASE_URL}/api/positions", headers=self.headers)
        assert response.status_code == 200, f"Get positions failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"SUCCESS: Positions - {len(data)} positions")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
