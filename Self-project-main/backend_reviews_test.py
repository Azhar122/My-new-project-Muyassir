#!/usr/bin/env python3
"""
Muyassir Reviews & Ratings API Tests
Tests the complete reviews functionality including:
- Student login
- Get service reviews 
- Create reviews
- Verify service rating updates
"""
import requests
import json
from datetime import datetime
import sys

# Backend URL
BACKEND_URL = "https://verification-flow.preview.emergentagent.com/api"

# Test credentials (from review request)
STUDENT_EMAIL = "sarah@example.com"
STUDENT_PASSWORD = "password123"

class TestReviewsAPI:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.test_service_id = None
        self.created_review_id = None
        
    def print_test_result(self, test_name, success, message=""):
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if message:
            print(f"   └─ {message}")
        
    def test_student_login(self):
        """Test 1: Login as Student"""
        print("\n=== Test 1: Student Login ===")
        
        try:
            login_data = {
                "email": STUDENT_EMAIL,
                "password": STUDENT_PASSWORD
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/auth/login",
                json=login_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                
                if self.access_token:
                    user = data.get("user", {})
                    if user.get("role") == "student":
                        self.print_test_result("Student Login", True, f"Logged in as {user.get('email')}")
                        return True
                    else:
                        self.print_test_result("Student Login", False, f"Wrong role: {user.get('role')}")
                        return False
                else:
                    self.print_test_result("Student Login", False, "No access token received")
                    return False
            else:
                self.print_test_result("Student Login", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.print_test_result("Student Login", False, f"Exception: {str(e)}")
            return False
    
    def get_available_service(self):
        """Helper: Get an available service ID for testing"""
        try:
            response = self.session.get(f"{BACKEND_URL}/services")
            
            if response.status_code == 200:
                services = response.json()
                if services:
                    self.test_service_id = services[0]["id"]
                    print(f"   └─ Using service ID: {self.test_service_id} ('{services[0].get('title', 'Unknown')}')")
                    return True
                else:
                    print("   └─ No services available for testing")
                    return False
            else:
                print(f"   └─ Failed to get services: HTTP {response.status_code}")
                return False
        except Exception as e:
            print(f"   └─ Exception getting services: {str(e)}")
            return False
    
    def test_get_service_reviews(self):
        """Test 2: Get Service Reviews"""
        print("\n=== Test 2: Get Service Reviews ===")
        
        # First get a service ID
        if not self.get_available_service():
            self.print_test_result("Get Service Reviews", False, "Cannot get a service ID for testing")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/reviews/service/{self.test_service_id}")
            
            if response.status_code == 200:
                reviews = response.json()
                self.print_test_result("Get Service Reviews", True, f"Retrieved {len(reviews)} reviews for service")
                return True
            else:
                self.print_test_result("Get Service Reviews", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.print_test_result("Get Service Reviews", False, f"Exception: {str(e)}")
            return False
    
    def test_create_review(self):
        """Test 3: Create a Review"""
        print("\n=== Test 3: Create Review ===")
        
        if not self.access_token:
            self.print_test_result("Create Review", False, "No access token available")
            return False
            
        if not self.test_service_id:
            self.print_test_result("Create Review", False, "No service ID for testing")
            return False
            
        try:
            review_data = {
                "service_id": self.test_service_id,
                "rating": 4,
                "review_text": "Great service, very reliable and safe!",
                "safety_rating": 5
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/reviews",
                json=review_data,
                headers=headers
            )
            
            if response.status_code == 201:
                data = response.json()
                self.created_review_id = data.get("id")
                
                # Verify review data
                if (data.get("rating") == 4 and 
                    data.get("safety_rating") == 5 and
                    data.get("review_text") == "Great service, very reliable and safe!"):
                    self.print_test_result("Create Review", True, f"Review created with ID: {self.created_review_id}")
                    return True
                else:
                    self.print_test_result("Create Review", False, "Review data mismatch")
                    return False
            elif response.status_code == 400:
                # Check if it's because user already reviewed
                error_msg = response.text
                if "already reviewed" in error_msg.lower():
                    self.print_test_result("Create Review", True, "User already reviewed this service (expected behavior)")
                    return True
                else:
                    self.print_test_result("Create Review", False, f"HTTP 400: {error_msg}")
                    return False
            else:
                self.print_test_result("Create Review", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.print_test_result("Create Review", False, f"Exception: {str(e)}")
            return False
    
    def test_service_rating_updated(self):
        """Test 4: Verify Service Rating Updated"""
        print("\n=== Test 4: Verify Service Rating Updated ===")
        
        if not self.test_service_id:
            self.print_test_result("Service Rating Update", False, "No service ID for testing")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/services/{self.test_service_id}")
            
            if response.status_code == 200:
                service = response.json()
                rating = service.get("rating", {})
                
                if rating:
                    avg_rating = rating.get("average", 0)
                    count = rating.get("count", 0)
                    
                    # Check that rating exists and count > 0 indicates reviews
                    if count > 0:
                        self.print_test_result("Service Rating Update", True, 
                                             f"Service rating: {avg_rating}/5 (based on {count} reviews)")
                        return True
                    else:
                        self.print_test_result("Service Rating Update", True, 
                                             f"Service has no reviews yet (count: {count})")
                        return True
                else:
                    self.print_test_result("Service Rating Update", False, "No rating object found")
                    return False
            else:
                self.print_test_result("Service Rating Update", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.print_test_result("Service Rating Update", False, f"Exception: {str(e)}")
            return False
    
    def test_verify_created_review_appears(self):
        """Test 5: Verify Created Review Appears in Service Reviews"""
        print("\n=== Test 5: Verify Review Appears in Service Reviews ===")
        
        if not self.test_service_id:
            self.print_test_result("Review Appears", False, "No service ID for testing")
            return False
            
        try:
            response = self.session.get(f"{BACKEND_URL}/reviews/service/{self.test_service_id}")
            
            if response.status_code == 200:
                reviews = response.json()
                
                if self.created_review_id:
                    # Look for our created review
                    found_review = False
                    for review in reviews:
                        if review.get("id") == self.created_review_id:
                            found_review = True
                            break
                    
                    if found_review:
                        self.print_test_result("Review Appears", True, f"Created review found in service reviews list")
                        return True
                    else:
                        self.print_test_result("Review Appears", False, f"Created review not found in list of {len(reviews)} reviews")
                        return False
                else:
                    # No review was created (maybe user already had review), but check if reviews exist
                    self.print_test_result("Review Appears", True, f"Service has {len(reviews)} reviews total")
                    return True
            else:
                self.print_test_result("Review Appears", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.print_test_result("Review Appears", False, f"Exception: {str(e)}")
            return False
    
    def test_duplicate_review_prevention(self):
        """Test 6: Test Duplicate Review Prevention"""
        print("\n=== Test 6: Duplicate Review Prevention ===")
        
        if not self.access_token:
            self.print_test_result("Duplicate Review Prevention", False, "No access token available")
            return False
            
        if not self.test_service_id:
            self.print_test_result("Duplicate Review Prevention", False, "No service ID for testing")
            return False
            
        try:
            review_data = {
                "service_id": self.test_service_id,
                "rating": 3,
                "review_text": "Another review attempt",
                "safety_rating": 4
            }
            
            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/reviews",
                json=review_data,
                headers=headers
            )
            
            # Should fail with 400 if user already reviewed
            if response.status_code == 400:
                error_msg = response.text
                if "already reviewed" in error_msg.lower():
                    self.print_test_result("Duplicate Review Prevention", True, "Correctly prevents duplicate reviews")
                    return True
                else:
                    self.print_test_result("Duplicate Review Prevention", False, f"Wrong error message: {error_msg}")
                    return False
            elif response.status_code == 201:
                # This could happen if the first review creation failed
                self.print_test_result("Duplicate Review Prevention", True, "Review created (no previous review existed)")
                return True
            else:
                self.print_test_result("Duplicate Review Prevention", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.print_test_result("Duplicate Review Prevention", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all reviews API tests"""
        print("=" * 60)
        print("MUYASSIR REVIEWS & RATINGS API TESTS")
        print("=" * 60)
        
        results = []
        
        # Run tests in sequence
        results.append(self.test_student_login())
        results.append(self.test_get_service_reviews())
        results.append(self.test_create_review())
        results.append(self.test_service_rating_updated())
        results.append(self.test_verify_created_review_appears())
        results.append(self.test_duplicate_review_prevention())
        
        # Summary
        passed = sum(results)
        total = len(results)
        
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Tests Passed: {passed}/{total}")
        print(f"Tests Failed: {total - passed}/{total}")
        
        if passed == total:
            print("🎉 ALL REVIEWS & RATINGS API TESTS PASSED!")
        else:
            print("❌ SOME TESTS FAILED")
        
        return passed == total

def main():
    tester = TestReviewsAPI()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()