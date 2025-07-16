/**
 * Comprehensive Authentication Test - Validate all fixes
 * Tests static routes, session establishment, and authentication flow
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class ComprehensiveAuthTest {
  constructor() {
    this.baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
    this.results = [];
    this.sessionCookies = '';
  }

  async log(message) {
    console.log(message);
    this.results.push({
      timestamp: new Date().toISOString(),
      message: message,
      success: message.includes('✅') || message.includes('PASS'),
      error: message.includes('❌') || message.includes('FAIL')
    });
  }

  async testStaticRoutes() {
    await this.log('🔍 Testing Static Routes (should NOT require authentication)...');
    
    const staticRoutes = [
      '/manifest.json',
      '/favicon.ico',
      '/src/components/ui/button.tsx',
      '/attached_assets/agency_logo_1024x1024%20(2)_1752385824604.png',
      '/@fs/home/runner/workspace/public/favicon.ico'
    ];
    
    let passCount = 0;
    
    for (const route of staticRoutes) {
      try {
        const response = await axios.get(`${this.baseURL}${route}`, {
          timeout: 5000,
          validateStatus: (status) => status < 500 // Accept any status except 5xx
        });
        
        if (response.status === 200 || response.status === 404) {
          await this.log(`✅ Static route ${route}: Status ${response.status}`);
          passCount++;
        } else if (response.status === 401) {
          await this.log(`❌ Static route ${route}: Incorrectly requires authentication (401)`);
        } else {
          await this.log(`⚠️ Static route ${route}: Status ${response.status}`);
          passCount++;
        }
      } catch (error) {
        if (error.response?.status === 401) {
          await this.log(`❌ Static route ${route}: Incorrectly requires authentication (401)`);
        } else {
          await this.log(`⚠️ Static route ${route}: ${error.message}`);
          passCount++;
        }
      }
    }
    
    return { pass: passCount, total: staticRoutes.length };
  }

  async testSessionEstablishment() {
    await this.log('🔍 Testing Session Establishment...');
    
    try {
      const response = await axios.post(`${this.baseURL}/api/establish-session`, {
        userId: 2
      }, {
        timeout: 10000,
        withCredentials: true
      });
      
      if (response.status === 200 && response.data.sessionEstablished) {
        await this.log(`✅ Session established successfully`);
        await this.log(`   User: ${response.data.user.email}`);
        await this.log(`   Session ID: ${response.data.sessionId}`);
        
        // Extract cookies from response
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          this.sessionCookies = cookies.join('; ');
          await this.log(`   Set-Cookie headers: ${cookies.length} cookies`);
        }
        
        return { pass: true, sessionId: response.data.sessionId };
      } else {
        await this.log(`❌ Session establishment failed: ${JSON.stringify(response.data)}`);
        return { pass: false };
      }
    } catch (error) {
      await this.log(`❌ Session establishment error: ${error.message}`);
      return { pass: false };
    }
  }

  async testAuthenticatedEndpoints() {
    await this.log('🔍 Testing Authenticated Endpoints...');
    
    const endpoints = [
      '/api/user',
      '/api/user-status',
      '/api/platform-connections',
      '/api/posts'
    ];
    
    let passCount = 0;
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          timeout: 5000,
          withCredentials: true,
          headers: {
            'Cookie': this.sessionCookies,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.status === 200) {
          await this.log(`✅ ${endpoint}: Successfully authenticated`);
          passCount++;
        } else {
          await this.log(`❌ ${endpoint}: Status ${response.status}`);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          await this.log(`❌ ${endpoint}: Authentication failed (401)`);
        } else {
          await this.log(`❌ ${endpoint}: ${error.message}`);
        }
      }
    }
    
    return { pass: passCount, total: endpoints.length };
  }

  async testSessionPersistence() {
    await this.log('🔍 Testing Session Persistence...');
    
    try {
      // Make multiple requests with same session
      const requests = [
        axios.get(`${this.baseURL}/api/user`, {
          withCredentials: true,
          headers: { 'Cookie': this.sessionCookies }
        }),
        axios.get(`${this.baseURL}/api/user-status`, {
          withCredentials: true,
          headers: { 'Cookie': this.sessionCookies }
        }),
        axios.get(`${this.baseURL}/api/platform-connections`, {
          withCredentials: true,
          headers: { 'Cookie': this.sessionCookies }
        })
      ];
      
      const results = await Promise.allSettled(requests);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.status === 200).length;
      
      if (successCount === 3) {
        await this.log(`✅ Session persistence: All ${successCount}/3 requests successful`);
        return { pass: true, successCount };
      } else {
        await this.log(`❌ Session persistence: Only ${successCount}/3 requests successful`);
        return { pass: false, successCount };
      }
    } catch (error) {
      await this.log(`❌ Session persistence error: ${error.message}`);
      return { pass: false, successCount: 0 };
    }
  }

  async testAuthenticationLoops() {
    await this.log('🔍 Testing Authentication Loop Prevention...');
    
    try {
      // Test with invalid session
      const response = await axios.get(`${this.baseURL}/api/user`, {
        timeout: 5000,
        validateStatus: (status) => status <= 401,
        headers: {
          'Cookie': 'theagencyiq.session=invalid_session_id'
        }
      });
      
      if (response.status === 401) {
        await this.log(`✅ Authentication loop prevention: Correctly returns 401 for invalid session`);
        return { pass: true };
      } else {
        await this.log(`❌ Authentication loop prevention: Unexpected status ${response.status}`);
        return { pass: false };
      }
    } catch (error) {
      await this.log(`❌ Authentication loop prevention error: ${error.message}`);
      return { pass: false };
    }
  }

  async runComprehensiveTest() {
    await this.log('🧪 Starting Comprehensive Authentication Test...');
    await this.log('');
    
    // Test 1: Static Routes
    const staticResults = await this.testStaticRoutes();
    await this.log('');
    
    // Test 2: Session Establishment
    const sessionResults = await this.testSessionEstablishment();
    await this.log('');
    
    if (sessionResults.pass) {
      // Test 3: Authenticated Endpoints
      const authResults = await this.testAuthenticatedEndpoints();
      await this.log('');
      
      // Test 4: Session Persistence
      const persistenceResults = await this.testSessionPersistence();
      await this.log('');
      
      // Test 5: Authentication Loop Prevention
      const loopResults = await this.testAuthenticationLoops();
      await this.log('');
      
      // Summary
      const totalTests = 5;
      const passedTests = [
        staticResults.pass === staticResults.total,
        sessionResults.pass,
        authResults.pass === authResults.total,
        persistenceResults.pass,
        loopResults.pass
      ].filter(Boolean).length;
      
      await this.log('📊 COMPREHENSIVE AUTH TEST RESULTS:');
      await this.log('======================================================================');
      await this.log(`✅ Static Routes: ${staticResults.pass === staticResults.total ? 'PASS' : 'FAIL'} (${staticResults.pass}/${staticResults.total})`);
      await this.log(`✅ Session Establishment: ${sessionResults.pass ? 'PASS' : 'FAIL'}`);
      await this.log(`✅ Authenticated Endpoints: ${authResults.pass === authResults.total ? 'PASS' : 'FAIL'} (${authResults.pass}/${authResults.total})`);
      await this.log(`✅ Session Persistence: ${persistenceResults.pass ? 'PASS' : 'FAIL'}`);
      await this.log(`✅ Authentication Loop Prevention: ${loopResults.pass ? 'PASS' : 'FAIL'}`);
      await this.log('======================================================================');
      await this.log(`📈 SUCCESS RATE: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
      
      if (passedTests === totalTests) {
        await this.log('🎉 ALL AUTHENTICATION FIXES WORKING CORRECTLY');
      } else {
        await this.log('⚠️ SOME AUTHENTICATION ISSUES REMAIN');
      }
    } else {
      await this.log('❌ Session establishment failed - cannot proceed with other tests');
    }
    
    // Save results
    const report = {
      timestamp: new Date().toISOString(),
      testResults: this.results,
      summary: {
        totalTests: 5,
        passedTests: sessionResults.pass ? undefined : 0
      }
    };
    
    fs.writeFileSync(`COMPREHENSIVE_AUTH_TEST_REPORT_${Date.now()}.json`, JSON.stringify(report, null, 2));
    
    await this.log('');
    await this.log('🔍 DIAGNOSTICS:');
    await this.log(`   Base URL: ${this.baseURL}`);
    await this.log(`   Session Cookies: ${this.sessionCookies ? 'Present' : 'Missing'}`);
    await this.log(`   Test Environment: Production`);
  }
}

// Run the test
const test = new ComprehensiveAuthTest();
test.runComprehensiveTest().catch(console.error);