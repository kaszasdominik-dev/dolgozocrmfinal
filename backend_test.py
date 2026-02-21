#!/usr/bin/env python3

import requests
import sys
from datetime import datetime
import json

class HungarianCRMAPITester:
    def __init__(self, base_url="https://team-counter-3.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    result_data = response.json() if response.text else {}
                except:
                    result_data = {"raw_response": response.text}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    result_data = response.json() if response.text else {}
                except:
                    result_data = {"error": response.text}

            self.test_results.append({
                "name": name,
                "success": success,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "data": result_data
            })
            
            return success, result_data

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": "admin@test.com", "password": "AdminTest123!"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"🔑 Token acquired for user: {response.get('user', {}).get('email')}")
            return True
        return False

    def test_counties_endpoint(self):
        """Test counties endpoint for Hungarian counties"""
        success, response = self.run_test(
            "Counties Endpoint",
            "GET", 
            "counties",
            200
        )
        if success:
            counties = response if isinstance(response, list) else []
            print(f"📍 Found {len(counties)} Hungarian counties")
            if "Budapest" in counties and "Pest" in counties:
                print("✅ Key counties (Budapest, Pest) are present")
            return True
        return False

    def test_geocoding_endpoint(self):
        """Test geocoding endpoint"""
        test_address = "Budapest, Fő utca 1"
        success, response = self.run_test(
            "Geocoding Endpoint",
            "POST",
            "geocode",
            200,
            data={"address": test_address}
        )
        if success:
            lat = response.get("latitude")
            lon = response.get("longitude") 
            county = response.get("county")
            print(f"🗺️ Geocoding result: lat={lat}, lon={lon}, county={county}")
            if lat and lon:
                print("✅ Coordinates retrieved successfully")
            return True
        return False

    def test_worker_creation_with_geocoding(self):
        """Test worker creation with address geocoding"""
        # First get worker types
        types_success, types_data = self.run_test(
            "Get Worker Types",
            "GET",
            "worker-types", 
            200
        )
        
        if not types_success or not types_data:
            print("❌ Cannot test worker creation - no worker types available")
            return False
            
        worker_type_id = types_data[0]["id"] if types_data else ""
        
        test_worker = {
            "name": "Test Worker",
            "phone": "+36301234567", 
            "worker_type_id": worker_type_id,
            "position": "Test Position",
            "category": "Felvitt dolgozók",
            "address": "Budapest, Váci utca 1",
            "email": "test@test.com"
        }
        
        success, response = self.run_test(
            "Create Worker with Address",
            "POST",
            "workers",
            200,
            data=test_worker
        )
        
        if success:
            worker_id = response.get("id")
            lat = response.get("latitude")
            lon = response.get("longitude")
            county = response.get("county")
            print(f"👤 Worker created: {worker_id}")
            print(f"🗺️ Geocoded coordinates: lat={lat}, lon={lon}, county={county}")
            
            # Clean up - delete the test worker
            if worker_id:
                self.run_test(
                    "Delete Test Worker",
                    "DELETE",
                    f"workers/{worker_id}",
                    200
                )
            return True
        return False

    def test_workers_with_location_filters(self):
        """Test workers endpoint with new location-based filters"""
        
        # Test county filter
        success1, _ = self.run_test(
            "Workers with County Filter",
            "GET",
            "workers?county=Budapest",
            200
        )
        
        # Test position filter  
        success2, _ = self.run_test(
            "Workers with Position Filter", 
            "GET",
            "workers?position_filter=engineer",
            200
        )
        
        # Test location search with coordinates and radius
        success3, _ = self.run_test(
            "Workers with Location Search",
            "GET", 
            "workers?center_lat=47.5&center_lon=19.0&radius_km=50",
            200
        )
        
        return success1 and success2 and success3

    def test_bulk_geocoding(self):
        """Test bulk geocoding functionality"""
        
        # Get geocoding statistics
        stats_success, stats_data = self.run_test(
            "Geocoding Statistics",
            "GET",
            "workers/geocode-stats", 
            200
        )
        
        if stats_success:
            total = stats_data.get("total", 0)
            geocoded = stats_data.get("geocoded", 0) 
            not_geocoded = stats_data.get("not_geocoded", 0)
            print(f"📊 Geocoding stats: {geocoded}/{total} geocoded, {not_geocoded} pending")
        
        # Note: We won't actually start bulk geocoding to avoid long running process
        # Just test that the endpoint is accessible
        return stats_success

    def run_all_tests(self):
        """Run comprehensive API test suite"""
        print("🚀 Starting Hungarian CRM Phase 2 API Tests...")
        print(f"🔗 Testing against: {self.base_url}")
        
        # Authentication
        if not self.test_login():
            print("❌ Login failed, stopping tests")
            return False
            
        # Core Phase 2 features
        test_methods = [
            self.test_counties_endpoint,
            self.test_geocoding_endpoint, 
            self.test_worker_creation_with_geocoding,
            self.test_workers_with_location_filters,
            self.test_bulk_geocoding
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ Test {test_method.__name__} failed with exception: {e}")
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"   Tests run: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {self.tests_run - self.tests_passed}")
        print(f"   Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = HungarianCRMAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())