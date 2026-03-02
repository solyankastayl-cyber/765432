#!/usr/bin/env python3
"""
Fractal Platform Backend API Testing Suite
Tests all key APIs as specified in the review request
"""
import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Tuple

class FractalPlatformTester:
    def __init__(self, base_url: str = "https://currency-pair-engine-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})
        
    def log(self, message: str) -> None:
        """Log with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int = 200, 
                 params: Dict = None, data: Dict = None, timeout: int = 30) -> Tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        self.tests_run += 1
        
        self.log(f"🔍 Testing {name}...")
        self.log(f"   URL: {url}")
        if params:
            self.log(f"   Params: {params}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, params=params, timeout=timeout)
            elif method == 'POST':
                response = self.session.post(url, params=params, json=data, timeout=timeout)
            else:
                response = self.session.request(method, url, params=params, json=data, timeout=timeout)
            
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                self.log(f"   ✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and 'ok' in response_data:
                        self.log(f"   📋 Response ok: {response_data.get('ok')}")
                    return True, response_data
                except ValueError:
                    self.log(f"   📋 Response: {response.text[:200]}...")
                    return True, {}
            else:
                self.log(f"   ❌ FAILED - Expected {expected_status}, got {response.status_code}")
                self.log(f"   📋 Response: {response.text[:500]}...")
                return False, {}

        except requests.exceptions.Timeout:
            self.log(f"   ⏰ TIMEOUT - Request took longer than {timeout}s")
            return False, {}
        except requests.exceptions.ConnectionError as e:
            self.log(f"   🔌 CONNECTION ERROR - {str(e)}")
            return False, {}
        except Exception as e:
            self.log(f"   ❌ ERROR - {str(e)}")
            return False, {}

    def test_health_endpoint(self) -> bool:
        """Test system health check"""
        success, response = self.run_test(
            "Health Check", 
            "GET", 
            "/api/health"
        )
        
        if success and isinstance(response, dict):
            if 'status' in response:
                self.log(f"   📊 Health status: {response.get('status')}")
            if 'ts_backend' in response:
                ts_status = response.get('ts_backend')
                self.log(f"   🔧 TypeScript backend: {ts_status}")
        
        return success

    def test_btc_fractal_api(self) -> bool:
        """Test BTC Fractal focus-pack API"""
        success, response = self.run_test(
            "BTC Fractal API (30d)", 
            "GET", 
            "/api/fractal/v2.1/focus-pack",
            params={"focus": "30d"}
        )
        
        if success and isinstance(response, dict):
            # Check key fields expected in BTC fractal response
            if 'verdict' in response:
                verdict = response['verdict']
                if isinstance(verdict, dict):
                    if 'expectedMovePct' in verdict:
                        self.log(f"   📈 Expected move: {verdict['expectedMovePct']:.2f}%")
                    if 'confidence' in verdict:
                        self.log(f"   🎯 Confidence: {verdict['confidence']:.2f}")
            
            if 'layers' in response:
                layers = response['layers']
                if 'snapshot' in layers:
                    snapshot = layers['snapshot']
                    if 'price' in snapshot:
                        self.log(f"   💰 Current price: ${snapshot['price']}")
        
        return success

    def test_spx_fractal_api(self) -> bool:
        """Test SPX Fractal focus-pack API"""
        success, response = self.run_test(
            "SPX Fractal API (30d)", 
            "GET", 
            "/api/spx/v2.1/focus-pack",
            params={"horizon": "30d"}
        )
        
        if success and isinstance(response, dict):
            if 'verdict' in response:
                verdict = response['verdict']
                if isinstance(verdict, dict):
                    if 'expectedReturn' in verdict:
                        self.log(f"   📈 Expected return: {verdict['expectedReturn']:.2f}%")
                    if 'confidence' in verdict:
                        self.log(f"   🎯 Confidence: {verdict['confidence']:.2f}")
        
        return success

    def test_dxy_terminal_api(self) -> bool:
        """Test DXY Terminal API"""
        success, response = self.run_test(
            "DXY Terminal API (30d)", 
            "GET", 
            "/api/fractal/dxy/terminal",
            params={"focus": "30d"}
        )
        
        if success and isinstance(response, dict):
            if 'verdict' in response:
                verdict = response['verdict']
                if isinstance(verdict, dict):
                    if 'expectedMovePct' in verdict:
                        self.log(f"   📈 Expected move: {verdict['expectedMovePct']:.2f}%")
                    if 'confidence' in verdict:
                        self.log(f"   🎯 Confidence: {verdict['confidence']:.2f}")
            
            if 'series' in response:
                series = response['series']
                if isinstance(series, list) and len(series) > 0:
                    self.log(f"   📊 Series length: {len(series)}")
        
        return success

    def test_overview_apis(self) -> Tuple[bool, bool, bool]:
        """Test Overview APIs for all three assets with specific fix validation"""
        
        # Test DXY Overview - should return DXY data, not SPX data
        dxy_success, dxy_response = self.run_test(
            "DXY Overview API (90d) - Fix: Should return DXY data (~117-120), not SPX", 
            "GET", 
            "/api/ui/overview",
            params={"asset": "DXY", "horizon": "90"}
        )
        
        if dxy_success and isinstance(dxy_response, dict):
            # Validate asset field
            if 'asset' in dxy_response:
                returned_asset = dxy_response['asset']
                self.log(f"   🔍 Returned asset: {returned_asset} (expected: dxy)")
                if returned_asset != 'dxy':
                    self.log(f"   ❌ ASSET MISMATCH: Expected 'dxy', got '{returned_asset}'")
            
            # Check if data values are in DXY range (~117-120), not SPX range (~5000-6900)
            if 'charts' in dxy_response and 'actual' in dxy_response['charts']:
                actual_data = dxy_response['charts']['actual']
                if actual_data and len(actual_data) > 0:
                    recent_price = actual_data[-1].get('v', 0) if isinstance(actual_data[-1], dict) else 0
                    self.log(f"   💰 Current DXY price: {recent_price}")
                    if recent_price > 1000:
                        self.log(f"   ❌ PRICE ISSUE: DXY price {recent_price} looks like SPX data (should be ~117-120)")
                    else:
                        self.log(f"   ✅ DXY price range looks correct")
                
            # Check predicted points count
            if 'charts' in dxy_response and 'predicted' in dxy_response['charts']:
                predicted_data = dxy_response['charts']['predicted']
                if predicted_data:
                    predicted_count = len(predicted_data)
                    self.log(f"   📈 DXY predicted points: {predicted_count} (expected: ~90)")

        # Test SPX Overview - should return proper forecast.path structure
        spx_success, spx_response = self.run_test(
            "SPX Overview API (90d) - Fix: Should have ~91 predicted points", 
            "GET", 
            "/api/ui/overview",
            params={"asset": "SPX", "horizon": "90"}
        )
        
        if spx_success and isinstance(spx_response, dict):
            # Validate asset field
            if 'asset' in spx_response:
                returned_asset = spx_response['asset']
                self.log(f"   🔍 Returned asset: {returned_asset} (expected: spx)")
            
            # Check predicted points count (should be ~91, not 1)
            if 'charts' in spx_response and 'predicted' in spx_response['charts']:
                predicted_data = spx_response['charts']['predicted']
                if predicted_data:
                    predicted_count = len(predicted_data)
                    self.log(f"   📈 SPX predicted points: {predicted_count} (expected: ~91)")
                    if predicted_count < 10:
                        self.log(f"   ❌ FORECAST ISSUE: Only {predicted_count} predicted points, expected ~91")
                    else:
                        self.log(f"   ✅ SPX forecast points look correct")

        # Test BTC Overview - should return BTC data, not SPX data
        btc_success, btc_response = self.run_test(
            "BTC Overview API (90d) - Fix: Should return BTC data with ~91 predicted points", 
            "GET", 
            "/api/ui/overview",
            params={"asset": "BTC", "horizon": "90"}
        )
        
        if btc_success and isinstance(btc_response, dict):
            # Validate asset field
            if 'asset' in btc_response:
                returned_asset = btc_response['asset']
                self.log(f"   🔍 Returned asset: {returned_asset} (expected: btc)")
            
            # Check predicted points count
            if 'charts' in btc_response and 'predicted' in btc_response['charts']:
                predicted_data = btc_response['charts']['predicted']
                if predicted_data:
                    predicted_count = len(predicted_data)
                    self.log(f"   📈 BTC predicted points: {predicted_count} (expected: ~91)")

        return dxy_success, spx_success, btc_success

    def run_all_tests(self) -> Dict[str, Any]:
        """Run all API tests and return summary"""
        self.log("🚀 Starting Fractal Platform Backend API Tests")
        self.log(f"🌐 Base URL: {self.base_url}")
        
        # Test results
        results = {
            "health": False,
            "btc_fractal": False, 
            "spx_fractal": False,
            "dxy_terminal": False,
            "dxy_overview": False,
            "spx_overview": False,
            "btc_overview": False,
            "case_insensitive": False
        }
        
        # 1. Health Check
        results["health"] = self.test_health_endpoint()
        
        # 2. BTC Fractal API
        results["btc_fractal"] = self.test_btc_fractal_api()
        
        # 3. SPX Fractal API
        results["spx_fractal"] = self.test_spx_fractal_api()
        
        # 4. DXY Terminal API
        results["dxy_terminal"] = self.test_dxy_terminal_api()
        
        # 5. Overview APIs
        results["dxy_overview"], results["spx_overview"], results["btc_overview"] = self.test_overview_apis()
        
        # 6. Test case-insensitive asset validation
        self.log("\n🔤 Testing case-insensitive asset validation...")
        case_insensitive_success, _ = self.run_test(
            "Case-insensitive asset test (btc lowercase)", 
            "GET", 
            "/api/ui/overview",
            params={"asset": "btc", "horizon": "90"}
        )
        
        case_insensitive_success2, _ = self.run_test(
            "Case-insensitive asset test (DXY uppercase)", 
            "GET", 
            "/api/ui/overview",
            params={"asset": "DXY", "horizon": "90"}
        )
        
        results["case_insensitive"] = case_insensitive_success and case_insensitive_success2
        
        # Summary
        self.log("\n" + "="*60)
        self.log("📊 TEST SUMMARY")
        self.log("="*60)
        
        for test_name, success in results.items():
            status = "✅ PASS" if success else "❌ FAIL"
            self.log(f"{test_name.upper():<15}: {status}")
        
        pass_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"\nOverall: {self.tests_passed}/{self.tests_run} tests passed ({pass_rate:.1f}%)")
        
        if pass_rate == 100:
            self.log("🎉 ALL TESTS PASSED!")
        elif pass_rate >= 80:
            self.log("⚠️  Most tests passed - check failed tests")
        else:
            self.log("❌ Multiple test failures - system may have issues")
        
        return {
            "results": results,
            "summary": {
                "total_tests": self.tests_run,
                "passed_tests": self.tests_passed,
                "pass_rate": pass_rate,
                "all_passed": pass_rate == 100
            }
        }

def main():
    """Main test runner"""
    try:
        tester = FractalPlatformTester()
        test_results = tester.run_all_tests()
        
        # Return appropriate exit code
        return 0 if test_results["summary"]["all_passed"] else 1
        
    except KeyboardInterrupt:
        print("\n⚠️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Fatal error: {str(e)}")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)