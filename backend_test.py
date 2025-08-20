import requests
import sys
import json
import io
from datetime import datetime
from pathlib import Path

class LegacyTranslationsAPITester:
    def __init__(self, base_url="https://legacy-portal-1.preview.emergentagent.com"):
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

    def test_calculate_quote_professional(self):
        """Test quote calculation for professional service"""
        try:
            quote_data = {
                "reference": "Test Project Professional",
                "service_type": "professional",
                "translate_from": "italian",
                "translate_to": "english",
                "word_count": 500,
                "urgency": "no"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Verify pricing calculation: 500 words = 2 pages, $23.99 per page = $47.98
                expected_pages = max(1, 500 / 250)  # 2 pages
                expected_base_price = expected_pages * 23.99  # $47.98
                
                details = f"Base price: ${data['base_price']:.2f}, Expected: ${expected_base_price:.2f}"
                price_correct = abs(data['base_price'] - expected_base_price) < 0.01
                
                if not price_correct:
                    success = False
                    details += " - Price calculation incorrect"
                
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Calculate Quote - Professional", success, details)
            return success, response.json() if success else {}
            
        except Exception as e:
            self.log_test("Calculate Quote - Professional", False, str(e))
            return False, {}

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

    def test_calculate_quote_standard(self):
        """Test quote calculation for standard service"""
        try:
            quote_data = {
                "reference": "Test Project Standard",
                "service_type": "standard",
                "translate_from": "french",
                "translate_to": "english", 
                "word_count": 1000,
                "urgency": "priority"
            }
            
            response = requests.post(f"{self.api_url}/calculate-quote", json=quote_data, timeout=10)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                # Verify: 1000 words * $0.02 = $20.00 + $3.75 priority = $23.75
                expected_base = 1000 * 0.02  # $20.00
                expected_urgency = 3.75
                expected_total = expected_base + expected_urgency
                
                details = f"Total: ${data['total_price']:.2f}, Expected: ${expected_total:.2f}"
                
                price_correct = (abs(data['base_price'] - expected_base) < 0.01 and 
                               abs(data['urgency_fee'] - expected_urgency) < 0.01)
                
                if not price_correct:
                    success = False
                    details += " - Price calculation incorrect"
                    
            else:
                details = f"Status: {response.status_code}, Response: {response.text}"
            
            self.log_test("Calculate Quote - Standard", success, details)
            return success
            
        except Exception as e:
            self.log_test("Calculate Quote - Standard", False, str(e))
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

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Legacy Translations API Tests")
        print("=" * 50)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        # Run all tests
        self.test_calculate_quote_professional()
        self.test_calculate_quote_with_urgency()
        self.test_calculate_quote_standard()
        self.test_upload_text_file()
        self.test_word_count_endpoint()
        self.test_get_quotes()
        self.test_invalid_file_upload()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests passed!")
            return True
        else:
            print("⚠️  Some backend tests failed. Check details above.")
            return False

def main():
    tester = LegacyTranslationsAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())