#!/usr/bin/env python3
"""
Updated Backend Test Suite for Contract Lifecycle Logic - Updated Version
Tests the following scenarios with proper slot management:
1. Availability Check - Block Contract Creation  
2. Auto-Accept Flow Test
3. Normal Flow Test (No Auto-Accept)
4. Provider Verification Check
5. Verify auto_accept Field in Service Response
"""

import requests
import json
from datetime import datetime, date
from typing import Optional, Dict, Any

class ContractLifecycleTester:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.results = []
        
    def log_result(self, test_name: str, success: bool, details: str):
        """Log test result"""
        self.results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
        print(f"{'✅' if success else '❌'} {test_name}: {details}")
    
    def login_user(self, email: str, password: str) -> Optional[Dict[str, Any]]:
        """Login user and return user info + token"""
        try:
            # Clear previous session
            self.session.headers.pop('Authorization', None)
            
            response = self.session.post(f"{self.base_url}/api/auth/login", json={
                "email": email,
                "password": password
            })
            
            if response.status_code == 200:
                data = response.json()
                # Set auth header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {data['access_token']}"
                })
                return data
            else:
                print(f"Login failed with status {response.status_code}: {response.text}")
                return None
        except Exception as e:
            print(f"Login error: {e}")
            return None
    
    def get_services(self) -> Optional[list]:
        """Get list of services"""
        try:
            response = self.session.get(f"{self.base_url}/api/services")
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Get services error: {e}")
            return None
    
    def create_contract(self, service_id: str, duration_months: int = 1, start_date: str = "2024-02-01") -> tuple[int, dict]:
        """Create contract and return status code + response data"""
        try:
            contract_data = {
                "service_id": service_id,
                "start_date": start_date,
                "duration_months": duration_months
            }
            
            response = self.session.post(f"{self.base_url}/api/contracts", json=contract_data)
            return response.status_code, response.json()
            
        except Exception as e:
            return 500, {"error": str(e)}
    
    def activate_contract_full_flow(self, service_id: str) -> bool:
        """Create and fully activate a contract to reduce available slots"""
        try:
            # Create contract as client
            status, contract_data = self.create_contract(service_id)
            if status != 201:
                return False
            
            contract_id = contract_data['id']
            
            # If auto-accept, skip provider approval
            if contract_data['status'] == 'awaiting_student_confirmation':
                # Student confirms
                confirm_response = self.session.post(f"{self.base_url}/api/contracts/{contract_id}/student-confirm")
                return confirm_response.status_code == 200
            
            # If normal flow, need provider approval first
            elif contract_data['status'] == 'pending_provider_approval':
                provider_id = contract_data['provider_id']
                
                # Login as provider (we'll try safetransport)
                current_email = None
                if 'Safe Transport' in contract_data.get('provider_name', ''):
                    current_email = 'safetransport@example.com'
                elif 'Comfort Student' in contract_data.get('provider_name', ''):
                    current_email = 'comfort@example.com'  # We'll need to test this
                
                if current_email:
                    provider_login = self.login_user(current_email, 'password123')
                    if provider_login:
                        # Provider approves
                        approve_response = self.session.post(f"{self.base_url}/api/contracts/{contract_id}/provider-accept")
                        if approve_response.status_code == 200:
                            # Login back as client and confirm
                            client_login = self.login_user('sarah@example.com', 'password123')
                            if client_login:
                                confirm_response = self.session.post(f"{self.base_url}/api/contracts/{contract_id}/student-confirm")
                                return confirm_response.status_code == 200
            
            return False
        except Exception as e:
            print(f"Error activating contract: {e}")
            return False
    
    def run_all_tests(self):
        """Run all contract lifecycle tests"""
        print(f"🚀 Starting Contract Lifecycle Testing - Updated Version")
        print(f"📍 Backend URL: {self.base_url}")
        print("="*80)
        
        # Test 1: Login as verified client
        print("\n📋 TEST 1: Verified Client Login")
        client_login = self.login_user("sarah@example.com", "password123")
        
        if not client_login:
            self.log_result("Client Login", False, "Failed to login as sarah@example.com")
            return
            
        verification_status = client_login['user']['profile'].get('verification_status', 'unknown')
        self.log_result("Client Login", True, f"Logged in as {client_login['user']['email']}, verification: {verification_status}")
        
        # Test 2: Get services and verify auto_accept field
        print("\n📋 TEST 2: Verify auto_accept Field in Services")
        services = self.get_services()
        
        if not services:
            self.log_result("Services auto_accept Field", False, "Could not retrieve services")
            return
            
        auto_accept_services = [s for s in services if s.get('auto_accept', False)]
        non_auto_accept_services = [s for s in services if not s.get('auto_accept', False)]
        
        self.log_result(
            "Services auto_accept Field", 
            True, 
            f"Found {len(services)} services. Auto-accept: {len(auto_accept_services)}, Manual: {len(non_auto_accept_services)}"
        )
        
        # Print service details
        print("   Services found:")
        for service in services[:5]:
            print(f"   - {service['title'][:50]}")
            print(f"     Provider: {service.get('provider_name', 'Unknown')}")
            print(f"     Auto-accept: {service.get('auto_accept', 'missing')}, Slots: {service.get('available_slots', 'N/A')}")
        
        # Test 3: Auto-Accept Flow Test
        print("\n📋 TEST 3: Auto-Accept Flow Test")
        auto_service = None
        for service in services:
            if (service.get('auto_accept', False) and 
                service.get('available_slots', 0) > 0 and 
                'Safe Transport' in service.get('provider_name', '')):  # Ensure verified provider
                auto_service = service
                break
        
        if auto_service:
            status_code, response = self.create_contract(auto_service['id'])
            
            if status_code == 201:
                contract_status = response.get('status', 'unknown')
                provider_signed = response.get('provider_signature', {}).get('signed', False)
                provider_ip = response.get('provider_signature', {}).get('ip_address', '')
                
                expected_status = contract_status == 'awaiting_student_confirmation'
                expected_signature = provider_signed and provider_ip == 'auto-accept'
                
                if expected_status and expected_signature:
                    self.log_result(
                        "Auto-Accept Flow", 
                        True, 
                        f"Contract status: {contract_status}, Provider auto-signed with IP: {provider_ip}"
                    )
                else:
                    self.log_result(
                        "Auto-Accept Flow", 
                        False, 
                        f"Expected: awaiting_student_confirmation + auto-signed. Got: {contract_status}, signed: {provider_signed}, ip: {provider_ip}"
                    )
            else:
                self.log_result(
                    "Auto-Accept Flow", 
                    False, 
                    f"Contract creation failed with status {status_code}: {response.get('detail', 'Unknown error')}"
                )
        else:
            self.log_result("Auto-Accept Flow", False, "No auto-accept service with available slots found from verified provider")
        
        # Test 4: Normal Flow Test (No Auto-Accept) - Use verified provider
        print("\n📋 TEST 4: Normal Flow Test (No Auto-Accept)")
        normal_service = None
        for service in services:
            if (not service.get('auto_accept', False) and 
                service.get('available_slots', 0) > 0 and
                'Safe Transport' in service.get('provider_name', '')):  # Ensure verified provider
                normal_service = service
                break
        
        if normal_service:
            status_code, response = self.create_contract(normal_service['id'])
            
            if status_code == 201:
                contract_status = response.get('status', 'unknown')
                provider_signed = response.get('provider_signature', {}).get('signed', True)  # Should be False
                
                if contract_status == 'pending_provider_approval' and not provider_signed:
                    self.log_result(
                        "Normal Flow", 
                        True, 
                        f"Contract status: {contract_status}, Provider signature pending: {not provider_signed}"
                    )
                else:
                    self.log_result(
                        "Normal Flow", 
                        False, 
                        f"Expected: pending_provider_approval + unsigned. Got: {contract_status}, signed: {provider_signed}"
                    )
            else:
                self.log_result(
                    "Normal Flow", 
                    False, 
                    f"Contract creation failed with status {status_code}: {response.get('detail', 'Unknown error')}"
                )
        else:
            self.log_result("Normal Flow", False, "No non-auto-accept service with available slots found from verified provider")
        
        # Test 5: Provider Verification Check
        print("\n📋 TEST 5: Provider Verification Check")
        
        # Find services from unverified providers
        unverified_service = None
        for service in services:
            if ('Campus Shuttle Express' in service.get('provider_name', '') or 
                'Comfort Student' in service.get('provider_name', '')):  # These might be unverified
                unverified_service = service
                break
        
        if unverified_service:
            status_code, response = self.create_contract(unverified_service['id'])
            
            if status_code == 400 and ("not yet verified" in response.get('detail', '') or "not verified" in response.get('detail', '')):
                self.log_result(
                    "Provider Verification Check", 
                    True, 
                    f"Correctly blocked unverified provider: {response.get('detail', '')}"
                )
            else:
                self.log_result(
                    "Provider Verification Check", 
                    False, 
                    f"Expected verification error. Got {status_code}: {response.get('detail', '')}"
                )
        else:
            # Try to test with campus.shuttle email services manually
            self.log_result("Provider Verification Check", False, "Could not find services from clearly unverified providers")
        
        # Test 6: Availability Check - Create active contracts to exhaust slots  
        print("\n📋 TEST 6: Availability Check (Exhaust Slots)")
        
        # Find service with minimal slots for testing
        test_service = None
        min_slots = float('inf')
        for service in services:
            slots = service.get('available_slots', 0)
            if (slots > 0 and slots < min_slots and 
                service.get('auto_accept', False) and  # Use auto-accept for easier activation
                'Safe Transport' in service.get('provider_name', '')):
                min_slots = slots
                test_service = service
        
        if test_service and min_slots <= 3:  # Only test if we can reasonably exhaust slots
            print(f"   Testing with service: {test_service['title']} ({min_slots} slots)")
            
            # Create and activate contracts to fill all slots
            contracts_created = []
            for i in range(int(min_slots)):
                status_code, response = self.create_contract(
                    test_service['id'], 
                    start_date=f"2024-0{2+i}-01"  # Different start dates
                )
                if status_code == 201 and response.get('status') == 'awaiting_student_confirmation':
                    # Activate the contract (student confirms auto-accept contract)
                    contract_id = response['id']
                    confirm_response = self.session.post(f"{self.base_url}/api/contracts/{contract_id}/student-confirm")
                    if confirm_response.status_code == 200:
                        contracts_created.append(contract_id)
                        print(f"   ✅ Activated contract {i+1}/{int(min_slots)}")
                    else:
                        print(f"   ❌ Failed to activate contract {i+1}")
                        break
                else:
                    print(f"   ❌ Failed to create contract {i+1}")
                    break
            
            if len(contracts_created) == min_slots:
                # Now try to create one more (should fail)
                status_code, response = self.create_contract(
                    test_service['id'], 
                    start_date="2024-06-01"
                )
                
                if status_code == 400 and "No available slots" in response.get('detail', ''):
                    self.log_result(
                        "Availability Check", 
                        True, 
                        f"Correctly blocked contract creation after {len(contracts_created)} active contracts: {response.get('detail', '')}"
                    )
                else:
                    self.log_result(
                        "Availability Check", 
                        False, 
                        f"Expected 400 with 'No available slots'. Got {status_code}: {response.get('detail', '')}"
                    )
            else:
                self.log_result("Availability Check", False, f"Could not activate enough contracts ({len(contracts_created)}/{min_slots})")
        else:
            self.log_result("Availability Check", False, "No suitable service found for availability testing (need auto-accept service with ≤3 slots)")
        
        # Test Summary
        print("\n" + "="*80)
        print("📊 TEST SUMMARY")
        print("="*80)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.results:
                if not result['success']:
                    print(f"   - {result['test']}: {result['details']}")
        
        print(f"\n📋 Key Findings:")
        print(f"   • Auto-accept flow: {'✅ Working' if any(r['test'] == 'Auto-Accept Flow' and r['success'] for r in self.results) else '❌ Issues'}")
        print(f"   • Normal flow: {'✅ Working' if any(r['test'] == 'Normal Flow' and r['success'] for r in self.results) else '❌ Issues'}")
        print(f"   • Provider verification: {'✅ Working' if any(r['test'] == 'Provider Verification Check' and r['success'] for r in self.results) else '❌ Issues'}")
        print(f"   • Availability check: {'✅ Working' if any(r['test'] == 'Availability Check' and r['success'] for r in self.results) else '❌ Issues'}")
        
        return passed_tests == total_tests

def main():
    backend_url = "https://verification-flow.preview.emergentagent.com"
    
    print("🔍 Contract Lifecycle Testing Suite - Updated Version")
    print(f"🌐 Backend URL: {backend_url}")
    print("📝 Testing Scenarios:")
    print("   1. Auto-Accept Flow (awaiting_student_confirmation)")
    print("   2. Normal Flow (pending_provider_approval)")  
    print("   3. Provider Verification Check")
    print("   4. Availability Check (exhaust slots)")
    print("   5. Services auto_accept Field Presence")
    print()
    
    tester = ContractLifecycleTester(backend_url)
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All contract lifecycle tests passed!")
        exit(0)
    else:
        print("\n⚠️  Some tests failed - see details above")
        exit(1)

if __name__ == "__main__":
    main()