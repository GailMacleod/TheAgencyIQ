/**
 * Authentication Fix Test - Validate Cookie Transmission and Session Persistence
 * Tests the fix for missing Set-Cookie headers and 401 authentication errors
 */

const axios = require('axios');
const tough = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

// Base URL for the application
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

// Create axios instance with cookie jar support
const cookieJar = new tough.CookieJar();
const client = wrapper(axios.create({ jar: cookieJar }));

async function testAuthenticationFix() {
  console.log('🔧 Testing Authentication Fix - Cookie Transmission and Session Persistence');
  console.log('=' .repeat(80));

  const testResults = {
    sessionEstablishment: false,
    cookieTransmission: false,
    userEndpoint: false,
    userStatusEndpoint: false,
    sessionPersistence: false
  };

  try {
    // Test 1: Establish session
    console.log('\n📝 Test 1: Session Establishment');
    const sessionResponse = await client.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au'
    });

    if (sessionResponse.status === 200 && sessionResponse.data.sessionEstablished) {
      console.log('✅ Session established successfully');
      console.log(`   User ID: ${sessionResponse.data.user.id}`);
      console.log(`   Email: ${sessionResponse.data.user.email}`);
      console.log(`   Session ID: ${sessionResponse.data.sessionId}`);
      testResults.sessionEstablishment = true;
    } else {
      console.log('❌ Session establishment failed');
      console.log(`   Status: ${sessionResponse.status}`);
      console.log(`   Response: ${JSON.stringify(sessionResponse.data)}`);
    }

    // Test 2: Check cookie transmission
    console.log('\n🍪 Test 2: Cookie Transmission Check');
    const cookies = await cookieJar.getCookies(BASE_URL);
    const sessionCookie = cookies.find(c => c.key === 'theagencyiq.session');
    
    if (sessionCookie) {
      console.log('✅ Session cookie found');
      console.log(`   Cookie: ${sessionCookie.toString()}`);
      testResults.cookieTransmission = true;
    } else {
      console.log('❌ No session cookie found');
      console.log(`   All cookies: ${cookies.map(c => c.toString()).join(', ')}`);
    }

    // Test 3: Test /api/user endpoint
    console.log('\n👤 Test 3: /api/user Endpoint');
    try {
      const userResponse = await client.get(`${BASE_URL}/api/user`);
      if (userResponse.status === 200) {
        console.log('✅ /api/user endpoint working');
        console.log(`   User data: ${JSON.stringify(userResponse.data)}`);
        testResults.userEndpoint = true;
      } else {
        console.log('❌ /api/user endpoint failed');
        console.log(`   Status: ${userResponse.status}`);
      }
    } catch (error) {
      console.log('❌ /api/user endpoint error');
      console.log(`   Status: ${error.response?.status || 'Network error'}`);
      console.log(`   Message: ${error.response?.data?.message || error.message}`);
    }

    // Test 4: Test /api/user-status endpoint
    console.log('\n📊 Test 4: /api/user-status Endpoint');
    try {
      const statusResponse = await client.get(`${BASE_URL}/api/user-status`);
      if (statusResponse.status === 200) {
        console.log('✅ /api/user-status endpoint working');
        console.log(`   Status data: ${JSON.stringify(statusResponse.data)}`);
        testResults.userStatusEndpoint = true;
      } else {
        console.log('❌ /api/user-status endpoint failed');
        console.log(`   Status: ${statusResponse.status}`);
      }
    } catch (error) {
      console.log('❌ /api/user-status endpoint error');
      console.log(`   Status: ${error.response?.status || 'Network error'}`);
      console.log(`   Message: ${error.response?.data?.message || error.message}`);
    }

    // Test 5: Session persistence test
    console.log('\n🔄 Test 5: Session Persistence');
    setTimeout(async () => {
      try {
        const persistenceResponse = await client.get(`${BASE_URL}/api/user`);
        if (persistenceResponse.status === 200) {
          console.log('✅ Session persistence working');
          testResults.sessionPersistence = true;
        } else {
          console.log('❌ Session persistence failed');
        }
        
        generateTestReport(testResults);
      } catch (error) {
        console.log('❌ Session persistence error');
        console.log(`   Status: ${error.response?.status || 'Network error'}`);
        generateTestReport(testResults);
      }
    }, 2000);

  } catch (error) {
    console.error('❌ Test execution error:', error.message);
    generateTestReport(testResults);
  }
}

function generateTestReport(results) {
  console.log('\n📊 Authentication Fix Test Report');
  console.log('=' .repeat(50));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(r => r === true).length;
  const successRate = Math.round((passedTests / totalTests) * 100);
  
  console.log(`Success Rate: ${successRate}% (${passedTests}/${totalTests} tests passed)`);
  console.log('\nDetailed Results:');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`  ${test}: ${status}`);
  });
  
  console.log('\n🎯 Summary:');
  if (successRate >= 80) {
    console.log('✅ Authentication fix is working correctly');
    console.log('   Cookie transmission and session persistence are operational');
  } else {
    console.log('❌ Authentication fix needs additional work');
    console.log('   Review session middleware and cookie handling');
  }
  
  console.log('\n' + '=' .repeat(50));
}

// Run the test
if (require.main === module) {
  testAuthenticationFix();
}

module.exports = { testAuthenticationFix };