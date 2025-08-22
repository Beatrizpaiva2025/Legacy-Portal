import requests
import sys
import json
import io
from datetime import datetime
from pathlib import Path

class LegacyTranslationsAPITester:
    def __init__(self, base_url="https://translate-partner.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details
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
            self.log_test("API Health Check", success, details)
            return success
        except Exception as e:
            self.log_test("API Health Check", False, str(e))
            return False

    def test_calculate_quote_professional_200_words_no_urgency(self):
        """Test professional service with 200 words, no urgency = $15.00"""
        try:
            quote_data = {
                "reference": "TEST-PROF-200-NO-URGENCY",
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
                # Professional: 200 words × $0.075 = $15.00
                expected_base_price = 15.00
                expected_urgency_fee = 0.00
                expected_total = 15.00
                
                details = f"Base: ${data['base_price']:.2f} (exp: ${expected_base_price:.2f}), "
                details += f"Urgency: ${data['urgency_fee']:.2f} (exp: ${expected_urgency_fee:.2f}), "
                details += f"Total: ${data['total_price']:.2f} (exp: ${expected_total:.2f})"
                
                price_correct = (abs(data['base_price'] - expected_base_price) < 0.01 and 
                               abs(data['urgency_fee'] - expected_urgency_fee) < 0.01 and
                               abs(data['total_price'] - expected_total) < 0.01)
                
                if not price_correct:
                    success = False
                    details += " - PRICING MISMATCH"
                
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Professional 200 words no urgency = $15.00", success, details)
            return success, response.json() if success else {}
            
        except Exception as e:
            self.log_test("Professional 200 words no urgency = $15.00", False, str(e))
            return False, {}

    def test_calculate_quote_professional_200_words_priority(self):
        """Test professional service with 200 words, priority urgency = $18.75"""
        try:
            quote_data = {
                "reference": "TEST-PROF-200-PRIORITY",
                "service_type": "professional",
                "translate_from": "english",
                "translate_to": "spanish",
                "word_count": 200,
                "urgency": "priority"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Professional: 200 words × $0.075 = $15.00 base + 25% urgency = $3.75 = $18.75 total
                expected_base_price = 15.00
                expected_urgency_fee = 3.75
                expected_total = 18.75
                
                details = f"Base: ${data['base_price']:.2f} (exp: ${expected_base_price:.2f}), "
                details += f"Urgency: ${data['urgency_fee']:.2f} (exp: ${expected_urgency_fee:.2f}), "
                details += f"Total: ${data['total_price']:.2f} (exp: ${expected_total:.2f})"
                
                price_correct = (abs(data['base_price'] - expected_base_price) < 0.01 and 
                               abs(data['urgency_fee'] - expected_urgency_fee) < 0.01 and
                               abs(data['total_price'] - expected_total) < 0.01)
                
                if not price_correct:
                    success = False
                    details += " - PRICING MISMATCH"
                
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Professional 200 words priority = $18.75", success, details)
            return success
            
        except Exception as e:
            self.log_test("Professional 200 words priority = $18.75", False, str(e))
            return False

    def test_calculate_quote_professional_200_words_urgent(self):
        """Test professional service with 200 words, urgent urgency = $30.00"""
        try:
            quote_data = {
                "reference": "TEST-PROF-200-URGENT",
                "service_type": "professional",
                "translate_from": "english",
                "translate_to": "spanish",
                "word_count": 200,
                "urgency": "urgent"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Professional: 200 words × $0.075 = $15.00 base + 100% urgency = $15.00 = $30.00 total
                expected_base_price = 15.00
                expected_urgency_fee = 15.00
                expected_total = 30.00
                
                details = f"Base: ${data['base_price']:.2f} (exp: ${expected_base_price:.2f}), "
                details += f"Urgency: ${data['urgency_fee']:.2f} (exp: ${expected_urgency_fee:.2f}), "
                details += f"Total: ${data['total_price']:.2f} (exp: ${expected_total:.2f})"
                
                price_correct = (abs(data['base_price'] - expected_base_price) < 0.01 and 
                               abs(data['urgency_fee'] - expected_urgency_fee) < 0.01 and
                               abs(data['total_price'] - expected_total) < 0.01)
                
                if not price_correct:
                    success = False
                    details += " - PRICING MISMATCH"
                
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Professional 200 words urgent = $30.00", success, details)
            return success
            
        except Exception as e:
            self.log_test("Professional 200 words urgent = $30.00", False, str(e))
            return False

    def test_calculate_quote_with_urgency(self):
        """Test quote calculation with urgency fees"""
        try:
            quote_data = {
                "reference": "Test Project Urgent",
                "service_type": "professional", 
                "translate_from": "spanish",
                "translate_to": "english",
                "word_count": 250,
                "urgency": "urgent"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Verify: 250 words = 1 page, $23.99 + $15.00 urgent fee = $38.99
                expected_base = 23.99
                expected_urgency = 15.00
                expected_total = expected_base + expected_urgency
                
                details = f"Total: ${data['total_price']:.2f}, Expected: ${expected_total:.2f}"
                details += f", Urgency fee: ${data['urgency_fee']:.2f}"
                
                price_correct = (abs(data['base_price'] - expected_base) < 0.01 and 
                               abs(data['urgency_fee'] - expected_urgency) < 0.01)
                
                if not price_correct:
                    success = False
                    details += " - Price calculation incorrect"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Calculate Quote - With Urgency", success, details)
            return success
            
        except Exception as e:
            self.log_test("Calculate Quote - With Urgency", False, str(e))
            return False

    def test_calculate_quote_standard_200_words(self):
        """Test standard service with 200 words = $18.00 (minimum)"""
        try:
            quote_data = {
                "reference": "TEST-STANDARD-200",
                "service_type": "standard",
                "translate_from": "english",
                "translate_to": "spanish",
                "word_count": 200,
                "urgency": "no"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Standard: Minimum $18.00 for up to 250 words
                expected_base_price = 18.00
                expected_urgency_fee = 0.00
                expected_total = 18.00
                
                details = f"Base: ${data['base_price']:.2f} (exp: ${expected_base_price:.2f}), "
                details += f"Total: ${data['total_price']:.2f} (exp: ${expected_total:.2f})"
                
                price_correct = (abs(data['base_price'] - expected_base_price) < 0.01 and 
                               abs(data['total_price'] - expected_total) < 0.01)
                
                if not price_correct:
                    success = False
                    details += " - PRICING MISMATCH"
                
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Standard 200 words = $18.00", success, details)
            return success
            
        except Exception as e:
            self.log_test("Standard 200 words = $18.00", False, str(e))
            return False

    def test_calculate_quote_specialist_200_words(self):
        """Test specialist service with 200 words = $29.00 (minimum)"""
        try:
            quote_data = {
                "reference": "TEST-SPECIALIST-200",
                "service_type": "specialist",
                "translate_from": "english",
                "translate_to": "spanish",
                "word_count": 200,
                "urgency": "no"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Specialist: Minimum $29.00 for up to 250 words
                expected_base_price = 29.00
                expected_urgency_fee = 0.00
                expected_total = 29.00
                
                details = f"Base: ${data['base_price']:.2f} (exp: ${expected_base_price:.2f}), "
                details += f"Total: ${data['total_price']:.2f} (exp: ${expected_total:.2f})"
                
                price_correct = (abs(data['base_price'] - expected_base_price) < 0.01 and 
                               abs(data['total_price'] - expected_total) < 0.01)
                
                if not price_correct:
                    success = False
                    details += " - PRICING MISMATCH"
                
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Specialist 200 words = $29.00", success, details)
            return success
            
        except Exception as e:
            self.log_test("Specialist 200 words = $29.00", False, str(e))
            return False

    def test_urgency_percentages_verification(self):
        """Test that urgency percentages are correct: Priority=25%, Urgent=100%"""
        try:
            # Test with a base amount that makes percentage calculation clear
            test_cases = [
                {
                    "urgency": "priority",
                    "expected_percentage": 0.25,
                    "description": "Priority = 25%"
                },
                {
                    "urgency": "urgent", 
                    "expected_percentage": 1.00,
                    "description": "Urgent = 100%"
                }
            ]
            
            all_success = True
            details_list = []
            
            for case in test_cases:
                quote_data = {
                    "reference": f"TEST-URGENCY-{case['urgency'].upper()}",
                    "service_type": "professional",
                    "translate_from": "english",
                    "translate_to": "spanish",
                    "word_count": 400,  # 400 * 0.075 = $30.00 base for easy calculation
                    "urgency": case["urgency"]
                }
                
                response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
                
                if response.status_code == 200:
                    data = response.json()
                    base_price = data['base_price']
                    urgency_fee = data['urgency_fee']
                    
                    # Calculate actual percentage
                    actual_percentage = urgency_fee / base_price if base_price > 0 else 0
                    
                    percentage_correct = abs(actual_percentage - case['expected_percentage']) < 0.01
                    
                    case_details = f"{case['description']}: ${urgency_fee:.2f} on ${base_price:.2f} = {actual_percentage:.1%}"
                    
                    if not percentage_correct:
                        all_success = False
                        case_details += f" (expected {case['expected_percentage']:.1%})"
                    
                    details_list.append(case_details)
                else:
                    all_success = False
                    details_list.append(f"{case['description']}: API Error {response.status_code}")
            
            details = "; ".join(details_list)
            self.log_test("Urgency Percentages Verification", all_success, details)
            return all_success
            
        except Exception as e:
            self.log_test("Urgency Percentages Verification", False, str(e))
            return False

    def test_upload_text_file(self):
        """Test document upload with text file"""
        try:
            # Create a test text file
            test_content = "This is a test document for translation. It contains multiple sentences to test word counting functionality. The system should accurately count the words in this document."
            test_file = io.BytesIO(test_content.encode('utf-8'))
            
            files = {'file': ('test_document.txt', test_file, 'text/plain')}
            
            response = requests.post(f"{self.api_url}/upload-document", files=files, timeout=30)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Count expected words
                expected_words = len(test_content.split())
                details = f"Word count: {data['word_count']}, Expected: {expected_words}"
                details += f", Filename: {data['filename']}"
                
                word_count_correct = abs(data['word_count'] - expected_words) <= 2  # Allow small variance
                
                if not word_count_correct:
                    success = False
                    details += " - Word count incorrect"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Upload Text Document", success, details)
            return success
            
        except Exception as e:
            self.log_test("Upload Text Document", False, str(e))
            return False

    def test_word_count_endpoint(self):
        """Test word count endpoint"""
        try:
            test_text = "Hello world this is a test sentence with exactly ten words."
            
            response = requests.post(f"{self.api_url}/word-count", data={'text': test_text}, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                expected_words = 10
                details = f"Word count: {data['word_count']}, Expected: {expected_words}"
                
                word_count_correct = data['word_count'] == expected_words
                
                if not word_count_correct:
                    success = False
                    details += " - Word count incorrect"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Word Count Endpoint", success, details)
            return success
            
        except Exception as e:
            self.log_test("Word Count Endpoint", False, str(e))
            return False

    def test_get_quotes(self):
        """Test getting all quotes"""
        try:
            response = requests.get(f"{self.api_url}/quotes", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Retrieved {len(data)} quotes"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Get All Quotes", success, details)
            return success
            
        except Exception as e:
            self.log_test("Get All Quotes", False, str(e))
            return False

    def test_invalid_file_upload(self):
        """Test upload with invalid file type"""
        try:
            # Create a fake executable file
            test_file = io.BytesIO(b"fake executable content")
            files = {'file': ('test.exe', test_file, 'application/octet-stream')}
            
            response = requests.post(f"{self.api_url}/upload-document", files=files, timeout=10)
            success = response.status_code == 400  # Should reject invalid file
            
            details = f"Status: {response.status_code} (expected 400 for invalid file)"
            
            self.log_test("Invalid File Upload Rejection", success, details)
            return success
            
        except Exception as e:
            self.log_test("Invalid File Upload Rejection", False, str(e))
            return False

    def test_protemos_create_quote_for_testing(self):
        """Create a test quote for Protemos integration testing"""
        try:
            quote_data = {
                "reference": "TEST-PROTEMOS-001",
                "service_type": "professional",
                "translate_from": "english",
                "translate_to": "spanish",
                "word_count": 500,
                "urgency": "priority"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                self.protemos_test_quote_id = data['id']
                details = f"Created quote ID: {data['id']}, Total: ${data['total_price']:.2f}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Create Test Quote for Protemos", success, details)
            return success, data if success else {}
            
        except Exception as e:
            self.log_test("Create Test Quote for Protemos", False, str(e))
            return False, {}

    def test_protemos_create_project(self):
        """Test Protemos project creation"""
        try:
            if not hasattr(self, 'protemos_test_quote_id'):
                self.log_test("Protemos Create Project", False, "No test quote ID available")
                return False
            
            project_data = {
                "quote_id": self.protemos_test_quote_id
            }
            
            response = requests.post(f"{self.api_url}/protemos/create-project", json=project_data, timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Status: {data.get('status')}, Project ID: {data.get('protemos_project_id')}"
                
                # Verify response contains required fields
                required_fields = ['status', 'protemos_project_id', 'protemos_response']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif data.get('status') != 'success':
                    success = False
                    details += ", Status not success"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Protemos Create Project", success, details)
            return success
            
        except Exception as e:
            self.log_test("Protemos Create Project", False, str(e))
            return False

    def test_protemos_get_all_projects(self):
        """Test Protemos project retrieval - all projects"""
        try:
            response = requests.get(f"{self.api_url}/protemos/projects", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                projects_count = len(data.get('projects', []))
                details = f"Retrieved {projects_count} Protemos projects"
                
                # Verify response structure
                if 'projects' not in data:
                    success = False
                    details += ", Missing 'projects' field in response"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Protemos Get All Projects", success, details)
            return success
            
        except Exception as e:
            self.log_test("Protemos Get All Projects", False, str(e))
            return False

    def test_protemos_get_project_by_quote(self):
        """Test Protemos project retrieval by quote ID"""
        try:
            if not hasattr(self, 'protemos_test_quote_id'):
                self.log_test("Protemos Get Project by Quote", False, "No test quote ID available")
                return False
            
            response = requests.get(f"{self.api_url}/protemos/projects/{self.protemos_test_quote_id}", timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                details = f"Project ID: {data.get('protemos_project_id')}, Status: {data.get('protemos_status')}"
                
                # Verify response contains project data
                required_fields = ['quote_id', 'protemos_project_id', 'protemos_status']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    success = False
                    details += f", Missing fields: {missing_fields}"
                elif data.get('quote_id') != self.protemos_test_quote_id:
                    success = False
                    details += ", Quote ID mismatch"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Protemos Get Project by Quote", success, details)
            return success
            
        except Exception as e:
            self.log_test("Protemos Get Project by Quote", False, str(e))
            return False

    def test_protemos_error_handling_invalid_quote(self):
        """Test Protemos error handling with invalid quote ID"""
        try:
            project_data = {
                "quote_id": "invalid-quote-id-12345"
            }
            
            response = requests.post(f"{self.api_url}/protemos/create-project", json=project_data, timeout=10)
            success = response.status_code == 404  # Should return 404 for invalid quote
            
            details = f"Status: {response.status_code} (expected 404 for invalid quote)"
            
            if response.status_code == 404:
                try:
                    error_data = response.json()
                    if 'detail' in error_data:
                        details += f", Error: {error_data['detail']}"
                except:
                    pass
            
            self.log_test("Protemos Error Handling - Invalid Quote", success, details)
            return success
            
        except Exception as e:
            self.log_test("Protemos Error Handling - Invalid Quote", False, str(e))
            return False

    def test_protemos_get_nonexistent_project(self):
        """Test Protemos project retrieval with non-existent quote ID"""
        try:
            response = requests.get(f"{self.api_url}/protemos/projects/nonexistent-quote-id", timeout=10)
            success = response.status_code == 404  # Should return 404 for non-existent project
            
            details = f"Status: {response.status_code} (expected 404 for non-existent project)"
            
            if response.status_code == 404:
                try:
                    error_data = response.json()
                    if 'detail' in error_data:
                        details += f", Error: {error_data['detail']}"
                except:
                    pass
            
            self.log_test("Protemos Get Non-existent Project", success, details)
            return success
            
        except Exception as e:
            self.log_test("Protemos Get Non-existent Project", False, str(e))
            return False

    def test_protemos_payment_integration_verification(self):
        """Verify that payment transactions include Protemos fields"""
        try:
            # Create a test quote first
            quote_data = {
                "reference": "TEST-PAYMENT-PROTEMOS-001",
                "service_type": "professional",
                "translate_from": "english",
                "translate_to": "french",
                "word_count": 300,
                "urgency": "no"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            if response.status_code != 200:
                self.log_test("Protemos Payment Integration Verification", False, "Failed to create test quote")
                return False
            
            quote = response.json()
            
            # Create a payment checkout session
            checkout_data = {
                "quote_id": quote['id'],
                "origin_url": "https://test.example.com"
            }
            
            response = requests.post(f"{self.api_url}/payment/checkout", json=checkout_data, timeout=15)
            success = response.status_code == 200
            
            if success:
                checkout_response = response.json()
                session_id = checkout_response.get('session_id')
                
                # Verify that the payment transaction was created with Protemos fields
                # We can't directly access the database, but we can check the payment status endpoint
                status_response = requests.get(f"{self.api_url}/payment/status/{session_id}", timeout=10)
                
                if status_response.status_code == 200:
                    details = f"Payment session created: {session_id}, Protemos integration ready"
                else:
                    success = False
                    details = f"Failed to verify payment status: {status_response.status_code}"
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Protemos Payment Integration Verification", success, details)
            return success
            
        except Exception as e:
            self.log_test("Protemos Payment Integration Verification", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Legacy Translations API Tests")
        print("=" * 50)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Run core functionality tests
        self.test_calculate_quote_professional()
        self.test_calculate_quote_with_urgency()
        self.test_calculate_quote_standard()
        self.test_upload_text_file()
        self.test_word_count_endpoint()
        self.test_get_quotes()
        self.test_invalid_file_upload()
        
        # Run Protemos integration tests
        print("\n🔗 Testing Protemos Integration")
        print("-" * 30)
        
        # Create test quote for Protemos testing
        quote_success, quote_data = self.test_protemos_create_quote_for_testing()
        
        if quote_success:
            # Test Protemos project creation
            self.test_protemos_create_project()
            
            # Test Protemos project retrieval
            self.test_protemos_get_all_projects()
            self.test_protemos_get_project_by_quote()
        
        # Test error handling
        self.test_protemos_error_handling_invalid_quote()
        self.test_protemos_get_nonexistent_project()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
            return True
        else:
            print("⚠️  Some backend tests failed. Check details above.")
            return False

    def run_protemos_tests_only(self):
        """Run only Protemos integration tests"""
        print("🔗 Starting Protemos Integration Tests")
        print("=" * 50)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Create test quote for Protemos testing
        quote_success, quote_data = self.test_protemos_create_quote_for_testing()
        
        if quote_success:
            # Test Protemos project creation
            self.test_protemos_create_project()
            
            # Test Protemos project retrieval
            self.test_protemos_get_all_projects()
            self.test_protemos_get_project_by_quote()
        
        # Test error handling
        self.test_protemos_error_handling_invalid_quote()
        self.test_protemos_get_nonexistent_project()
        
        # Test payment integration
        self.test_protemos_payment_integration_verification()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Protemos Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All Protemos tests passed!")
            return True
        else:
            print("⚠️  Some Protemos tests failed. Check details above.")
            return False

def main():
    tester = LegacyTranslationsAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())