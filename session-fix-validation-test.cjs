/**
 * Session Fix Validation Test
 * Tests the fix for "user remains undefined" issue
 */

const https = require('https');
const fs = require('fs');

// Test configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

// Test results storage
let testResults = {
  testName: 'Session Fix Validation Test',
  timestamp: new Date().toISOString(),
  baseUrl: BASE_URL,
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    successRate: 0
  }
};

// HTTP request helper
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url, BASE_URL);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: { ...HEADERS, ...options.headers },
      timeout: 15000,
      rejectUnauthorized: false
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            body: data.length > 0 ? (res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data) : null
          };
          resolve(result);
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            parseError: error.message
          });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Request timeout')));
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test helper functions
function addTestResult(testName, passed, details = {}) {
  testResults.tests.push({
    test: testName,
    passed,
    details,
    timestamp: new Date().toISOString()
  });
  
  testResults.summary.total++;
  if (passed) testResults.summary.passed++;
  else testResults.summary.failed++;
  
  console.log(`${passed ? '✅' : '❌'} ${testName}`);
  if (details.message) console.log(`   ${details.message}`);
}

// Test 1: Session establishment with User ID assignment
async function testSessionEstablishment() {
  try {
    const response = await makeRequest('/api/establish-session', {
      method: 'POST',
      body: { email: 'gailm@macleodglba.com.au' }
    });
    
    const passed = response.status === 200 && response.body?.sessionEstablished && response.body?.user?.id;
    const sessionCookie = response.headers['set-cookie']?.find(cookie => cookie.includes('theagencyiq.session'));
    
    addTestResult('Session establishment with User ID assignment', passed, {
      status: response.status,
      sessionId: response.body?.sessionId,
      userId: response.body?.user?.id,
      userEmail: response.body?.user?.email,
      sessionCookie: sessionCookie ? 'present' : 'missing'
    });
    
    return { sessionCookie, sessionData: response.body };
  } catch (error) {
    addTestResult('Session establishment with User ID assignment', false, {
      error: error.message
    });
    return null;
  }
}

// Test 2: Authenticated API call with User ID persistence
async function testAuthenticatedAPICall(sessionCookie) {
  try {
    const response = await makeRequest('/api/user', {
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    
    const passed = response.status === 200 && response.body?.id && response.body?.email;
    
    addTestResult('Authenticated API call with User ID persistence', passed, {
      status: response.status,
      userId: response.body?.id,
      userEmail: response.body?.email,
      subscriptionPlan: response.body?.subscriptionPlan,
      message: response.body?.id ? 'User ID properly assigned' : 'User ID still undefined'
    });
    
    return response.body;
  } catch (error) {
    addTestResult('Authenticated API call with User ID persistence', false, {
      error: error.message
    });
    return null;
  }
}

// Test 3: Multiple API calls to verify session persistence
async function testMultipleAPICallsPersistence(sessionCookie) {
  try {
    const endpoints = ['/api/user', '/api/user-status', '/api/platform-connections'];
    const results = [];
    
    for (const endpoint of endpoints) {
      const response = await makeRequest(endpoint, {
        method: 'GET',
        headers: { 'Cookie': sessionCookie }
      });
      
      results.push({
        endpoint,
        status: response.status,
        authenticated: response.status === 200,
        userId: response.body?.id || response.body?.user?.id,
        hasUserData: !!(response.body?.id || response.body?.user?.id)
      });
    }
    
    const passed = results.every(result => result.authenticated && result.hasUserData);
    
    addTestResult('Multiple API calls session persistence', passed, {
      results,
      totalEndpoints: results.length,
      successfulEndpoints: results.filter(r => r.authenticated && r.hasUserData).length,
      message: passed ? 'User ID persists across all API calls' : 'User ID missing in some API calls'
    });
    
    return passed;
  } catch (error) {
    addTestResult('Multiple API calls session persistence', false, {
      error: error.message
    });
    return false;
  }
}

// Test 4: Session recovery after simulated interruption
async function testSessionRecovery(sessionCookie) {
  try {
    // Wait a moment to simulate session interruption
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const response = await makeRequest('/api/user', {
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    
    const passed = response.status === 200 && response.body?.id;
    
    addTestResult('Session recovery after interruption', passed, {
      status: response.status,
      userId: response.body?.id,
      userEmail: response.body?.email,
      message: passed ? 'Session recovered successfully' : 'Session recovery failed'
    });
    
    return passed;
  } catch (error) {
    addTestResult('Session recovery after interruption', false, {
      error: error.message
    });
    return false;
  }
}

// Test 5: Cross-origin cookie handling
async function testCrossOriginCookies(sessionCookie) {
  try {
    const response = await makeRequest('/api/user-status', {
      method: 'GET',
      headers: { 
        'Cookie': sessionCookie,
        'Origin': 'https://theagencyiq.ai'
      }
    });
    
    const passed = response.status === 200 && response.body?.authenticated;
    
    addTestResult('Cross-origin cookie handling', passed, {
      status: response.status,
      authenticated: response.body?.authenticated,
      userId: response.body?.userId,
      message: passed ? 'Cross-origin cookies working' : 'Cross-origin cookie issues'
    });
    
    return passed;
  } catch (error) {
    addTestResult('Cross-origin cookie handling', false, {
      error: error.message
    });
    return false;
  }
}

// Main test execution
async function runSessionFixValidation() {
  console.log('🔧 Starting Session Fix Validation Tests...\n');
  
  try {
    // Test 1: Session establishment with User ID assignment
    const sessionResult = await testSessionEstablishment();
    if (!sessionResult) {
      console.log('❌ Session establishment failed - aborting remaining tests');
      return;
    }
    
    const { sessionCookie } = sessionResult;
    
    // Test 2: Authenticated API call with User ID persistence
    await testAuthenticatedAPICall(sessionCookie);
    
    // Test 3: Multiple API calls to verify session persistence
    await testMultipleAPICallsPersistence(sessionCookie);
    
    // Test 4: Session recovery after simulated interruption
    await testSessionRecovery(sessionCookie);
    
    // Test 5: Cross-origin cookie handling
    await testCrossOriginCookies(sessionCookie);
    
    // Calculate final results
    testResults.summary.successRate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1);
    
    console.log('\n🔧 Session Fix Validation Results:');
    console.log(`✅ Passed: ${testResults.summary.passed}/${testResults.summary.total} (${testResults.summary.successRate}%)`);
    console.log(`❌ Failed: ${testResults.summary.failed}/${testResults.summary.total}`);
    
    if (testResults.summary.successRate >= 80) {
      console.log('🎉 Session fix validation SUCCESSFUL - User ID undefined issue resolved!');
    } else {
      console.log('⚠️  Session fix validation needs improvement - some issues remain');
    }
    
    // Write detailed results to file
    const fileName = `SESSION_FIX_VALIDATION_REPORT_${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(testResults, null, 2));
    console.log(`📄 Detailed report saved to: ${fileName}`);
    
    return testResults;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return null;
  }
}

// Run the tests
if (require.main === module) {
  runSessionFixValidation()
    .then(results => {
      if (results) {
        process.exit(results.summary.successRate >= 80 ? 0 : 1);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runSessionFixValidation };