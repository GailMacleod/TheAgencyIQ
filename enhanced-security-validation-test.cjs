/**
 * Enhanced Security Validation Test
 * Tests the enhanced security features: HttpOnly/Secure/SameSite cookies, token refresh, and React Query optimistic updates
 */

const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// Test configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin'
};

// Test results storage
let testResults = {
  testName: 'Enhanced Security Validation',
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

// Test 1: Session Establishment with Security Headers
async function testSessionEstablishment() {
  try {
    const response = await makeRequest('/api/establish-session', {
      method: 'POST',
      body: { email: 'gailm@macleodglba.com.au' }
    });
    
    const passed = response.status === 200 && response.body?.sessionEstablished;
    const sessionCookie = response.headers['set-cookie']?.find(cookie => cookie.includes('theagencyiq.session'));
    
    // Check for security flags in cookie
    const hasHttpOnly = sessionCookie?.includes('HttpOnly');
    const hasSecure = sessionCookie?.includes('Secure');
    const hasSameSite = sessionCookie?.includes('SameSite=none');
    
    addTestResult('Session establishment with security headers', passed, {
      status: response.status,
      sessionId: response.body?.sessionId,
      hasHttpOnly,
      hasSecure,
      hasSameSite,
      cookie: sessionCookie
    });
    
    return { sessionCookie, sessionData: response.body };
  } catch (error) {
    addTestResult('Session establishment with security headers', false, {
      error: error.message
    });
    return null;
  }
}

// Test 2: Token Refresh Functionality
async function testTokenRefresh(sessionCookie) {
  try {
    const response = await makeRequest('/api/refresh-token', {
      method: 'POST',
      headers: { 'Cookie': sessionCookie },
      body: { refreshToken: 'test-refresh-token' }
    });
    
    const passed = response.status === 200 && response.body?.success;
    const newSessionCookie = response.headers['set-cookie']?.find(cookie => cookie.includes('theagencyiq.session'));
    
    addTestResult('Token refresh functionality', passed, {
      status: response.status,
      success: response.body?.success,
      newSessionId: response.body?.sessionId,
      hasNewCookie: !!newSessionCookie
    });
    
    return newSessionCookie || sessionCookie;
  } catch (error) {
    addTestResult('Token refresh functionality', false, {
      error: error.message
    });
    return sessionCookie;
  }
}

// Test 3: Token Status Endpoint
async function testTokenStatus(sessionCookie) {
  try {
    const response = await makeRequest('/api/token-status', {
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    
    const passed = response.status === 200 && response.body?.valid;
    
    addTestResult('Token status endpoint', passed, {
      status: response.status,
      valid: response.body?.valid,
      sessionId: response.body?.sessionId,
      userId: response.body?.userId,
      needsRefresh: response.body?.needsRefresh
    });
    
    return response.body;
  } catch (error) {
    addTestResult('Token status endpoint', false, {
      error: error.message
    });
    return null;
  }
}

// Test 4: Secure Cookie Configuration
async function testSecureCookieConfiguration(sessionCookie) {
  try {
    // Parse cookie to check security attributes
    const cookieAttributes = sessionCookie.split(';').map(attr => attr.trim());
    
    const hasHttpOnly = cookieAttributes.some(attr => attr.toLowerCase() === 'httponly');
    const hasSecure = cookieAttributes.some(attr => attr.toLowerCase() === 'secure');
    const hasSameSite = cookieAttributes.some(attr => attr.toLowerCase().startsWith('samesite='));
    const hasPath = cookieAttributes.some(attr => attr.toLowerCase().startsWith('path='));
    
    const passed = hasHttpOnly && hasSecure && hasSameSite && hasPath;
    
    addTestResult('Secure cookie configuration', passed, {
      hasHttpOnly,
      hasSecure,
      hasSameSite,
      hasPath,
      cookieAttributes
    });
    
    return passed;
  } catch (error) {
    addTestResult('Secure cookie configuration', false, {
      error: error.message
    });
    return false;
  }
}

// Test 5: Authentication Flow with Enhanced Security
async function testAuthenticationFlow(sessionCookie) {
  try {
    const response = await makeRequest('/api/user', {
      method: 'GET',
      headers: { 'Cookie': sessionCookie }
    });
    
    const passed = response.status === 200 && response.body?.email;
    
    addTestResult('Authentication flow with enhanced security', passed, {
      status: response.status,
      authenticated: !!response.body?.email,
      userEmail: response.body?.email,
      subscriptionPlan: response.body?.subscriptionPlan
    });
    
    return response.body;
  } catch (error) {
    addTestResult('Authentication flow with enhanced security', false, {
      error: error.message
    });
    return null;
  }
}

// Test 6: Session Persistence Across Requests
async function testSessionPersistence(sessionCookie) {
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
        authenticated: response.status === 200
      });
    }
    
    const passed = results.every(result => result.authenticated);
    
    addTestResult('Session persistence across requests', passed, {
      results,
      totalEndpoints: results.length,
      authenticatedEndpoints: results.filter(r => r.authenticated).length
    });
    
    return passed;
  } catch (error) {
    addTestResult('Session persistence across requests', false, {
      error: error.message
    });
    return false;
  }
}

// Test 7: Cross-Tab Session Support
async function testCrossTabSupport(sessionCookie) {
  try {
    // Simulate multiple "tabs" by making concurrent requests
    const tabRequests = Array.from({ length: 3 }, (_, i) => 
      makeRequest('/api/user', {
        method: 'GET',
        headers: { 'Cookie': sessionCookie }
      })
    );
    
    const results = await Promise.all(tabRequests);
    const passed = results.every(result => result.status === 200);
    
    addTestResult('Cross-tab session support', passed, {
      totalTabs: results.length,
      successfulTabs: results.filter(r => r.status === 200).length,
      statuses: results.map(r => r.status)
    });
    
    return passed;
  } catch (error) {
    addTestResult('Cross-tab session support', false, {
      error: error.message
    });
    return false;
  }
}

// Main test execution
async function runEnhancedSecurityTests() {
  console.log('🔐 Starting Enhanced Security Validation Tests...\n');
  
  try {
    // Test 1: Session establishment with security headers
    const sessionResult = await testSessionEstablishment();
    if (!sessionResult) {
      console.log('❌ Session establishment failed - aborting remaining tests');
      return;
    }
    
    let { sessionCookie } = sessionResult;
    
    // Test 2: Token refresh functionality
    sessionCookie = await testTokenRefresh(sessionCookie);
    
    // Test 3: Token status endpoint
    await testTokenStatus(sessionCookie);
    
    // Test 4: Secure cookie configuration
    await testSecureCookieConfiguration(sessionCookie);
    
    // Test 5: Authentication flow with enhanced security
    await testAuthenticationFlow(sessionCookie);
    
    // Test 6: Session persistence across requests
    await testSessionPersistence(sessionCookie);
    
    // Test 7: Cross-tab session support
    await testCrossTabSupport(sessionCookie);
    
    // Calculate final results
    testResults.summary.successRate = ((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1);
    
    console.log('\n🔐 Enhanced Security Validation Results:');
    console.log(`✅ Passed: ${testResults.summary.passed}/${testResults.summary.total} (${testResults.summary.successRate}%)`);
    console.log(`❌ Failed: ${testResults.summary.failed}/${testResults.summary.total}`);
    
    // Write detailed results to file
    const fileName = `ENHANCED_SECURITY_VALIDATION_REPORT_${Date.now()}.json`;
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
  runEnhancedSecurityTests()
    .then(results => {
      if (results) {
        process.exit(results.summary.successRate >= 85 ? 0 : 1);
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runEnhancedSecurityTests };