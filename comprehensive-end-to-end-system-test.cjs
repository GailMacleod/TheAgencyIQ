const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const TEST_USER = {
  email: 'gailm@macleodglba.com.au',
  phone: '+61424835189',
  id: 2
};

// Configure axios with credentials
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Test results tracking
let testResults = [];
let sessionCookie = null;
let sessionId = null;

function logTest(testName, success, details = {}) {
  const result = {
    test: testName,
    success,
    timestamp: new Date().toISOString(),
    details
  };
  testResults.push(result);
  console.log(`${success ? '✅' : '❌'} ${testName}: ${success ? 'PASSED' : 'FAILED'}`);
  if (!success) {
    console.log(`   Error: ${details.error || 'Unknown error'}`);
  }
}

async function testSessionEstablishment() {
  try {
    const response = await client.post('/api/establish-session', {
      email: TEST_USER.email,
      phone: TEST_USER.phone,
      userId: TEST_USER.id
    });

    if (response.status === 200 && response.data.sessionEstablished) {
      sessionId = response.data.sessionId;
      
      // Extract session cookie from response headers
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        sessionCookie = cookies.find(cookie => cookie.includes('theagencyiq.session'));
        if (sessionCookie) {
          // Set cookie for future requests
          client.defaults.headers.Cookie = sessionCookie;
        }
      }
      
      logTest('Session Establishment', true, {
        sessionId,
        user: response.data.user,
        hasCookie: !!sessionCookie
      });
      return true;
    } else {
      logTest('Session Establishment', false, {
        status: response.status,
        data: response.data
      });
      return false;
    }
  } catch (error) {
    logTest('Session Establishment', false, {
      error: error.message,
      status: error.response?.status
    });
    return false;
  }
}

async function testAuthenticatedEndpoints() {
  const endpoints = [
    '/api/user',
    '/api/user-status',
    '/api/platform-connections',
    '/api/posts',
    '/api/brand-purpose'
  ];

  let successCount = 0;
  
  for (const endpoint of endpoints) {
    try {
      const response = await client.get(endpoint);
      
      if (response.status === 200) {
        logTest(`Authenticated Endpoint ${endpoint}`, true, {
          status: response.status,
          hasData: !!response.data
        });
        successCount++;
      } else {
        logTest(`Authenticated Endpoint ${endpoint}`, false, {
          status: response.status,
          data: response.data
        });
      }
    } catch (error) {
      logTest(`Authenticated Endpoint ${endpoint}`, false, {
        error: error.message,
        status: error.response?.status
      });
    }
  }
  
  const overallSuccess = successCount === endpoints.length;
  logTest('All Authenticated Endpoints', overallSuccess, {
    successCount,
    totalEndpoints: endpoints.length
  });
  
  return overallSuccess;
}

async function testHTMLContentRendering() {
  try {
    const response = await client.get('/');
    
    if (response.status === 200 && response.data.includes('<html')) {
      logTest('HTML Content Rendering', true, {
        status: response.status,
        hasHTML: true,
        contentLength: response.data.length
      });
      return true;
    } else {
      logTest('HTML Content Rendering', false, {
        status: response.status,
        hasHTML: response.data.includes('<html'),
        contentLength: response.data.length
      });
      return false;
    }
  } catch (error) {
    logTest('HTML Content Rendering', false, {
      error: error.message,
      status: error.response?.status
    });
    return false;
  }
}

async function testSessionPersistence() {
  try {
    // Make another request to verify session persists
    const response = await client.get('/api/user');
    
    if (response.status === 200) {
      logTest('Session Persistence', true, {
        status: response.status,
        user: response.data
      });
      return true;
    } else {
      logTest('Session Persistence', false, {
        status: response.status,
        data: response.data
      });
      return false;
    }
  } catch (error) {
    logTest('Session Persistence', false, {
      error: error.message,
      status: error.response?.status
    });
    return false;
  }
}

async function testCookieTransmission() {
  try {
    // Test if cookies are being sent properly
    const response = await client.get('/api/user-status');
    
    if (response.status === 200) {
      logTest('Cookie Transmission', true, {
        status: response.status,
        hasSessionCookie: !!sessionCookie,
        data: response.data
      });
      return true;
    } else {
      logTest('Cookie Transmission', false, {
        status: response.status,
        hasSessionCookie: !!sessionCookie,
        data: response.data
      });
      return false;
    }
  } catch (error) {
    logTest('Cookie Transmission', false, {
      error: error.message,
      status: error.response?.status,
      hasSessionCookie: !!sessionCookie
    });
    return false;
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive End-to-End System Test');
  console.log('=' + '='.repeat(60));
  
  const startTime = Date.now();
  
  // Test sequence
  const sessionOk = await testSessionEstablishment();
  
  if (sessionOk) {
    await testAuthenticatedEndpoints();
    await testSessionPersistence();
    await testCookieTransmission();
  }
  
  await testHTMLContentRendering();
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  // Calculate success rate
  const successCount = testResults.filter(r => r.success).length;
  const totalTests = testResults.length;
  const successRate = (successCount / totalTests * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('=' + '='.repeat(60));
  console.log(`✅ Tests Passed: ${successCount}/${totalTests}`);
  console.log(`📈 Success Rate: ${successRate}%`);
  console.log(`⏱️  Duration: ${duration}ms`);
  console.log(`🔐 Session ID: ${sessionId || 'Not established'}`);
  console.log(`🍪 Session Cookie: ${sessionCookie ? 'Present' : 'Missing'}`);
  
  // Save detailed results
  const reportPath = path.join(__dirname, `COMPREHENSIVE_END_TO_END_SYSTEM_TEST_REPORT_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalTests,
      successCount,
      successRate: parseFloat(successRate),
      duration,
      sessionId,
      hasSessionCookie: !!sessionCookie
    },
    tests: testResults,
    timestamp: new Date().toISOString()
  }, null, 2));
  
  console.log(`📄 Detailed report saved: ${reportPath}`);
  
  if (successRate === '100.0') {
    console.log('🎉 ALL TESTS PASSED - SYSTEM READY FOR DEPLOYMENT');
  } else {
    console.log('⚠️  SOME TESTS FAILED - AUTHENTICATION ISSUES DETECTED');
  }
  
  return successRate === '100.0';
}

// Run the test
runComprehensiveTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});