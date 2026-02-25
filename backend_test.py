import requests
import sys
from datetime import datetime

class CRMStatusSyncTester:
    def __init__(self, base_url="https://worker-crm-sync.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        resp_data = response.json()
                        if isinstance(resp_data, list) and len(resp_data) > 0:
                            print(f"   📊 Found {len(resp_data)} items")
                        elif isinstance(resp_data, dict):
                            print(f"   📋 Response keys: {list(resp_data.keys())}")
                    except:
                        pass
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    try:
                        error_data = response.json()
                        print(f"   ⚠️  Error: {error_data}")
                    except:
                        print(f"   ⚠️  Raw response: {response.text[:200]}")
                self.failed_tests.append(f"{name}: Expected {expected_status}, got {response.status_code}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout (30s)")
            self.failed_tests.append(f"{name}: Timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append(f"{name}: {str(e)}")
            return False, {}

    def test_login(self, email, password):
        """Test login and get token"""
        print(f"\n🔑 Attempting login with {email}")
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"✅ Login successful, token acquired")
            return True
        print(f"❌ Login failed")
        return False

    def test_statuses_endpoint(self):
        """Test /api/statuses endpoint for unified statuses"""
        success, response = self.run_test(
            "Status List (/api/statuses)",
            "GET", 
            "api/statuses",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   📋 Found {len(response)} statuses")
            
            # Check for new unified statuses
            status_names = [s.get('name', '') for s in response]
            expected_statuses = [
                'Feldolgozatlan', 'Próbára vár', 'Próba megbeszélve', 
                'Dolgozik', 'Tiltólista', 'Kuka'
            ]
            
            print(f"   📝 Available statuses: {status_names}")
            
            missing_statuses = []
            for expected in expected_statuses:
                if expected in status_names:
                    print(f"   ✅ Found expected status: '{expected}'")
                else:
                    print(f"   ❌ Missing expected status: '{expected}'")
                    missing_statuses.append(expected)
            
            # Check that old status 'Feldolgozás alatt' is not present
            if 'Feldolgozás alatt' in status_names:
                print(f"   ❌ Old status 'Feldolgozás alatt' still exists, should be renamed to 'Feldolgozatlan'")
                self.failed_tests.append("Old status 'Feldolgozás alatt' not renamed to 'Feldolgozatlan'")
                return False
            else:
                print(f"   ✅ Old status 'Feldolgozás alatt' correctly renamed")
            
            if missing_statuses:
                self.failed_tests.append(f"Missing statuses: {missing_statuses}")
                return False
                
            return True
        return False

    def test_global_statuses_endpoint(self):
        """Test /api/global-statuses endpoint for unified global statuses"""
        success, response = self.run_test(
            "Global Status List (/api/global-statuses)",
            "GET",
            "api/global-statuses", 
            200
        )
        
        if success and isinstance(response, list):
            print(f"   📋 Found {len(response)} global statuses")
            
            status_names = [s.get('name', '') for s in response]
            expected_global_statuses = [
                'Feldolgozatlan', 'Próbára vár', 'Próba megbeszélve', 
                'Dolgozik', 'Tiltólista'
            ]
            
            print(f"   📝 Available global statuses: {status_names}")
            
            missing_global_statuses = []
            for expected in expected_global_statuses:
                if expected in status_names:
                    print(f"   ✅ Found expected global status: '{expected}'")
                else:
                    print(f"   ❌ Missing expected global status: '{expected}'")
                    missing_global_statuses.append(expected)
            
            if missing_global_statuses:
                self.failed_tests.append(f"Missing global statuses: {missing_global_statuses}")
                return False
            
            return True
        return False

    def test_sync_statuses_endpoint(self):
        """Test status synchronization endpoint"""
        success, response = self.run_test(
            "Status Synchronization (/api/sync-statuses)",
            "POST",
            "api/sync-statuses",
            200
        )
        
        if success:
            changes = response.get('changes', [])
            print(f"   🔄 Synchronization changes: {changes}")
            return True
        return False

    def test_workers_endpoint(self):
        """Test workers endpoint and check global statuses"""
        success, response = self.run_test(
            "Workers List (/api/workers)",
            "GET",
            "api/workers",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   👥 Found {len(response)} workers")
            
            # Check global status values in workers
            global_statuses = set()
            feldolgozatlan_count = 0
            
            for worker in response:
                gs = worker.get('global_status', '')
                if gs:
                    global_statuses.add(gs)
                    if gs == 'Feldolgozatlan':
                        feldolgozatlan_count += 1
            
            print(f"   📊 Unique worker global statuses found: {sorted(global_statuses)}")
            print(f"   📊 Workers with 'Feldolgozatlan' status: {feldolgozatlan_count}")
            
            # Check for old status names
            old_statuses = {'Feldolgozás alatt', 'Projektben', 'Inaktív', 'Máshol dolgozik'}
            found_old_statuses = global_statuses.intersection(old_statuses)
            
            if found_old_statuses:
                print(f"   ❌ Found old status names in worker data: {found_old_statuses}")
                self.failed_tests.append(f"Workers still have old status names: {found_old_statuses}")
                return False
            else:
                print(f"   ✅ No old status names found in worker data")
            
            return True
        return False

def main():
    """Main test function for CRM Status Synchronization"""
    print("🚀 Starting CRM Status Synchronization Tests")
    print("=" * 50)
    
    tester = CRMStatusSyncTester()
    
    # Test login with provided credentials
    if not tester.test_login("admin@crm.hu", "Admin123!"):
        print("\n❌ Login failed, cannot continue tests")
        return 1
    
    # Test backend endpoints for status synchronization
    backend_tests = [
        ("Status List Endpoint", tester.test_statuses_endpoint),
        ("Global Status List Endpoint", tester.test_global_statuses_endpoint),
        ("Status Synchronization Endpoint", tester.test_sync_statuses_endpoint),
        ("Workers Endpoint (Status Check)", tester.test_workers_endpoint)
    ]
    
    print(f"\n🔧 Running {len(backend_tests)} backend tests...")
    
    for test_name, test_func in backend_tests:
        try:
            print(f"\n📋 {test_name}")
            print("-" * (len(test_name) + 5))
            test_func()
        except Exception as e:
            print(f"❌ Test '{test_name}' failed with exception: {e}")
            tester.failed_tests.append(f"{test_name}: Exception - {str(e)}")
    
    # Print final results
    print(f"\n📊 TEST SUMMARY")
    print("=" * 30)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%" if tester.tests_run > 0 else "0%")
    
    if tester.failed_tests:
        print(f"\n❌ Failed tests ({len(tester.failed_tests)}):")
        for i, failure in enumerate(tester.failed_tests, 1):
            print(f"   {i}. {failure}")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All backend tests PASSED!")
        return 0
    else:
        print("⚠️  Some tests FAILED - check backend implementation")
        return 1

if __name__ == "__main__":
    sys.exit(main())