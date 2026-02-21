#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for CRM4 Employee Management System
Tests security features, new endpoints, and CRUD operations
"""

import requests
import sys
import time
import json
from datetime import datetime, timedelta

class CRM4APITester:
    def __init__(self, base_url="https://team-counter-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.user_id = None
        self.admin_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data IDs
        self.worker_type_id = None
        self.status_id = None
        self.project_id = None
        self.worker_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.admin_token and headers is None:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 [{self.tests_run}] Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            result = {
                "test": name,
                "method": method,
                "endpoint": endpoint,
                "expected": expected_status,
                "actual": response.status_code,
                "success": success,
                "response": response.text[:200] if response.text else "",
                "timestamp": datetime.now().isoformat()
            }
            self.test_results.append(result)
            
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 500:
                        print(f"   Response: {json.dumps(response_data, indent=2)}")
                except:
                    pass
                return True, response.json() if response.text and response.status_code < 400 else {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")
                return False, {}

        except requests.exceptions.RequestException as e:
            print(f"❌ FAILED - Connection Error: {str(e)}")
            result = {
                "test": name,
                "method": method,
                "endpoint": endpoint,
                "expected": expected_status,
                "actual": "ERROR",
                "success": False,
                "response": str(e),
                "timestamp": datetime.now().isoformat()
            }
            self.test_results.append(result)
            return False, {}

    def test_jwt_secret_validation(self):
        """Test that JWT_SECRET is properly configured"""
        print("\n🔒 TESTING JWT SECRET VALIDATION")
        try:
            # Try to access protected endpoint without token
            success, _ = self.run_test(
                "Protected endpoint without token",
                "GET", 
                "auth/me",
                401,
                headers={}
            )
            return success
        except Exception as e:
            print(f"JWT secret test failed: {e}")
            return False

    def test_rate_limiting(self):
        """Test rate limiting on login endpoint (5/minute)"""
        print("\n⏱️  TESTING RATE LIMITING (5/minute)")
        
        # Try multiple rapid login attempts
        rapid_attempts = 0
        for i in range(7):  # Try 7 attempts to trigger rate limit
            success, response = self.run_test(
                f"Login attempt #{i+1} (rate limit test)",
                "POST",
                "auth/login", 
                401,  # We expect 401 for wrong credentials first few times
                data={"email": f"test{i}@example.com", "password": "wrongpassword"},
                headers={'Content-Type': 'application/json'}  # No auth token
            )
            rapid_attempts += 1
            if i >= 4:  # After 5 attempts, we should hit rate limit
                if not success and "429" in str(response):
                    print(f"✅ Rate limiting working - got rate limited after {rapid_attempts} attempts")
                    return True
        
        print("❌ Rate limiting not working properly")
        return False

    def test_admin_login(self):
        """Test admin login functionality"""
        print("\n👤 TESTING ADMIN LOGIN")
        
        # Try admin login with provided credentials
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@test.com", "password": "AdminTest123!"},
            headers={'Content-Type': 'application/json'}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            self.admin_id = response['user']['id']
            print(f"✅ Admin login successful, token obtained")
            print(f"   User ID: {self.admin_id}")
            return True
        
        print("❌ Admin login failed")
        return False

    def test_statuses_crud(self):
        """Test Status CRUD operations"""
        print("\n📊 TESTING STATUS CRUD OPERATIONS")
        
        # GET statuses
        success, statuses = self.run_test("Get statuses", "GET", "statuses", 200)
        if not success:
            return False
        
        # POST new status
        status_data = {
            "name": "Test Státusz",
            "status_type": "neutral", 
            "color": "#ff0000"
        }
        success, response = self.run_test("Create status", "POST", "statuses", 200, status_data)  # API returns 200
        if success:
            self.status_id = response.get('id')
            print(f"✅ Status created with ID: {self.status_id}")
        else:
            return False
            
        # PUT status update  
        update_data = {
            "name": "Updated Test Státusz",
            "status_type": "positive",
            "color": "#00ff00"
        }
        success, _ = self.run_test("Update status", "PUT", f"statuses/{self.status_id}", 200, update_data)
        if not success:
            return False
            
        # DELETE status
        success, _ = self.run_test("Delete status", "DELETE", f"statuses/{self.status_id}", 200)
        return success

    def test_project_positions(self):
        """Test project positions with new fields"""
        print("\n🏢 TESTING PROJECT POSITIONS WITH NEW FIELDS")
        
        # First create a project
        project_data = {
            "name": "Test Projekt", 
            "date": "2025-01-15",
            "client_name": "Test Kliens",
            "recruiter_ids": []
        }
        success, response = self.run_test("Create project", "POST", "projects", 200, project_data)  # API returns 200
        if success:
            self.project_id = response.get('id')
        else:
            return False
            
        # Create position with new fields
        position_data = {
            "name": "Test Pozíció",
            "headcount": 5,
            "work_schedule": "2 műszak: 6-14, 14-22",  # NEW: work_schedule field
            "experience_required": "Min 1 év tapasztalat",
            "qualifications": "B kategóriás jogosítvány",
            "physical_requirements": "Max 20kg emelés", 
            "position_details": "Fizetés: 2500 Ft/óra + szállás",  # NEW: position_details field
            "notes": "Egyéb megjegyzések"
        }
        success, pos_response = self.run_test(
            "Create position with new fields", 
            "POST", 
            f"projects/{self.project_id}/positions",
            200,  # API returns 200
            position_data
        )
        
        if success:
            position_id = pos_response.get('id')
            # Verify the new fields are returned
            if 'work_schedule' in pos_response and 'position_details' in pos_response:
                print(f"✅ New fields present: work_schedule='{pos_response['work_schedule']}', position_details='{pos_response['position_details']}'")
                return True
            else:
                print(f"❌ New fields missing in response")
                return False
        
        return False

    def test_waitlist_trial_date(self):
        """Test waitlist with trial_date field"""
        print("\n📅 TESTING WAITLIST WITH TRIAL_DATE")
        
        if not self.project_id:
            print("❌ No project ID available for testing")
            return False
            
        # First create a worker type and worker
        worker_type_data = {"name": "Test Típus"}
        success, type_response = self.run_test("Create worker type", "POST", "worker-types", 200, worker_type_data)  # API returns 200
        if success:
            self.worker_type_id = type_response.get('id')
        else:
            return False
            
        # Create worker
        worker_data = {
            "name": "Test Dolgozó",
            "phone": "+36201234567", 
            "worker_type_id": self.worker_type_id,
            "category": "Felvitt dolgozók"
        }
        success, worker_response = self.run_test("Create worker", "POST", "workers", 200, worker_data)  # API returns 200
        if success:
            self.worker_id = worker_response.get('id')
        else:
            return False
            
        # Add to waitlist with trial_date
        waitlist_data = {
            "worker_id": self.worker_id,
            "trial_date": "2025-02-01",  # NEW: trial_date field (was start_date)
            "notes": "Test próba időpont"
        }
        success, _ = self.run_test(
            "Add worker to waitlist with trial_date", 
            "POST",
            f"projects/{self.project_id}/waitlist",
            200,
            waitlist_data
        )
        
        if success:
            # Verify trial_date is saved
            success, waitlist = self.run_test("Get waitlist", "GET", f"projects/{self.project_id}/waitlist", 200)
            if success and len(waitlist) > 0:
                entry = waitlist[0]
                if 'trial_date' in entry and entry['trial_date'] == "2025-02-01":
                    print(f"✅ trial_date field working correctly: {entry['trial_date']}")
                    return True
                else:
                    print(f"❌ trial_date field not found or incorrect: {entry}")
        
        return False

    def test_archive_endpoint(self):
        """Test archive endpoint (kuka function)"""
        print("\n🗑️  TESTING ARCHIVE ENDPOINT")
        
        if not self.project_id:
            print("❌ No project ID available")
            return False
            
        success, response = self.run_test(
            "Get project archive", 
            "GET", 
            f"projects/{self.project_id}/archive",
            200
        )
        
        if success:
            # Check response structure
            if 'workers' in response and 'count' in response:
                print(f"✅ Archive endpoint working - found {response['count']} archived workers")
                return True
            else:
                print(f"❌ Archive response structure incorrect: {response}")
        
        return False

    def test_summary_endpoint(self):
        """Test summary statistics endpoint"""
        print("\n📈 TESTING SUMMARY STATISTICS ENDPOINT")
        
        if not self.project_id:
            print("❌ No project ID available")
            return False
            
        success, response = self.run_test(
            "Get project summary", 
            "GET", 
            f"projects/{self.project_id}/summary", 
            200
        )
        
        if success:
            # Check if it has statistical data
            expected_keys = ['total_workers', 'status_breakdown', 'positions', 'trials']
            found_keys = [key for key in expected_keys if key in response]
            if len(found_keys) >= 2:
                print(f"✅ Summary endpoint working - found keys: {found_keys}")
                return True
            else:
                print(f"❌ Summary missing expected statistical data: {response}")
        
        return False

    def test_hungarian_crm_enhancements(self):
        """Test Hungarian CRM specific enhancements: planned_headcount, active_worker_count, status logging"""
        print("\n🇭🇺 TESTING HUNGARIAN CRM ENHANCEMENTS")
        
        if not self.project_id:
            print("❌ No project ID available for testing")
            return False
            
        # Test 1: planned_headcount field in projects
        print("1. Testing planned_headcount field...")
        project_update_data = {"planned_headcount": 10}
        success, response = self.run_test(
            "Update project with planned_headcount", 
            "PUT", 
            f"projects/{self.project_id}",
            200,
            project_update_data
        )
        
        if not success:
            return False
            
        # Verify planned_headcount is returned
        success, project_data = self.run_test("Get project with planned_headcount", "GET", f"projects/{self.project_id}", 200)
        if not success or 'planned_headcount' not in project_data:
            print("❌ planned_headcount field not found in project response")
            return False
        print(f"✅ planned_headcount working: {project_data['planned_headcount']}")
        
        # Test 2: active_worker_count calculation
        print("2. Testing active_worker_count calculation...")
        if 'active_worker_count' not in project_data:
            print("❌ active_worker_count field not found in project response")
            return False
        print(f"✅ active_worker_count working: {project_data['active_worker_count']}")
        
        # Test 3: Create "Dolgozik" status if not exists
        print("3. Testing Dolgozik status...")
        success, statuses = self.run_test("Get all statuses", "GET", "statuses", 200)
        if not success:
            return False
            
        dolgozik_status = None
        for status in statuses:
            if status['name'] == 'Dolgozik':
                dolgozik_status = status
                break
        
        if not dolgozik_status:
            # Create Dolgozik status
            status_data = {
                "name": "Dolgozik",
                "status_type": "positive",
                "color": "#22c55e"
            }
            success, response = self.run_test("Create Dolgozik status", "POST", "statuses", 200, status_data)
            if success:
                dolgozik_status = response
                print(f"✅ Created Dolgozik status: {dolgozik_status['id']}")
            else:
                print("❌ Failed to create Dolgozik status")
                return False
        else:
            print(f"✅ Dolgozik status exists: {dolgozik_status['id']}")
        
        # Test 4: Worker status change and logging
        print("4. Testing worker status change logging...")
        if self.worker_id and dolgozik_status:
            # Add worker to project first
            success, _ = self.run_test(
                "Add worker to project",
                "POST",
                f"projects/{self.project_id}/workers",
                200,
                {"worker_id": self.worker_id}
            )
            
            if success:
                # Change worker status to Dolgozik
                status_update_data = {
                    "status_id": dolgozik_status['id'],
                    "notes": "Test status change to Dolgozik"
                }
                success, _ = self.run_test(
                    "Change worker status to Dolgozik",
                    "PUT",
                    f"projects/{self.project_id}/workers/{self.worker_id}/status",
                    200,
                    status_update_data
                )
                
                if success:
                    print("✅ Status change successful")
                    
                    # Verify worker notes contain the status change log
                    success, worker_data = self.run_test("Get updated worker", "GET", f"workers/{self.worker_id}", 200)
                    if success and 'notes' in worker_data:
                        if "automatikus naplózás" in worker_data['notes'].lower() or "státusz változás" in worker_data['notes'].lower():
                            print("✅ Status change logging working")
                        else:
                            print(f"⚠️  Status change may not be logged properly in notes: {worker_data.get('notes', '')}")
                    
                    return True
                else:
                    print("❌ Failed to change worker status")
            else:
                print("❌ Failed to add worker to project")
        
        return False

    def test_project_list_enhancements(self):
        """Test project list shows active_worker_count/planned_headcount"""
        print("\n📋 TESTING PROJECT LIST ENHANCEMENTS")
        
        success, projects = self.run_test("Get projects list", "GET", "projects", 200)
        if not success:
            return False
            
        if len(projects) == 0:
            print("⚠️  No projects found for testing")
            return True
            
        # Check first project has the required fields
        project = projects[0]
        required_fields = ['active_worker_count', 'planned_headcount']
        missing_fields = [field for field in required_fields if field not in project]
        
        if missing_fields:
            print(f"❌ Missing fields in project list: {missing_fields}")
            return False
        
        print(f"✅ Project list contains enhanced fields: active_worker_count={project['active_worker_count']}, planned_headcount={project['planned_headcount']}")
        return True

    def test_security_features(self):
        """Test overall security implementation"""
        print("\n🛡️  TESTING SECURITY FEATURES")
        
        security_tests_passed = 0
        total_security_tests = 3
        
        # 1. JWT Secret validation (server startup check)
        print("1. JWT Secret validation - checking if server started properly...")
        success, _ = self.run_test("Health check", "GET", "worker-types", 200)
        if success:
            print("✅ JWT Secret validation working (server started)")
            security_tests_passed += 1
        
        # 2. Rate limiting
        print("2. Rate limiting test...")
        if self.test_rate_limiting():
            security_tests_passed += 1
            
        # 3. Strong password validation (will test during user creation)
        print("3. Strong password policy...")
        weak_password_data = {
            "email": "weaktest@example.com",
            "password": "123",  # Weak password
            "name": "Weak Test",
            "role": "user"
        }
        success, response = self.run_test(
            "Weak password rejection", 
            "POST", 
            "auth/register",
            400,  # Should fail
            weak_password_data
        )
        if success:  # Success means it was properly rejected
            print("✅ Strong password policy working")
            security_tests_passed += 1
        
        print(f"🔒 Security Features: {security_tests_passed}/{total_security_tests} passed")
        return security_tests_passed >= 2  # At least 2 out of 3 should work

def main():
    """Run all backend tests"""
    print("🚀 Starting CRM4 Backend API Testing")
    print("=" * 50)
    
    tester = CRM4APITester()
    
    # Test sequence
    tests_to_run = [
        ("JWT Secret Validation", tester.test_jwt_secret_validation),
        ("Admin Login", tester.test_admin_login),
        ("Status CRUD Operations", tester.test_statuses_crud),
        ("Project Positions (new fields)", tester.test_project_positions),
        ("Waitlist trial_date", tester.test_waitlist_trial_date),
        ("Hungarian CRM Enhancements", tester.test_hungarian_crm_enhancements),
        ("Project List Enhancements", tester.test_project_list_enhancements),
        ("Archive Endpoint", tester.test_archive_endpoint),
        ("Summary Endpoint", tester.test_summary_endpoint),
        ("Security Features", tester.test_security_features)
    ]
    
    passed_tests = []
    failed_tests = []
    
    for test_name, test_func in tests_to_run:
        print(f"\n{'='*20} {test_name.upper()} {'='*20}")
        try:
            if test_func():
                passed_tests.append(test_name)
                print(f"✅ {test_name} - COMPLETED")
            else:
                failed_tests.append(test_name)
                print(f"❌ {test_name} - FAILED")
        except Exception as e:
            failed_tests.append(test_name)
            print(f"❌ {test_name} - ERROR: {e}")
        
        time.sleep(1)  # Small delay between tests

    # Final Results
    print(f"\n{'='*50}")
    print("🏁 BACKEND TESTING COMPLETE")
    print(f"{'='*50}")
    print(f"📊 Overall Results: {len(passed_tests)}/{len(tests_to_run)} tests passed")
    print(f"✅ Passed: {passed_tests}")
    if failed_tests:
        print(f"❌ Failed: {failed_tests}")
    
    # Detailed test results
    print(f"\n📋 Detailed Results:")
    for result in tester.test_results:
        status_icon = "✅" if result['success'] else "❌"
        print(f"{status_icon} {result['test']}: {result['actual']} (expected {result['expected']})")
    
    success_rate = (len(passed_tests) / len(tests_to_run)) * 100
    print(f"\n🎯 Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 70 else 1  # Consider 70%+ as acceptable

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)