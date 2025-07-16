/**
 * Session Integration Test - Verify frontend-backend cookie transmission
 * Tests proper signed cookie handling between browser and server
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSessionIntegration() {
  console.log('🔍 SESSION INTEGRATION TEST - Frontend-Backend Cookie Transmission');
  console.log('='.repeat(80));
  
  let testResults = {
    timestamp: new Date().toISOString(),
    tests: {},
    success: true
  };

  try {
    // Test 1: Establish session via API
    console.log('\n🔍 Test 1: Establish Session via API');
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    console.log('✅ Session established:', sessionResponse.data);
    
    // Extract cookies from response
    const setCookieHeaders = sessionResponse.headers['set-cookie'] || [];
    console.log('🍪 Set-Cookie headers received:', setCookieHeaders.length);
    
    // Parse cookies for subsequent requests
    let sessionCookie = null;
    let unsignedCookie = null;
    
    for (const cookieHeader of setCookieHeaders) {
      if (cookieHeader.includes('theagencyiq.session=') && cookieHeader.includes('s%3A')) {
        // This is the signed session cookie
        sessionCookie = cookieHeader.split(';')[0];
        console.log('🔐 Signed session cookie found:', sessionCookie);
      } else if (cookieHeader.includes('theagencyiq.session=') && !cookieHeader.includes('s%3A')) {
        // This is the unsigned session cookie
        unsignedCookie = cookieHeader.split(';')[0];
        console.log('📝 Unsigned session cookie found:', unsignedCookie);
      }
    }
    
    testResults.tests.sessionEstablishment = {
      status: 'passed',
      sessionId: sessionResponse.data.sessionId,
      hasSigned: !!sessionCookie,
      hasUnsigned: !!unsignedCookie
    };
    
    // Test 2: Test API calls with signed cookie
    console.log('\n🔍 Test 2: Test API calls with signed cookie');
    
    if (sessionCookie) {
      const userResponse = await axios.get(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': sessionCookie
        }
      });
      
      console.log('✅ /api/user with signed cookie:', userResponse.data);
      testResults.tests.signedCookieAuth = {
        status: 'passed',
        user: userResponse.data
      };
    } else {
      console.log('❌ No signed cookie available for testing');
      testResults.tests.signedCookieAuth = {
        status: 'failed',
        error: 'No signed cookie available'
      };
    }
    
    // Test 3: Test API calls with unsigned cookie
    console.log('\n🔍 Test 3: Test API calls with unsigned cookie');
    
    if (unsignedCookie) {
      try {
        const userResponse = await axios.get(`${BASE_URL}/api/user`, {
          headers: {
            'Cookie': unsignedCookie
          }
        });
        
        console.log('✅ /api/user with unsigned cookie:', userResponse.data);
        testResults.tests.unsignedCookieAuth = {
          status: 'passed',
          user: userResponse.data
        };
      } catch (error) {
        console.log('❌ /api/user with unsigned cookie failed:', error.response?.status);
        testResults.tests.unsignedCookieAuth = {
          status: 'failed',
          error: error.response?.status || 'Unknown error'
        };
      }
    } else {
      console.log('❌ No unsigned cookie available for testing');
      testResults.tests.unsignedCookieAuth = {
        status: 'failed',
        error: 'No unsigned cookie available'
      };
    }
    
    // Test 4: Test browser-style credentials inclusion
    console.log('\n🔍 Test 4: Test browser-style credentials inclusion');
    
    // Create axios instance with credentials
    const axiosWithCredentials = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // First establish session
    await axiosWithCredentials.post('/api/establish-session', {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    // Then test API call (cookies should be automatically included)
    try {
      const userResponse = await axiosWithCredentials.get('/api/user');
      console.log('✅ /api/user with credentials: included:', userResponse.data);
      testResults.tests.credentialsIncluded = {
        status: 'passed',
        user: userResponse.data
      };
    } catch (error) {
      console.log('❌ /api/user with credentials failed:', error.response?.status);
      testResults.tests.credentialsIncluded = {
        status: 'failed',
        error: error.response?.status || 'Unknown error'
      };
    }
    
    // Generate summary
    const passedTests = Object.values(testResults.tests).filter(t => t.status === 'passed').length;
    const totalTests = Object.keys(testResults.tests).length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log('\n📊 SESSION INTEGRATION TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Tests Passed: ${passedTests}/${totalTests} (${successRate}%)`);
    console.log(`⏱️  Duration: ${new Date().toISOString()}`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED - Session integration working correctly!');
    } else {
      console.log('❌ Some tests failed - Session integration needs attention');
      testResults.success = false;
    }
    
  } catch (error) {
    console.error('❌ Session integration test failed:', error.message);
    testResults.success = false;
    testResults.error = error.message;
  }
  
  // Save results
  const reportPath = `SESSION_INTEGRATION_TEST_REPORT_${Date.now()}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  console.log(`📄 Test report saved to: ${reportPath}`);
  
  return testResults;
}

// Run the test
testSessionIntegration().then(results => {
  process.exit(results.success ? 0 : 1);
});