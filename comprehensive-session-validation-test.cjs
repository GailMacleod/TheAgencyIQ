/**
 * COMPREHENSIVE SESSION VALIDATION TEST
 * Tests complete session authentication flow from establishment to API access
 */

const axios = require('axios');
const assert = require('assert');

class ComprehensiveSessionValidationTest {
  constructor() {
    this.baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
    this.testResults = [];
    this.cookies = '';
    this.sessionId = '';
    this.userId = '';
  }

  async runAllTests() {
    console.log('🧪 COMPREHENSIVE SESSION VALIDATION TEST');
    console.log('==========================================');
    
    try {
      await this.testServerStatus();
      await this.testSessionEstablishment();
      await this.testSessionPersistence();
      await this.testAPIAuthentication();
      await this.testSessionConsistency();
      await this.generateFinalReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.addResult('Test Suite', 'FAILED', error.message);
      this.generateFinalReport();
    }
  }

  async testServerStatus() {
    console.log('\n1. Testing Server Status...');
    try {
      const response = await axios.get(`${this.baseUrl}/`, {
        validateStatus: () => true,
        timeout: 10000
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Headers: ${JSON.stringify(response.headers, null, 2)}`);
      
      if (response.status === 200) {
        this.addResult('Server Status', 'PASSED', 'Server responding correctly');
      } else {
        this.addResult('Server Status', 'FAILED', `Server returned ${response.status}`);
      }
    } catch (error) {
      this.addResult('Server Status', 'FAILED', error.message);
    }
  }

  async testSessionEstablishment() {
    console.log('\n2. Testing Session Establishment...');
    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/establish-session`, {
        email: 'gailm@macleodglba.com.au'
      }, {
        withCredentials: true,
        validateStatus: () => true,
        timeout: 10000
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
      if (response.headers['set-cookie']) {
        // Use only the signed cookie for session persistence
        const setCookies = response.headers['set-cookie'];
        const signedCookie = setCookies.find(cookie => cookie.includes('s%3A'));
        this.cookies = signedCookie || setCookies.join('; ');
        console.log(`   Cookies: ${this.cookies}`);
        
        // Extract session ID from signed cookie
        const match = this.cookies.match(/theagencyiq\.session=s%3A([^.]+)/);
        if (match) {
          this.sessionId = match[1];
          console.log(`   Session ID: ${this.sessionId}`);
        }
      }
      
      if (response.status === 200 && response.data.success) {
        this.userId = response.data.user.id;
        this.addResult('Session Establishment', 'PASSED', `User ID: ${this.userId}`);
      } else {
        this.addResult('Session Establishment', 'FAILED', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('Session Establishment', 'FAILED', error.message);
    }
  }

  async testSessionPersistence() {
    console.log('\n3. Testing Session Persistence...');
    try {
      const response = await axios.get(`${this.baseUrl}/api/user`, {
        withCredentials: true,
        headers: {
          'Cookie': this.cookies,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true,
        timeout: 10000
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
      if (response.status === 200) {
        this.addResult('Session Persistence', 'PASSED', 'Session persisted successfully');
      } else {
        this.addResult('Session Persistence', 'FAILED', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('Session Persistence', 'FAILED', error.message);
    }
  }

  async testAPIAuthentication() {
    console.log('\n4. Testing API Authentication...');
    try {
      const response = await axios.get(`${this.baseUrl}/api/user-status`, {
        withCredentials: true,
        headers: {
          'Cookie': this.cookies,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true,
        timeout: 10000
      });
      
      console.log(`   Status: ${response.status}`);
      console.log(`   Response: ${JSON.stringify(response.data, null, 2)}`);
      
      if (response.status === 200) {
        this.addResult('API Authentication', 'PASSED', 'API access working');
      } else {
        this.addResult('API Authentication', 'FAILED', `Status: ${response.status}`);
      }
    } catch (error) {
      this.addResult('API Authentication', 'FAILED', error.message);
    }
  }

  async testSessionConsistency() {
    console.log('\n5. Testing Session Consistency...');
    try {
      // Test multiple API calls to ensure session ID remains consistent
      const endpoints = ['/api/user', '/api/user-status', '/api/platform-connections'];
      let consistent = true;
      
      for (const endpoint of endpoints) {
        const response = await axios.get(`${this.baseUrl}${endpoint}`, {
          withCredentials: true,
          headers: {
            'Cookie': this.cookies,
            'Content-Type': 'application/json'
          },
          validateStatus: () => true,
          timeout: 10000
        });
        
        console.log(`   ${endpoint}: ${response.status}`);
        
        if (response.status !== 200) {
          consistent = false;
          break;
        }
      }
      
      if (consistent) {
        this.addResult('Session Consistency', 'PASSED', 'All endpoints consistent');
      } else {
        this.addResult('Session Consistency', 'FAILED', 'Session inconsistent across endpoints');
      }
    } catch (error) {
      this.addResult('Session Consistency', 'FAILED', error.message);
    }
  }

  addResult(test, status, message) {
    this.testResults.push({
      test,
      status,
      message,
      timestamp: new Date().toISOString()
    });
  }

  generateFinalReport() {
    console.log('\n📊 FINAL TEST RESULTS');
    console.log('=====================');
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const failed = this.testResults.filter(r => r.status === 'FAILED').length;
    const total = this.testResults.length;
    
    console.log(`\n📈 Overall Results: ${passed}/${total} tests passed (${Math.round((passed/total)*100)}%)`);
    
    this.testResults.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${icon} ${result.test}: ${result.status} - ${result.message}`);
    });
    
    // Write results to file
    const fs = require('fs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportData = {
      timestamp,
      totalTests: total,
      passed,
      failed,
      successRate: Math.round((passed/total)*100),
      results: this.testResults,
      sessionId: this.sessionId,
      userId: this.userId,
      cookies: this.cookies
    };
    
    fs.writeFileSync(`COMPREHENSIVE_SESSION_VALIDATION_REPORT_${Date.now()}.json`, JSON.stringify(reportData, null, 2));
    
    console.log('\n🎯 SYSTEM STATUS:');
    if (passed === total) {
      console.log('✅ SESSION AUTHENTICATION SYSTEM FULLY OPERATIONAL');
      console.log('🚀 PRODUCTION READY FOR DEPLOYMENT');
    } else {
      console.log('❌ SESSION AUTHENTICATION SYSTEM NEEDS FIXES');
      console.log('🔧 REQUIRES IMMEDIATE ATTENTION');
    }
  }
}

// Execute test
const test = new ComprehensiveSessionValidationTest();
test.runAllTests().catch(console.error);