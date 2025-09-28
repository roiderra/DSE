#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Forex Trading Checklist
Tests all CRUD operations for trading setups
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, List

# Use the frontend environment URL for testing
BASE_URL = "https://trading-compass-19.preview.emergentagent.com/api"

class ForexTradingAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.created_setup_ids = []
        self.test_results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }
    
    def log_result(self, test_name: str, success: bool, message: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        
        if success:
            self.test_results["passed"] += 1
        else:
            self.test_results["failed"] += 1
            self.test_results["errors"].append(f"{test_name}: {message}")
    
    def create_sample_trading_setup(self, name: str = "EUR/USD Long Setup") -> Dict[str, Any]:
        """Create sample trading setup data with realistic forex data"""
        return {
            "name": name,
            "direction": {
                "pdArraysMarked": True,
                "biasFrame": "daily",
                "biasType": "bullish",
                "arrayInteraction": "bullish_rejection",
                "sweepExpected": False,
                "finalOutcome": "bullish",
                "completed": True
            },
            "stage": {
                "atPDArray": True,
                "stopsRun": True,
                "displacementOccurred": True,
                "mssOrFvgCut": False,
                "timeframesAligned": True,
                "completed": True
            },
            "entry": {
                "swingPointIdentified": True,
                "stopRunConfirmed": True,
                "pdaRejectionConfirmed": True,
                "fibonacciApplied": True,
                "oteMet": True,
                "entryDefined": True,
                "slTpSet": True,
                "rrAcceptable": True,
                "completed": True
            }
        }
    
    def test_api_health(self):
        """Test if API is accessible"""
        try:
            response = self.session.get(f"{self.base_url}/")
            if response.status_code == 200:
                data = response.json()
                self.log_result("API Health Check", True, f"API Version: {data.get('version', 'Unknown')}")
                return True
            else:
                self.log_result("API Health Check", False, f"Status: {response.status_code}")
                return False
        except Exception as e:
            self.log_result("API Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_create_trading_setup(self) -> str:
        """Test POST /api/setups - Create new trading setup"""
        try:
            setup_data = self.create_sample_trading_setup("GBP/USD Bullish Analysis")
            response = self.session.post(
                f"{self.base_url}/setups",
                json=setup_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                setup_id = data.get("id")
                if setup_id:
                    self.created_setup_ids.append(setup_id)
                    self.log_result("Create Trading Setup", True, f"Created setup with ID: {setup_id}")
                    return setup_id
                else:
                    self.log_result("Create Trading Setup", False, "No ID returned in response")
                    return None
            else:
                self.log_result("Create Trading Setup", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
        except Exception as e:
            self.log_result("Create Trading Setup", False, f"Error: {str(e)}")
            return None
    
    def test_get_all_setups(self):
        """Test GET /api/setups - Get all trading setups"""
        try:
            response = self.session.get(f"{self.base_url}/setups")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_result("Get All Setups", True, f"Retrieved {len(data)} setups")
                    return data
                else:
                    self.log_result("Get All Setups", False, "Response is not a list")
                    return None
            else:
                self.log_result("Get All Setups", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
        except Exception as e:
            self.log_result("Get All Setups", False, f"Error: {str(e)}")
            return None
    
    def test_get_specific_setup(self, setup_id: str):
        """Test GET /api/setups/{setup_id} - Get specific setup"""
        try:
            response = self.session.get(f"{self.base_url}/setups/{setup_id}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == setup_id:
                    self.log_result("Get Specific Setup", True, f"Retrieved setup: {data.get('name', 'Unknown')}")
                    return data
                else:
                    self.log_result("Get Specific Setup", False, "ID mismatch in response")
                    return None
            elif response.status_code == 404:
                self.log_result("Get Specific Setup", False, "Setup not found (404)")
                return None
            else:
                self.log_result("Get Specific Setup", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
        except Exception as e:
            self.log_result("Get Specific Setup", False, f"Error: {str(e)}")
            return None
    
    def test_update_setup(self, setup_id: str):
        """Test PUT /api/setups/{setup_id} - Update setup"""
        try:
            update_data = {
                "name": "Updated EUR/USD Analysis",
                "direction": {
                    "pdArraysMarked": True,
                    "biasFrame": "weekly",
                    "biasType": "bearish",
                    "arrayInteraction": "bearish_rejection",
                    "sweepExpected": True,
                    "finalOutcome": "bearish",
                    "completed": True
                }
            }
            
            response = self.session.put(
                f"{self.base_url}/setups/{setup_id}",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("name") == update_data["name"]:
                    self.log_result("Update Setup", True, f"Updated setup name to: {data.get('name')}")
                    return data
                else:
                    self.log_result("Update Setup", False, "Update not reflected in response")
                    return None
            elif response.status_code == 404:
                self.log_result("Update Setup", False, "Setup not found (404)")
                return None
            else:
                self.log_result("Update Setup", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
        except Exception as e:
            self.log_result("Update Setup", False, f"Error: {str(e)}")
            return None
    
    def test_get_stats(self):
        """Test GET /api/setups/stats/summary - Get stats"""
        try:
            response = self.session.get(f"{self.base_url}/setups/stats/summary")
            
            if response.status_code == 200:
                data = response.json()
                expected_keys = ["total_setups", "completed_sections", "outcomes"]
                if all(key in data for key in expected_keys):
                    self.log_result("Get Stats", True, f"Total setups: {data.get('total_setups', 0)}")
                    return data
                else:
                    self.log_result("Get Stats", False, "Missing expected keys in stats response")
                    return None
            else:
                self.log_result("Get Stats", False, f"Status: {response.status_code}, Response: {response.text}")
                return None
        except Exception as e:
            self.log_result("Get Stats", False, f"Error: {str(e)}")
            return None
    
    def test_delete_setup(self, setup_id: str):
        """Test DELETE /api/setups/{setup_id} - Delete setup"""
        try:
            response = self.session.delete(f"{self.base_url}/setups/{setup_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "deleted successfully" in data.get("message", "").lower():
                    self.log_result("Delete Setup", True, f"Deleted setup: {setup_id}")
                    return True
                else:
                    self.log_result("Delete Setup", False, "Unexpected delete response")
                    return False
            elif response.status_code == 404:
                self.log_result("Delete Setup", False, "Setup not found (404)")
                return False
            else:
                self.log_result("Delete Setup", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
        except Exception as e:
            self.log_result("Delete Setup", False, f"Error: {str(e)}")
            return False
    
    def test_edge_cases(self):
        """Test edge cases and error handling"""
        print("\n=== Testing Edge Cases ===")
        
        # Test getting non-existent setup
        try:
            response = self.session.get(f"{self.base_url}/setups/non-existent-id")
            if response.status_code == 404:
                self.log_result("Get Non-existent Setup", True, "Correctly returned 404")
            else:
                self.log_result("Get Non-existent Setup", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Get Non-existent Setup", False, f"Error: {str(e)}")
        
        # Test updating non-existent setup
        try:
            response = self.session.put(
                f"{self.base_url}/setups/non-existent-id",
                json={"name": "Test"},
                headers={"Content-Type": "application/json"}
            )
            if response.status_code == 404:
                self.log_result("Update Non-existent Setup", True, "Correctly returned 404")
            else:
                self.log_result("Update Non-existent Setup", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Update Non-existent Setup", False, f"Error: {str(e)}")
        
        # Test deleting non-existent setup
        try:
            response = self.session.delete(f"{self.base_url}/setups/non-existent-id")
            if response.status_code == 404:
                self.log_result("Delete Non-existent Setup", True, "Correctly returned 404")
            else:
                self.log_result("Delete Non-existent Setup", False, f"Expected 404, got {response.status_code}")
        except Exception as e:
            self.log_result("Delete Non-existent Setup", False, f"Error: {str(e)}")
    
    def run_comprehensive_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Forex Trading API Comprehensive Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test API health first
        if not self.test_api_health():
            print("❌ API is not accessible. Stopping tests.")
            return False
        
        print("\n=== CRUD Operations Testing ===")
        
        # Create multiple setups for comprehensive testing
        setup_ids = []
        for i, pair in enumerate(["EUR/USD", "GBP/JPY", "AUD/CAD"], 1):
            setup_id = self.test_create_trading_setup(f"{pair} Analysis #{i}")
            if setup_id:
                setup_ids.append(setup_id)
        
        # Test getting all setups
        all_setups = self.test_get_all_setups()
        
        # Test getting specific setups
        for setup_id in setup_ids[:2]:  # Test first 2
            self.test_get_specific_setup(setup_id)
        
        # Test updating a setup
        if setup_ids:
            self.test_update_setup(setup_ids[0])
        
        # Test stats
        self.test_get_stats()
        
        # Test edge cases
        self.test_edge_cases()
        
        # Clean up - delete created setups
        print("\n=== Cleanup ===")
        for setup_id in setup_ids:
            self.test_delete_setup(setup_id)
        
        # Final summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {self.test_results['passed']}")
        print(f"❌ Failed: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\n🔍 Failed Tests:")
            for error in self.test_results['errors']:
                print(f"   • {error}")
        
        success_rate = (self.test_results['passed'] / (self.test_results['passed'] + self.test_results['failed'])) * 100
        print(f"\n📈 Success Rate: {success_rate:.1f}%")
        
        return self.test_results['failed'] == 0

def main():
    """Main test execution"""
    tester = ForexTradingAPITester()
    success = tester.run_comprehensive_tests()
    
    if success:
        print("\n🎉 All tests passed! The Forex Trading API is working correctly.")
        sys.exit(0)
    else:
        print("\n⚠️  Some tests failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()