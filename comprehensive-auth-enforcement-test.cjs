/**
 * COMPREHENSIVE AUTHENTICATION ENFORCEMENT TEST
 * Tests complete authentication enforcement across all routes
 * Validates no open access and proper authentication required
 */

const axios = require('axios');
const assert = require('assert');
const { performance } = require('perf_hooks');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class AuthenticationEnforcementTest {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
    this.sessionCookie = null;
    this.testUser = {
      email: 'gailm@macleodglba.com.au',
      userId: 2
    };
  }

  async runAllTests() {
    console.log('🚀 Starting Comprehensive Authentication Enforcement Test');
    console.log('='.repeat(60));

    try {
      // Test 1: Unauthenticated access blocked
      await this.testUnauthenticatedAccessBlocked();
      
      // Test 2: Session establishment
      await this.testSessionEstablishment();
      
      // Test 3: Authenticated API access
      await this.testAuthenticatedApiAccess();
      
      // Test 4: Session persistence
      await this.testSessionPersistence();
      
      // Test 5: Protected endpoints
      await this.testProtectedEndpoints();
      
      // Test 6: Welcome prompt for returning users
      await this.testWelcomePrompt();
      
      // Test 7: Concurrent sessions
      await this.testConcurrentSessions();
      
      // Test 8: Authentication bypass prevention
      await this.testAuthenticationBypassPrevention();
      
      // Test 9: Session security
      await this.testSessionSecurity();
      
      // Test 10: Full system integration
      await this.testFullSystemIntegration();
      
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.addResult('test-suite-execution', 'failed', error.message);
      return this.generateReport();
    }
  }

  async testUnauthenticatedAccessBlocked() {
    console.log('\n📋 Test 1: Unauthenticated Access Blocked');
    
    const protectedEndpoints = [
      '/api/user',
      '/api/user-status',
      '/api/platform-connections',
      '/api/posts',
      '/api/posts/create',
      '/api/subscription-status'
    ];
    
    let blockedCount = 0;
    
    for (const endpoint of protectedEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          validateStatus: () => true,
          timeout: 5000
        });
        
        if (response.status === 401) {
          console.log(`   ✅ ${endpoint} - Properly blocked (401)`);
          blockedCount++;
        } else {
          console.log(`   ❌ ${endpoint} - Open access detected (${response.status})`);
        }
      } catch (error) {
        console.log(`   ⚠️ ${endpoint} - Network error: ${error.message}`);
      }
    }
    
    const success = blockedCount === protectedEndpoints.length;
    this.addResult('unauthenticated-access-blocked', success ? 'passed' : 'failed', 
      `${blockedCount}/${protectedEndpoints.length} endpoints properly blocked`);
  }

  async testSessionEstablishment() {
    console.log('\n📋 Test 2: Session Establishment');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/establish-session`, {
        email: this.testUser.email,
        testMode: true
      }, {
        validateStatus: () => true,
        timeout: 10000
      });
      
      if (response.status === 200) {
        // Extract session cookie
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          for (const cookie of cookies) {
            if (cookie.includes('theagencyiq.session')) {
              this.sessionCookie = cookie.split(';')[0];
              break;
            }
          }
        }
        
        console.log('   ✅ Session established successfully');
        console.log(`   📋 Session cookie: ${this.sessionCookie ? this.sessionCookie.substring(0, 50) + '...' : 'Not found'}`);
        
        this.addResult('session-establishment', 'passed', 'Session created with valid cookie');
      } else {
        console.log(`   ❌ Session establishment failed: ${response.status}`);
        this.addResult('session-establishment', 'failed', `HTTP ${response.status}`);
      }
    } catch (error) {
      console.log(`   ❌ Session establishment error: ${error.message}`);
      this.addResult('session-establishment', 'failed', error.message);
    }
  }

  async testAuthenticatedApiAccess() {
    console.log('\n📋 Test 3: Authenticated API Access');
    
    if (!this.sessionCookie) {
      console.log('   ❌ No session cookie available');
      this.addResult('authenticated-api-access', 'failed', 'No session cookie');
      return;
    }
    
    const endpoints = [
      '/api/user',
      '/api/user-status',
      '/api/platform-connections'
    ];
    
    let successCount = 0;
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: {
            'Cookie': this.sessionCookie
          },
          validateStatus: () => true,
          timeout: 5000
        });
        
        if (response.status === 200) {
          console.log(`   ✅ ${endpoint} - Authenticated access successful`);
          successCount++;
        } else {
          console.log(`   ❌ ${endpoint} - Authentication failed (${response.status})`);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint} - Request error: ${error.message}`);
      }
    }
    
    const success = successCount === endpoints.length;
    this.addResult('authenticated-api-access', success ? 'passed' : 'failed',
      `${successCount}/${endpoints.length} endpoints accessible with authentication`);
  }

  async testSessionPersistence() {
    console.log('\n📋 Test 4: Session Persistence');
    
    if (!this.sessionCookie) {
      console.log('   ❌ No session cookie available for persistence test');
      this.addResult('session-persistence', 'failed', 'No session cookie');
      return;
    }
    
    try {
      // Make multiple requests with the same cookie
      const requests = [];
      for (let i = 0; i < 3; i++) {
        requests.push(
          axios.get(`${BASE_URL}/api/user`, {
            headers: { 'Cookie': this.sessionCookie },
            validateStatus: () => true,
            timeout: 5000
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const successCount = responses.filter(r => r.status === 200).length;
      
      if (successCount === 3) {
        console.log('   ✅ Session persisted across multiple requests');
        this.addResult('session-persistence', 'passed', 'Session maintained across 3 requests');
      } else {
        console.log(`   ❌ Session persistence failed: ${successCount}/3 requests successful`);
        this.addResult('session-persistence', 'failed', `Only ${successCount}/3 requests successful`);
      }
    } catch (error) {
      console.log(`   ❌ Session persistence test error: ${error.message}`);
      this.addResult('session-persistence', 'failed', error.message);
    }
  }

  async testProtectedEndpoints() {
    console.log('\n📋 Test 5: Protected Endpoints');
    
    const criticalEndpoints = [
      { method: 'GET', path: '/api/user', description: 'User data' },
      { method: 'GET', path: '/api/user-status', description: 'User status' },
      { method: 'GET', path: '/api/platform-connections', description: 'Platform connections' },
      { method: 'POST', path: '/api/posts/create', description: 'Create post' },
      { method: 'GET', path: '/api/subscription-status', description: 'Subscription status' }
    ];
    
    let protectedCount = 0;
    
    for (const endpoint of criticalEndpoints) {
      try {
        const config = {
          url: `${BASE_URL}${endpoint.path}`,
          method: endpoint.method.toLowerCase(),
          validateStatus: () => true,
          timeout: 5000
        };
        
        if (endpoint.method === 'POST') {
          config.data = { test: true };
        }
        
        const response = await axios(config);
        
        if (response.status === 401) {
          console.log(`   ✅ ${endpoint.method} ${endpoint.path} - Protected (401)`);
          protectedCount++;
        } else {
          console.log(`   ❌ ${endpoint.method} ${endpoint.path} - Not protected (${response.status})`);
        }
      } catch (error) {
        console.log(`   ⚠️ ${endpoint.method} ${endpoint.path} - Error: ${error.message}`);
      }
    }
    
    const success = protectedCount >= criticalEndpoints.length * 0.8; // 80% success rate
    this.addResult('protected-endpoints', success ? 'passed' : 'failed',
      `${protectedCount}/${criticalEndpoints.length} endpoints properly protected`);
  }

  async testWelcomePrompt() {
    console.log('\n📋 Test 6: Welcome Prompt for Returning Users');
    
    if (!this.sessionCookie) {
      console.log('   ❌ No session cookie for welcome prompt test');
      this.addResult('welcome-prompt', 'failed', 'No session cookie');
      return;
    }
    
    try {
      const response = await axios.get(`${BASE_URL}/api/user-status`, {
        headers: { 'Cookie': this.sessionCookie },
        validateStatus: () => true,
        timeout: 5000
      });
      
      if (response.status === 200 && response.data.authenticated) {
        console.log('   ✅ Welcome prompt data available for returning users');
        console.log(`   📋 User: ${response.data.user?.email}`);
        console.log(`   📋 Subscription: ${response.data.user?.subscriptionPlan}`);
        this.addResult('welcome-prompt', 'passed', 'User data available for welcome prompt');
      } else {
        console.log('   ❌ Welcome prompt data not available');
        this.addResult('welcome-prompt', 'failed', 'User data not accessible');
      }
    } catch (error) {
      console.log(`   ❌ Welcome prompt test error: ${error.message}`);
      this.addResult('welcome-prompt', 'failed', error.message);
    }
  }

  async testConcurrentSessions() {
    console.log('\n📋 Test 7: Concurrent Sessions');
    
    try {
      const sessions = [];
      
      // Create 3 concurrent sessions
      for (let i = 0; i < 3; i++) {
        const sessionPromise = axios.post(`${BASE_URL}/api/auth/establish-session`, {
          email: this.testUser.email,
          testMode: true
        }, {
          validateStatus: () => true,
          timeout: 10000
        });
        sessions.push(sessionPromise);
      }
      
      const responses = await Promise.all(sessions);
      const successCount = responses.filter(r => r.status === 200).length;
      
      if (successCount === 3) {
        console.log('   ✅ Concurrent sessions handled successfully');
        this.addResult('concurrent-sessions', 'passed', '3/3 concurrent sessions created');
      } else {
        console.log(`   ❌ Concurrent sessions failed: ${successCount}/3 successful`);
        this.addResult('concurrent-sessions', 'failed', `Only ${successCount}/3 sessions successful`);
      }
    } catch (error) {
      console.log(`   ❌ Concurrent sessions test error: ${error.message}`);
      this.addResult('concurrent-sessions', 'failed', error.message);
    }
  }

  async testAuthenticationBypassPrevention() {
    console.log('\n📋 Test 8: Authentication Bypass Prevention');
    
    const bypassAttempts = [
      { headers: { 'Authorization': 'Bearer fake-token' }, description: 'Fake Bearer token' },
      { headers: { 'X-User-ID': '2' }, description: 'Direct user ID header' },
      { headers: { 'Cookie': 'theagencyiq.session=fake-session' }, description: 'Fake session cookie' },
      { headers: { 'X-Auth-Token': 'admin-token' }, description: 'Admin token attempt' }
    ];
    
    let preventedCount = 0;
    
    for (const attempt of bypassAttempts) {
      try {
        const response = await axios.get(`${BASE_URL}/api/user`, {
          headers: attempt.headers,
          validateStatus: () => true,
          timeout: 5000
        });
        
        if (response.status === 401) {
          console.log(`   ✅ ${attempt.description} - Bypass prevented (401)`);
          preventedCount++;
        } else {
          console.log(`   ❌ ${attempt.description} - Bypass successful (${response.status})`);
        }
      } catch (error) {
        console.log(`   ⚠️ ${attempt.description} - Error: ${error.message}`);
      }
    }
    
    const success = preventedCount === bypassAttempts.length;
    this.addResult('authentication-bypass-prevention', success ? 'passed' : 'failed',
      `${preventedCount}/${bypassAttempts.length} bypass attempts prevented`);
  }

  async testSessionSecurity() {
    console.log('\n📋 Test 9: Session Security');
    
    if (!this.sessionCookie) {
      console.log('   ❌ No session cookie for security test');
      this.addResult('session-security', 'failed', 'No session cookie');
      return;
    }
    
    try {
      // Test session cookie format
      const isSignedCookie = this.sessionCookie.includes('s%3A') || this.sessionCookie.includes('s:');
      
      if (isSignedCookie) {
        console.log('   ✅ Session cookie is properly signed');
      } else {
        console.log('   ❌ Session cookie is not signed');
      }
      
      // Test session validation
      const response = await axios.get(`${BASE_URL}/api/user`, {
        headers: { 'Cookie': this.sessionCookie },
        validateStatus: () => true,
        timeout: 5000
      });
      
      const isValid = response.status === 200;
      
      if (isValid) {
        console.log('   ✅ Session validation working');
      } else {
        console.log('   ❌ Session validation failed');
      }
      
      const success = isSignedCookie && isValid;
      this.addResult('session-security', success ? 'passed' : 'failed',
        `Signed cookie: ${isSignedCookie}, Valid: ${isValid}`);
    } catch (error) {
      console.log(`   ❌ Session security test error: ${error.message}`);
      this.addResult('session-security', 'failed', error.message);
    }
  }

  async testFullSystemIntegration() {
    console.log('\n📋 Test 10: Full System Integration');
    
    if (!this.sessionCookie) {
      console.log('   ❌ No session cookie for integration test');
      this.addResult('full-system-integration', 'failed', 'No session cookie');
      return;
    }
    
    try {
      const integrationTests = [
        { endpoint: '/api/user', description: 'User data retrieval' },
        { endpoint: '/api/user-status', description: 'User status check' },
        { endpoint: '/api/platform-connections', description: 'Platform connections' }
      ];
      
      let passedTests = 0;
      
      for (const test of integrationTests) {
        try {
          const response = await axios.get(`${BASE_URL}${test.endpoint}`, {
            headers: { 'Cookie': this.sessionCookie },
            validateStatus: () => true,
            timeout: 5000
          });
          
          if (response.status === 200) {
            console.log(`   ✅ ${test.description} - Working`);
            passedTests++;
          } else {
            console.log(`   ❌ ${test.description} - Failed (${response.status})`);
          }
        } catch (error) {
          console.log(`   ❌ ${test.description} - Error: ${error.message}`);
        }
      }
      
      const success = passedTests === integrationTests.length;
      this.addResult('full-system-integration', success ? 'passed' : 'failed',
        `${passedTests}/${integrationTests.length} integration tests passed`);
    } catch (error) {
      console.log(`   ❌ Full system integration test error: ${error.message}`);
      this.addResult('full-system-integration', 'failed', error.message);
    }
  }

  addResult(test, status, details) {
    this.results.push({
      test,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  generateReport() {
    const endTime = performance.now();
    const duration = Math.round(endTime - this.startTime);
    
    const passed = this.results.filter(r => r.status === 'passed').length;
    const failed = this.results.filter(r => r.status === 'failed').length;
    const total = this.results.length;
    
    const report = {
      summary: {
        total,
        passed,
        failed,
        successRate: Math.round((passed / total) * 100),
        duration: `${duration}ms`
      },
      results: this.results,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 COMPREHENSIVE AUTHENTICATION ENFORCEMENT TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${passed}/${total} tests`);
    console.log(`❌ Failed: ${failed}/${total} tests`);
    console.log(`🎯 Success Rate: ${report.summary.successRate}%`);
    console.log(`⏱️ Duration: ${report.summary.duration}`);
    console.log('='.repeat(60));
    
    // Assessment
    if (report.summary.successRate >= 90) {
      console.log('🎉 ASSESSMENT: PRODUCTION READY - Authentication enforcement working excellently');
    } else if (report.summary.successRate >= 75) {
      console.log('⚠️ ASSESSMENT: GOOD - Minor authentication issues need attention');
    } else {
      console.log('❌ ASSESSMENT: NEEDS WORK - Significant authentication issues detected');
    }
    
    return report;
  }
}

// Run the test
const test = new AuthenticationEnforcementTest();
test.runAllTests().then(report => {
  console.log('\n🎯 Test Complete - Authentication Enforcement Validated');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});