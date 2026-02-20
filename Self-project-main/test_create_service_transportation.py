#!/usr/bin/env python3
"""
Test Create Service API with Transportation Details
Tests the specific scenario from the review request
"""
import requests
import json
import sys

# Backend URL
BACKEND_URL = "https://verification-flow.preview.emergentagent.com/api"

# Test credentials
PROVIDER_EMAIL = "safetransport@example.com"
PROVIDER_PASSWORD = "password123"

class TestCreateServiceWithTransportation:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.created_service_id = None
        
    def print_test_result(self, test_name, success, message=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"   └─ {message}")
        
    def test_provider_login(self):
        """Test 1: Login as Provider"""
        print("\n=== Test 1: Provider Login ===")
        
        try:
            login_data = {
                "email": PROVIDER_EMAIL,
                "password": PROVIDER_PASSWORD
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Login Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Login Response Body: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                
                if self.access_token:
                    user = data.get("user", {})
                    if user.get("role") == "service_provider":
                        self.print_test_result("Provider Login", True, f"Logged in as {user.get('email')}")
                        return True
                    else:
                        self.print_test_result("Provider Login", False, f"Wrong role: {user.get('role')}")
                        return False
                else:
                    self.print_test_result("Provider Login", False, "No access token received")
                    return False
            else:
                self.print_test_result("Provider Login", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.print_test_result("Provider Login", False, f"Exception: {str(e)}")
            return False
    
    def test_create_service_with_transportation(self):
        """Test 2: Create Transportation Service with transportation details - Exact payload from review request"""
        print("\n=== Test 2: Create Transportation Service with Transportation Details ===")
        
        if not self.access_token:
            self.print_test_result("Create Transportation Service", False, "No access token available")
            return False
            
        try:
            # Exact payload from review request
            service_data = {
                "service_type": "transportation",
                "title": "New Test Shuttle",
                "description": "Test description",
                "category": "Daily Commute",
                "price_monthly": 450,
                "capacity": 15,
                "images": [],
                "location": {
                    "address": "123 Test Street",
                    "coordinates": {"lat": 0, "lng": 0},
                    "city": "Riyadh",
                    "university_nearby": "KSU"
                },
                "transportation": {
                    "vehicle_type": "Bus",
                    "vehicle_number": "",
                    "route": [],
                    "pickup_times": [],
                    "amenities": []
                }
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            print(f"Sending request to: {BACKEND_URL}/services")
            print(f"Headers: {headers}")
            print(f"Payload: {json.dumps(service_data, indent=2)}")
            
            response = self.session.post(
                f"{BACKEND_URL}/services",
                json=service_data,
                headers=headers
            )
            
            print(f"Response Status: {response.status_code}")
            print(f"Response Body: {response.text}")
            
            if response.status_code == 201:
                data = response.json()
                self.created_service_id = data.get("id")
                
                # Verify service data
                if (data.get("title") == "New Test Shuttle" and 
                    data.get("price_monthly") == 450 and
                    data.get("capacity") == 15 and
                    data.get("service_type") == "transportation"):
                    
                    # Check if transportation details are included
                    transportation = data.get("transportation", {})
                    if transportation.get("vehicle_type") == "Bus":
                        self.print_test_result("Create Transportation Service", True, f"Service created with ID: {self.created_service_id}")
                        return True
                    else:
                        self.print_test_result("Create Transportation Service", False, "Transportation details not properly saved")
                        return False
                else:
                    self.print_test_result("Create Transportation Service", False, "Service data mismatch")
                    return False
            else:
                self.print_test_result("Create Transportation Service", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.print_test_result("Create Transportation Service", False, f"Exception: {str(e)}")
            return False
    
    def test_verify_service_in_listings(self):
        """Test 3: Verify the service appears in listings"""
        print("\n=== Test 3: Verify Service in Provider Listings ===")
        
        if not self.access_token:
            self.print_test_result("Verify Service in Listings", False, "No access token available")
            return False
            
        try:
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.get(
                f"{BACKEND_URL}/services/provider/my-listings",
                headers=headers
            )
            
            print(f"Listings Response Status: {response.status_code}")
            if response.status_code != 200:
                print(f"Listings Response Body: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if our created service is in the list
                found_service = False
                for service in data:
                    if service.get("id") == self.created_service_id:
                        found_service = True
                        # Verify transportation details are present
                        transportation = service.get("transportation", {})
                        if transportation.get("vehicle_type") == "Bus":
                            self.print_test_result("Verify Service in Listings", True, f"Service found in listings with transportation details. Total services: {len(data)}")
                            return True
                        else:
                            self.print_test_result("Verify Service in Listings", False, "Service found but transportation details missing")
                            return False
                
                if not found_service and self.created_service_id:
                    self.print_test_result("Verify Service in Listings", False, "Newly created service not found in listings")
                    return False
                elif not self.created_service_id:
                    # No service was created, but API works
                    self.print_test_result("Verify Service in Listings", True, f"Retrieved {len(data)} services (no service to verify)")
                    return True
            else:
                self.print_test_result("Verify Service in Listings", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.print_test_result("Verify Service in Listings", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all tests for Create Service API with Transportation Details"""
        print("=" * 80)
        print("TEST: CREATE SERVICE API WITH TRANSPORTATION DETAILS")
        print("=" * 80)
        
        results = []
        
        # Run tests in sequence
        results.append(self.test_provider_login())
        results.append(self.test_create_service_with_transportation())
        results.append(self.test_verify_service_in_listings())
        
        # Summary
        passed = sum(results)
        total = len(results)
        
        print("\n" + "=" * 80)
        print("SUMMARY")
        print("=" * 80)
        print(f"Tests Passed: {passed}/{total}")
        print(f"Tests Failed: {total - passed}/{total}")
        
        if passed == total:
            print("🎉 ALL CREATE SERVICE TRANSPORTATION TESTS PASSED!")
            print("\n✅ The Create Service API works correctly with transportation details included.")
        else:
            print("❌ SOME TESTS FAILED")
            print("\n❌ The Create Service API has issues with transportation details.")
        
        return passed == total

def main():
    tester = TestCreateServiceWithTransportation()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()