/**
 * COMPREHENSIVE END-TO-END SYSTEM TEST
 * Tests complete session establishment and persistence with authentication
 * Validates cookie handling, /api/user endpoint, and complete workflow
 */

const axios = require('axios');
const assert = require('assert');

// Configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const TIMEOUT = 30000;

// Test results tracking
const testResults = {
  sessionEstablishment: { passed: false, message: '' },
  sessionPersistence: { passed: false, message: '' },
  cookieHandling: { passed: false, message: '' },
  apiUserEndpoint: { passed: false, message: '' },
  authGuardValidation: { passed: false, message: '' },
  endToEndFlow: { passed: false, message: '' }
};

// Global session state
let sessionCookies = '';
let sessionId = '';
let userInfo = null;

/**
 * Test 1: Session Establishment
 * Verifies session can be established and cookies are set
 */
async function testSessionEstablishment() {
  console.log('\n🔍 Test 1: Session Establishment');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/establish-session`, {}, {
      timeout: TIMEOUT,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.status === 200 && response.data.success) {
      // Extract session cookies from response
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        sessionCookies = setCookieHeader.join('; ');
        console.log('🍪 Session cookies captured:', sessionCookies.substring(0, 100) + '...');
      }
      
      sessionId = response.data.sessionId;
      userInfo = response.data.user;
      
      console.log('✅ Session established successfully');
      console.log(`   User: ${userInfo.email} (ID: ${userInfo.id})`);
      console.log(`   Session ID: ${sessionId}`);
      
      testResults.sessionEstablishment.passed = true;
      testResults.sessionEstablishment.message = `Session established for ${userInfo.email}`;
    } else {
      throw new Error(`Session establishment failed: ${response.data.message}`);
    }
    
  } catch (error) {
    console.log(`❌ Session establishment failed: ${error.message}`);
    testResults.sessionEstablishment.message = error.message;
    throw error;
  }
}

/**
 * Test 2: Session Persistence
 * Verifies session persists across requests using cookies
 */
async function testSessionPersistence() {
  console.log('\n🔍 Test 2: Session Persistence');
  
  try {
    // Make a request using session cookies
    const response = await axios.get(`${BASE_URL}/api/auth/session`, {
      timeout: TIMEOUT,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': sessionCookies
      }
    });
    
    if (response.status === 200 && response.data.authenticated) {
      console.log('✅ Session persistence working');
      console.log(`   User: ${response.data.user.email} (ID: ${response.data.user.id})`);
      
      testResults.sessionPersistence.passed = true;
      testResults.sessionPersistence.message = `Session persisted for ${response.data.user.email}`;
    } else {
      throw new Error(`Session persistence failed: ${JSON.stringify(response.data)}`);
    }
    
  } catch (error) {
    console.log(`❌ Session persistence failed: ${error.message}`);
    testResults.sessionPersistence.message = error.message;
    throw error;
  }
}

/**
 * Test 3: Cookie Handling
 * Verifies cookies are properly set and transmitted
 */
async function testCookieHandling() {
  console.log('\n🔍 Test 3: Cookie Handling');
  
  try {
    // Test cookie presence and format
    if (!sessionCookies || !sessionCookies.includes('theagencyiq.session=')) {
      throw new Error('Session cookie not found in response headers');
    }
    
    // Extract session cookie value
    const cookieMatch = sessionCookies.match(/theagencyiq\.session=([^;]+)/);
    if (!cookieMatch) {
      throw new Error('Session cookie format invalid');
    }
    
    const cookieValue = cookieMatch[1];
    console.log('✅ Cookie handling working');
    console.log(`   Cookie value: ${cookieValue.substring(0, 50)}...`);
    
    testResults.cookieHandling.passed = true;
    testResults.cookieHandling.message = `Session cookie properly set and formatted`;
    
  } catch (error) {
    console.log(`❌ Cookie handling failed: ${error.message}`);
    testResults.cookieHandling.message = error.message;
    throw error;
  }
}

/**
 * Test 4: /api/user Endpoint
 * Verifies authenticated /api/user endpoint works with session cookies
 */
async function testApiUserEndpoint() {
  console.log('\n🔍 Test 4: /api/user Endpoint');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/user`, {
      timeout: TIMEOUT,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': sessionCookies
      }
    });
    
    if (response.status === 200 && response.data.id) {
      console.log('✅ /api/user endpoint working');
      console.log(`   User: ${response.data.email} (ID: ${response.data.id})`);
      console.log(`   Subscription: ${response.data.subscriptionPlan}`);
      
      testResults.apiUserEndpoint.passed = true;
      testResults.apiUserEndpoint.message = `User data retrieved successfully`;
    } else {
      throw new Error(`/api/user endpoint failed: ${JSON.stringify(response.data)}`);
    }
    
  } catch (error) {
    console.log(`❌ /api/user endpoint failed: ${error.response?.status} ${error.message}`);
    testResults.apiUserEndpoint.message = `${error.response?.status} ${error.message}`;
    throw error;
  }
}

