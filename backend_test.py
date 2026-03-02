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
        """Test Overview APIs for all three assets"""
        
        # Test BTC Overview
        btc_success, btc_response = self.run_test(
            "BTC Overview API (90d)", 
            "GET", 
            "/api/ui/overview",
            params={"asset": "BTC", "horizon": "90"}
        )
        
        if btc_success and isinstance(btc_response, dict):
            if 'series' in btc_response:
                series = btc_response['series']
                if isinstance(series, list):
                    self.log(f"   📊 BTC series length: {len(series)}")
            if 'verdict' in btc_response:
                verdict = btc_response['verdict']
                if isinstance(verdict, dict) and 'expectedMovePct' in verdict:
                    self.log(f"   📈 BTC expected: {verdict['expectedMovePct']:.2f}%")

        # Test SPX Overview
        spx_success, spx_response = self.run_test(
            "SPX Overview API (90d)", 
            "GET", 
            "/api/ui/overview",
            params={"asset": "SPX", "horizon": "90"}
        )
        
        if spx_success and isinstance(spx_response, dict):
            if 'series' in spx_response:
                series = spx_response['series']
                if isinstance(series, list):
                    self.log(f"   📊 SPX series length: {len(series)}")

        # Test DXY Overview
        dxy_success, dxy_response = self.run_test(
            "DXY Overview API (90d)", 
            "GET", 
            "/api/ui/overview",
            params={"asset": "DXY", "horizon": "90"}
        )
        
        if dxy_success and isinstance(dxy_response, dict):
            if 'series' in dxy_response:
                series = dxy_response['series']
                if isinstance(series, list):
                    self.log(f"   📊 DXY series length: {len(series)}")

        return btc_success, spx_success, dxy_success

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
            "btc_overview": False,
            "spx_overview": False,
            "dxy_overview": False
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
        results["btc_overview"], results["spx_overview"], results["dxy_overview"] = self.test_overview_apis()
        
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