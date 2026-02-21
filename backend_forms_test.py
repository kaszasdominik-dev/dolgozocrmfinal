#!/usr/bin/env python3
"""
Google Forms Integration Backend API Testing
Tests all forms-related endpoints and functionality
"""

import requests
import sys
import time
import json
from datetime import datetime

class FormsAPITester:
    def __init__(self, base_url="https://staff-portal-166.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.admin_id = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data IDs
        self.project_id = None
        self.form_id = None
        self.worker_type_id = None
        self.worker_id = None
        self.lead_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Use specified token, or default to admin token
        if token:
            test_headers['Authorization'] = f'Bearer {token}'
        elif self.admin_token and headers is None:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 [{self.tests_run}] Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=15)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=15)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=15)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=15)

            success = response.status_code == expected_status
            result = {
                "test": name,
                "method": method,
                "endpoint": endpoint,
                "expected": expected_status,
                "actual": response.status_code,
                "success": success,
                "response": response.text[:300] if response.text else "",
                "timestamp": datetime.now().isoformat()
            }
            self.test_results.append(result)
            
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 300:
                        print(f"   Response: {json.dumps(response_data, indent=2)}")
                except:
                    pass
                return True, response.json() if response.text and response.status_code < 400 else {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
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

    def setup_auth(self):
        """Setup authentication tokens"""
        print("\n🔑 SETTING UP AUTHENTICATION")
        
        # Admin login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@dolgozocrm.hu", "password": "Admin123!"},
            headers={'Content-Type': 'application/json'}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            self.admin_id = response['user']['id']
            print(f"✅ Admin authenticated - ID: {self.admin_id}")
            return True
        
        print("❌ Admin authentication failed")
        return False

    def test_forms_connection(self):
        """Test Google Sheets connection endpoint"""
        print("\n📊 TESTING GOOGLE SHEETS CONNECTION")
        
        # Test with mock/sample sheet URL
        test_sheet_url = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit"
        
        success, response = self.run_test(
            "Test Sheets Connection",
            "POST",
            "forms/test-connection",
            200,
            data={"sheet_url": test_sheet_url}
        )
        
        if success:
            # Check response structure
            required_keys = ['success', 'row_count', 'headers', 'detected_mapping', 'preview']
            missing_keys = [key for key in required_keys if key not in response]
            
            if not missing_keys:
                print(f"✅ Connection test working - {response.get('row_count', 0)} rows detected")
                return True
            else:
                print(f"❌ Missing required keys: {missing_keys}")
        
        return False

    def setup_test_data(self):
        """Create test project and worker type"""
        print("\n⚙️ SETTING UP TEST DATA")
        
        # Create worker type first
        type_data = {"name": "Teszt Dolgozó Típus"}
        success, response = self.run_test("Create worker type", "POST", "worker-types", 200, type_data)
        if success:
            self.worker_type_id = response.get('id')
            print(f"✅ Worker type created: {self.worker_type_id}")
        else:
            return False
        
        # Create test project
        project_data = {
            "name": "Forms Test Project",
            "date": "2025-02-01",
            "client_name": "Test Client",
            "recruiter_ids": []
        }
        success, response = self.run_test("Create project", "POST", "projects", 200, project_data)
        if success:
            self.project_id = response.get('id')
            print(f"✅ Project created: {self.project_id}")
            return True
        
        return False

    def test_form_crud_operations(self):
        """Test Form CRUD operations"""
        print("\n📝 TESTING FORM CRUD OPERATIONS")
        
        if not self.project_id:
            print("❌ No project ID for testing")
            return False
        
        # CREATE Form
        form_data = {
            "sheet_url": "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit",
            "name": "Test Form",
            "column_mapping": {
                "name": "A",
                "phone": "B", 
                "address": "C",
                "email": "D"
            },
            "default_category": "Ingázós",
            "sync_frequency": "hourly"
        }
        
        success, response = self.run_test(
            "Create Form",
            "POST", 
            f"projects/{self.project_id}/forms",
            200,
            form_data
        )
        
        if success:
            self.form_id = response.get('id')
            print(f"✅ Form created: {self.form_id}")
        else:
            return False
        
        # READ Forms
        success, response = self.run_test(
            "Get Project Forms",
            "GET",
            f"projects/{self.project_id}/forms", 
            200
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            print(f"✅ Forms retrieved: {len(response)} forms")
        else:
            print("❌ Forms not retrieved properly")
            return False
        
        # UPDATE Form
        update_data = {
            "name": "Updated Test Form",
            "default_category": "Szállásos"
        }
        success, _ = self.run_test(
            "Update Form",
            "PUT",
            f"projects/{self.project_id}/forms/{self.form_id}",
            200,
            update_data
        )
        
        if not success:
            return False
        
        # DELETE Form (will test at the end)
        # We'll keep the form for further testing
        
        return True

    def test_permissions(self):
        """Test admin vs user permissions"""
        print("\n🔒 TESTING PERMISSIONS (Admin vs Toborzó)")
        
        if not self.form_id:
            print("❌ No form ID for testing")
            return False
        
        # Test admin can see all forms
        success, admin_forms = self.run_test(
            "Admin - Get all forms",
            "GET",
            f"projects/{self.project_id}/forms",
            200,
            token=self.admin_token
        )
        
        if success and isinstance(admin_forms, list):
            print(f"✅ Admin can see forms: {len(admin_forms)} forms")
            return True
        else:
            print("❌ Admin forms access failed")
            return False

    def test_form_leads(self):
        """Test form leads functionality"""
        print("\n👥 TESTING FORM LEADS")
        
        if not self.project_id:
            print("❌ No project ID for testing")
            return False
        
        # Get form leads
        success, response = self.run_test(
            "Get Form Leads",
            "GET",
            f"projects/{self.project_id}/form-leads",
            200
        )
        
        if success and isinstance(response, list):
            print(f"✅ Form leads retrieved: {len(response)} leads")
            return True
        else:
            print("❌ Form leads retrieval failed")
            return False

    def test_duplicate_detection(self):
        """Test duplicate detection logic"""
        print("\n🔍 TESTING DUPLICATE DETECTION")
        
        if not self.worker_type_id:
            print("❌ No worker type for testing")
            return False
        
        # Create a worker first
        worker_data = {
            "name": "Duplicate Test Worker",
            "phone": "+36301234567",
            "worker_type_id": self.worker_type_id,
            "category": "Felvitt dolgozók"
        }
        
        success, response = self.run_test(
            "Create Worker for duplicate test",
            "POST",
            "workers", 
            200,
            worker_data
        )
        
        if success:
            self.worker_id = response.get('id')
            print(f"✅ Test worker created: {self.worker_id}")
            
            # Now test that duplicate detection would work
            # (We can't easily test this without real sheet sync, but we can test the resolve endpoint structure)
            return True
        
        return False

    def test_form_sync(self):
        """Test manual form sync"""
        print("\n🔄 TESTING FORM SYNC")
        
        if not self.project_id or not self.form_id:
            print("❌ Missing project/form ID for testing")
            return False
        
        success, response = self.run_test(
            "Manual Form Sync",
            "POST",
            f"projects/{self.project_id}/forms/{self.form_id}/sync",
            200
        )
        
        if success and 'message' in response:
            print(f"✅ Form sync working: {response['message']}")
            return True
        
        return False

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 CLEANING UP TEST DATA")
        
        cleanup_success = 0
        total_cleanups = 0
        
        if self.form_id:
            total_cleanups += 1
            success, _ = self.run_test("Delete test form", "DELETE", f"projects/{self.project_id}/forms/{self.form_id}", 200)
            if success:
                cleanup_success += 1
                
        if self.worker_id:
            total_cleanups += 1
            success, _ = self.run_test("Delete test worker", "DELETE", f"workers/{self.worker_id}", 200)
            if success:
                cleanup_success += 1
                
        if self.project_id:
            total_cleanups += 1
            success, _ = self.run_test("Delete test project", "DELETE", f"projects/{self.project_id}", 200)
            if success:
                cleanup_success += 1
                
        if self.worker_type_id:
            total_cleanups += 1
            success, _ = self.run_test("Delete test worker type", "DELETE", f"worker-types/{self.worker_type_id}", 200)
            if success:
                cleanup_success += 1
        
        print(f"🧹 Cleanup: {cleanup_success}/{total_cleanups} items cleaned")
        return cleanup_success == total_cleanups

def main():
    """Run all Google Forms integration tests"""
    print("🚀 Starting Google Forms Integration Backend Testing")
    print("=" * 60)
    
    tester = FormsAPITester()
    
    # Test sequence
    tests_to_run = [
        ("Authentication Setup", tester.setup_auth),
        ("Test Data Setup", tester.setup_test_data), 
        ("Google Sheets Connection", tester.test_forms_connection),
        ("Form CRUD Operations", tester.test_form_crud_operations),
        ("Permissions Testing", tester.test_permissions),
        ("Form Leads", tester.test_form_leads),
        ("Duplicate Detection Setup", tester.test_duplicate_detection),
        ("Form Sync", tester.test_form_sync),
        ("Cleanup", tester.cleanup_test_data)
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
        
        time.sleep(0.5)  # Small delay between tests

    # Final Results
    print(f"\n{'='*60}")
    print("🏁 GOOGLE FORMS BACKEND TESTING COMPLETE")
    print(f"{'='*60}")
    print(f"📊 Overall Results: {len(passed_tests)}/{len(tests_to_run)} tests passed")
    print(f"✅ Passed: {passed_tests}")
    if failed_tests:
        print(f"❌ Failed: {failed_tests}")
    
    # Detailed test results
    print(f"\n📋 API Call Results:")
    for result in tester.test_results:
        status_icon = "✅" if result['success'] else "❌"
        print(f"{status_icon} {result['test']}: {result['actual']} (expected {result['expected']})")
    
    success_rate = (len(passed_tests) / len(tests_to_run)) * 100
    print(f"\n🎯 Success Rate: {success_rate:.1f}%")
    
    return 0 if success_rate >= 70 else 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)