/**
 * Test 5: Auth Guard Validation
 * Verifies authGuard.ts properly validates established sessions
 */
async function testAuthGuardValidation() {
  console.log('\n🔍 Test 5: Auth Guard Validation');
  
  try {
    // Test protected endpoint that uses authGuard
    const response = await axios.get(`${BASE_URL}/api/user-status`, {
      timeout: TIMEOUT,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': sessionCookies
      }
    });
    
    if (response.status === 200 && response.data.authenticated) {
      console.log('✅ Auth guard validation working');
      console.log(`   User: ${response.data.email} (ID: ${response.data.id})`);
      
      testResults.authGuardValidation.passed = true;
      testResults.authGuardValidation.message = `Auth guard validated session successfully`;
    } else {
      throw new Error(`Auth guard validation failed: ${JSON.stringify(response.data)}`);
    }
    
  } catch (error) {
    console.log(`❌ Auth guard validation failed: ${error.response?.status} ${error.message}`);
    testResults.authGuardValidation.message = `${error.response?.status} ${error.message}`;
    throw error;
  }
}

/**
 * Test 6: End-to-End Flow
 * Verifies complete workflow with multiple authenticated requests
 */
async function testEndToEndFlow() {
  console.log('\n🔍 Test 6: End-to-End Flow');
  
  try {
    // Test sequence of authenticated requests
    const endpoints = [
      '/api/user-status',
      '/api/platform-connections',
      '/api/posts'
    ];
    
    let successCount = 0;
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          timeout: TIMEOUT,
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cookie': sessionCookies
          }
        });
        
        if (response.status === 200) {
          console.log(`   ✅ ${endpoint}: Success`);
          successCount++;
        } else {
          console.log(`   ❌ ${endpoint}: Failed (${response.status})`);
        }
      } catch (error) {
        console.log(`   ❌ ${endpoint}: Failed (${error.response?.status || error.message})`);
      }
    }
    
    if (successCount === endpoints.length) {
      console.log('✅ End-to-end flow working');
      console.log(`   ${successCount}/${endpoints.length} endpoints successful`);
      
      testResults.endToEndFlow.passed = true;
      testResults.endToEndFlow.message = `All ${successCount} endpoints successful`;
    } else {
      throw new Error(`End-to-end flow partial failure: ${successCount}/${endpoints.length} successful`);
    }
    
  } catch (error) {
    console.log(`❌ End-to-end flow failed: ${error.message}`);
    testResults.endToEndFlow.message = error.message;
    throw error;
  }
}

/**
 * Main test execution
 */
async function runComprehensiveTest() {
  console.log('🚀 COMPREHENSIVE END-TO-END SYSTEM TEST');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  const tests = [
    { name: 'Session Establishment', fn: testSessionEstablishment },
    { name: 'Session Persistence', fn: testSessionPersistence },
    { name: 'Cookie Handling', fn: testCookieHandling },
    { name: 'API User Endpoint', fn: testApiUserEndpoint },
    { name: 'Auth Guard Validation', fn: testAuthGuardValidation },
    { name: 'End-to-End Flow', fn: testEndToEndFlow }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    try {
      await test.fn();
      passedTests++;
    } catch (error) {
      // Test failed, continue to next test
      console.log(`Test "${test.name}" failed, continuing...`);
    }
  }
  
  // Generate final report
  console.log('\n📊 COMPREHENSIVE END-TO-END SYSTEM TEST REPORT');
  console.log('================================================================================');
  
  for (const [testName, result] of Object.entries(testResults)) {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    const displayName = testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${status}: ${displayName}`);
    if (result.message) {
      console.log(`   Message: ${result.message}`);
    }
  }
  
  console.log('\n📈 TEST SUMMARY');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${tests.length - passedTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / tests.length) * 100)}%`);
  
  if (passedTests === tests.length) {
    console.log('\n🎉 EXCELLENT - All tests passed! System ready for production');
  } else {
    console.log('\n⚠️  Some tests failed - system requires fixes');
  }
  
  // Save detailed report
  const reportData = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    testResults,
    summary: {
      totalTests: tests.length,
      passedTests,
      failedTests: tests.length - passedTests,
      successRate: Math.round((passedTests / tests.length) * 100)
    }
  };
  
  const fs = require('fs');
  const reportPath = `COMPREHENSIVE_END_TO_END_SYSTEM_TEST_REPORT_${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
}

// Run the test
runComprehensiveTest().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});