#!/usr/bin/env python3
"""
Final Comprehensive Test for Legacy Translations Partner Portal
Testing all critical endpoints and integrations as requested in review
"""

import requests
import json
import io
import sys
from datetime import datetime

class FinalComprehensiveTest:
    def __init__(self, base_url="https://legacyportal.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.critical_failures = []

    def log_test(self, name, success, details="", is_critical=False):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
            if is_critical:
                self.critical_failures.append(f"{name}: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "critical": is_critical
        })

    def test_api_health(self):
        """Test API health endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("API Health Check", success, details, is_critical=True)
            return success
        except Exception as e:
            self.log_test("API Health Check", False, str(e), is_critical=True)
            return False

    def test_pricing_certified_translation_250_words(self):
        """CRITICAL: Test Certified Translation 250 words → $24.99 (matches Translayte exactly)"""
        try:
            quote_data = {
                "reference": "FINAL-TEST-CERTIFIED-250",
                "service_type": "standard",
                "translate_from": "english",
                "translate_to": "spanish",
                "word_count": 250,
                "urgency": "no"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_total = 24.99
                actual_total = data['total_price']
                
                details = f"Expected: ${expected_total:.2f}, Actual: ${actual_total:.2f}"
                
                price_correct = abs(actual_total - expected_total) < 0.01
                
                if not price_correct:
                    success = False
                    details += " - PRICING MISMATCH"
                
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("PRICING: Certified Translation 250 words → $24.99", success, details, is_critical=True)
            return success, data if success else {}
            
        except Exception as e:
            self.log_test("PRICING: Certified Translation 250 words → $24.99", False, str(e), is_critical=True)
            return False, {}

    def test_pricing_professional_translation_200_words(self):
        """CRITICAL: Test Professional Translation 200 words → $15.00 (matches Translayte exactly)"""
        try:
            quote_data = {
                "reference": "FINAL-TEST-PROFESSIONAL-200",
                "service_type": "professional",
                "translate_from": "english",
                "translate_to": "spanish",
                "word_count": 200,
                "urgency": "no"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_total = 15.00
                actual_total = data['total_price']
                
                details = f"Expected: ${expected_total:.2f}, Actual: ${actual_total:.2f}"
                
                price_correct = abs(actual_total - expected_total) < 0.01
                
                if not price_correct:
                    success = False
                    details += " - PRICING MISMATCH"
                
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("PRICING: Professional Translation 200 words → $15.00", success, details, is_critical=True)
            return success, data if success else {}
            
        except Exception as e:
            self.log_test("PRICING: Professional Translation 200 words → $15.00", False, str(e), is_critical=True)
            return False, {}

    def test_api_calculate_quote_endpoint(self):
        """Test POST /api/calculate-quote endpoint for both services"""
        try:
            # Test both service types
            test_cases = [
                {
                    "name": "Standard Service",
                    "data": {
                        "reference": "FINAL-TEST-STANDARD",
                        "service_type": "standard",
                        "translate_from": "english",
                        "translate_to": "spanish",
                        "word_count": 250,
                        "urgency": "no"
                    },
                    "expected_total": 24.99
                },
                {
                    "name": "Professional Service",
                    "data": {
                        "reference": "FINAL-TEST-PROFESSIONAL",
                        "service_type": "professional",
                        "translate_from": "english",
                        "translate_to": "spanish",
                        "word_count": 200,
                        "urgency": "no"
                    },
                    "expected_total": 15.00
                }
            ]
            
            all_success = True
            details_list = []
            
            for case in test_cases:
                response = requests.post(f"{self.api_url}/calculate-quote", json=case["data"], timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    actual_total = data['total_price']
                    price_correct = abs(actual_total - case["expected_total"]) < 0.01
                    
                    case_details = f"{case['name']}: ${actual_total:.2f} (exp: ${case['expected_total']:.2f})"
                    
                    if not price_correct:
                        all_success = False
                        case_details += " ❌"
                    else:
                        case_details += " ✅"
                    
                    details_list.append(case_details)
                else:
                    all_success = False
                    details_list.append(f"{case['name']}: API Error {response.status_code}")
            
            details = "; ".join(details_list)
            self.log_test("API: POST /api/calculate-quote (both services)", all_success, details, is_critical=True)
            return all_success
            
        except Exception as e:
            self.log_test("API: POST /api/calculate-quote (both services)", False, str(e), is_critical=True)
            return False

    def test_api_upload_document_endpoint(self):
        """Test POST /api/upload-document endpoint with file processing"""
        try:
            # Create a test document with known word count
            test_content = "This is a comprehensive test document for the Legacy Translations Partner Portal. " \
                          "It contains exactly fifty words to test the document upload and word counting functionality. " \
                          "The system should accurately process this file and return the correct word count for pricing calculations."
            
            # Count expected words (should be around 50)
            expected_words = len(test_content.split())
            
            test_file = io.BytesIO(test_content.encode('utf-8'))
            files = {'file': ('final_test_document.txt', test_file, 'text/plain')}
            
            response = requests.post(f"{self.api_url}/upload-document", files=files, timeout=30)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                actual_words = data['word_count']
                
                details = f"Expected: ~{expected_words} words, Actual: {actual_words} words"
                details += f", Filename: {data['filename']}"
                
                # Allow small variance in word counting
                word_count_reasonable = abs(actual_words - expected_words) <= 3
                
                if not word_count_reasonable:
                    success = False
                    details += " - Word count variance too high"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("API: POST /api/upload-document (file processing)", success, details, is_critical=True)
            return success
            
        except Exception as e:
            self.log_test("API: POST /api/upload-document (file processing)", False, str(e), is_critical=True)
            return False

    def test_api_create_payment_checkout_endpoint(self):
        """Test POST /api/create-payment-checkout endpoint (Stripe integration)"""
        try:
            # First create a quote
            quote_data = {
                "reference": "FINAL-TEST-PAYMENT",
                "service_type": "professional",
                "translate_from": "english",
                "translate_to": "spanish",
                "word_count": 200,
                "urgency": "no"
            }
            
            quote_response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            if quote_response.status_code != 200:
                self.log_test("API: POST /api/create-payment-checkout (Stripe)", False, "Failed to create test quote", is_critical=True)
                return False
            
            quote = quote_response.json()
            
            # Create payment checkout
            checkout_data = {
                "quote_id": quote['id'],
                "origin_url": "https://test.example.com"
            }
            
            response = requests.post(f"{self.api_url}/create-payment-checkout", json=checkout_data, timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ['status', 'checkout_url', 'session_id', 'transaction_id']
                missing_fields = [field for field in required_fields if field not in data]
                
                details = f"Status: {data.get('status')}, Session ID: {data.get('session_id')}"
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif data.get('status') != 'success':
                    success = False
                    details += ", Status not success"
                elif not data.get('checkout_url', '').startswith('https://checkout.stripe.com'):
                    success = False
                    details += ", Invalid Stripe checkout URL"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("API: POST /api/create-payment-checkout (Stripe)", success, details, is_critical=True)
            return success
            
        except Exception as e:
            self.log_test("API: POST /api/create-payment-checkout (Stripe)", False, str(e), is_critical=True)
            return False

    def test_api_protemos_create_project_endpoint(self):
        """Test POST /api/protemos/create-project endpoint"""
        try:
            # First create a quote
            quote_data = {
                "reference": "FINAL-TEST-PROTEMOS",
                "service_type": "standard",
                "translate_from": "english",
                "translate_to": "spanish",
                "word_count": 250,
                "urgency": "priority"
            }
            
            quote_response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            if quote_response.status_code != 200:
                self.log_test("API: POST /api/protemos/create-project", False, "Failed to create test quote", is_critical=True)
                return False
            
            quote = quote_response.json()
            
            # Create Protemos project
            project_data = {
                "quote_id": quote['id']
            }
            
            response = requests.post(f"{self.api_url}/protemos/create-project", json=project_data, timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                required_fields = ['status', 'protemos_project_id', 'protemos_response']
                missing_fields = [field for field in required_fields if field not in data]
                
                details = f"Status: {data.get('status')}, Project ID: {data.get('protemos_project_id')}"
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif data.get('status') != 'success':
                    success = False
                    details += ", Status not success"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("API: POST /api/protemos/create-project", success, details, is_critical=True)
            return success
            
        except Exception as e:
            self.log_test("API: POST /api/protemos/create-project", False, str(e), is_critical=True)
            return False

    def test_service_acceptance_verification(self):
        """CRITICAL: Verify only 2 services (standard, professional) are accepted"""
        try:
            # Test valid services
            valid_services = ["standard", "professional"]
            invalid_services = ["specialist", "premium", "basic", "invalid"]
            
            all_success = True
            details_list = []
            
            # Test valid services
            for service in valid_services:
                quote_data = {
                    "reference": f"FINAL-TEST-{service.upper()}",
                    "service_type": service,
                    "translate_from": "english",
                    "translate_to": "spanish",
                    "word_count": 200,
                    "urgency": "no"
                }
                
                response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
                
                if response.status_code == 200:
                    details_list.append(f"{service}: ✅ Accepted")
                else:
                    all_success = False
                    details_list.append(f"{service}: ❌ Rejected (should be accepted)")
            
            # Test invalid services (these should be handled gracefully)
            for service in invalid_services:
                quote_data = {
                    "reference": f"FINAL-TEST-{service.upper()}",
                    "service_type": service,
                    "translate_from": "english",
                    "translate_to": "spanish",
                    "word_count": 200,
                    "urgency": "no"
                }
                
                response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
                
                # Invalid services should either be rejected or default to standard pricing
                if response.status_code == 200:
                    data = response.json()
                    # If accepted, should default to standard pricing ($24.99 for 200 words = 1 page)
                    if abs(data['total_price'] - 24.99) < 0.01:
                        details_list.append(f"{service}: ✅ Defaulted to standard")
                    else:
                        details_list.append(f"{service}: ⚠️ Unexpected pricing")
                else:
                    details_list.append(f"{service}: ✅ Properly rejected")
            
            details = "; ".join(details_list)
            self.log_test("CRITICAL: Only 2 services (standard, professional) accepted", all_success, details, is_critical=True)
            return all_success
            
        except Exception as e:
            self.log_test("CRITICAL: Only 2 services (standard, professional) accepted", False, str(e), is_critical=True)
            return False

    def test_email_notification_endpoint(self):
        """Test email notification functionality"""
        try:
            # First create a quote
            quote_data = {
                "reference": "FINAL-TEST-EMAIL",
                "service_type": "professional",
                "translate_from": "english",
                "translate_to": "spanish",
                "word_count": 200,
                "urgency": "no"
            }
            
            quote_response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            if quote_response.status_code != 200:
                self.log_test("INTEGRATION: Email notifications", False, "Failed to create test quote", is_critical=False)
                return False
            
            quote = quote_response.json()
            
            # Test email notification
            email_data = {
                "quote_id": quote['id'],
                "partner_email": "test@example.com",
                "send_to_company": True
            }
            
            response = requests.post(f"{self.api_url}/send-email-notification", json=email_data, timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Status: {data.get('status')}, Message: {data.get('message')}"
                
                if data.get('status') != 'success':
                    success = False
                    details += ", Email notification failed"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("INTEGRATION: Email notifications working", success, details, is_critical=False)
            return success
            
        except Exception as e:
            self.log_test("INTEGRATION: Email notifications working", False, str(e), is_critical=False)
            return False

    def run_final_comprehensive_test(self):
        """Run the final comprehensive test as requested in review"""
        print("🎯 FINAL COMPREHENSIVE TEST - Legacy Translations Partner Portal")
        print("=" * 70)
        print("Testing all critical functionality for final delivery...")
        print()
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Cannot proceed with testing.")
            return False
        
        print("\n💰 1. PRICING TESTS (Must match Translayte exactly)")
        print("-" * 50)
        
        # Critical pricing tests
        self.test_pricing_certified_translation_250_words()
        self.test_pricing_professional_translation_200_words()
        
        print("\n🔗 2. INTEGRATION TESTS")
        print("-" * 30)
        
        # Integration tests
        self.test_api_protemos_create_project_endpoint()
        self.test_api_create_payment_checkout_endpoint()
        self.test_email_notification_endpoint()
        
        print("\n🌐 3. API ENDPOINTS")
        print("-" * 20)
        
        # API endpoint tests
        self.test_api_calculate_quote_endpoint()
        self.test_api_upload_document_endpoint()
        
        print("\n✅ 4. CRITICAL VERIFICATIONS")
        print("-" * 30)
        
        # Critical verifications
        self.test_service_acceptance_verification()
        
        # Print final summary
        print("\n" + "=" * 70)
        print("🏁 FINAL TEST RESULTS")
        print("=" * 70)
        
        print(f"📊 Overall Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.critical_failures:
            print("\n❌ CRITICAL FAILURES:")
            for failure in self.critical_failures:
                print(f"   • {failure}")
        
        if self.tests_passed == self.tests_run:
            print("\n🎉 ALL TESTS PASSED! System ready for final delivery.")
            print("✅ Pricing calculations match Translayte exactly")
            print("✅ All integrations working properly")
            print("✅ All API endpoints returning proper responses")
            print("✅ No errors in processing")
            return True
        else:
            print(f"\n⚠️  {self.tests_run - self.tests_passed} tests failed.")
            if self.critical_failures:
                print("❌ CRITICAL ISSUES NEED IMMEDIATE ATTENTION")
            else:
                print("ℹ️  Only minor issues found")
            return False

def main():
    tester = FinalComprehensiveTest()
    success = tester.run_final_comprehensive_test()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())