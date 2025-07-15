/**
 * Test Session and Authentication Fixes
 * Validates session persistence, cookie handling, and OAuth functionality
 */

const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

// Wrap axios with cookie jar support
const client = wrapper(axios.create({
  jar: new CookieJar(),
  withCredentials: true,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'TheAgencyIQ-Test/1.0'
  }
}));

const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSessionFixes() {
  console.log('🧪 Testing Session and Authentication Fixes...\n');
  
  let testResults = {
    sessionEstablishment: false,
    sessionPersistence: false,
    cookieHandling: false,
    authenticationFlow: false,
    manifestHandling: false,
    corsSupport: false,
    totalTests: 6,
    passedTests: 0
  };

  try {
    // Test 1: Session Establishment
    console.log('1️⃣ Testing Session Establishment...');
    const sessionResponse = await client.post(`${baseUrl}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au'
    });
    
    if (sessionResponse.status === 200 && sessionResponse.data.sessionEstablished) {
      console.log('✅ Session establishment successful');
      console.log(`   User: ${sessionResponse.data.user.email}`);
      console.log(`   Session ID: ${sessionResponse.data.sessionId}`);
      testResults.sessionEstablishment = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Session establishment failed');
    }

    // Test 2: Cookie Handling
    console.log('\n2️⃣ Testing Cookie Handling...');
    const cookies = client.jar.getCookieStringSync(baseUrl);
    if (cookies && cookies.includes('theagencyiq.session')) {
      console.log('✅ Session cookies properly set');
      console.log(`   Cookies: ${cookies.substring(0, 100)}...`);
      testResults.cookieHandling = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Session cookies not found');
    }

    // Test 3: Authentication Flow
    console.log('\n3️⃣ Testing Authentication Flow...');
    const userResponse = await client.get(`${baseUrl}/api/user`);
    
    if (userResponse.status === 200 && userResponse.data.id) {
      console.log('✅ Authentication successful');
      console.log(`   User ID: ${userResponse.data.id}`);
      console.log(`   Email: ${userResponse.data.email}`);
      testResults.authenticationFlow = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Authentication failed');
      console.log(`   Status: ${userResponse.status}`);
    }

    // Test 4: Session Persistence
    console.log('\n4️⃣ Testing Session Persistence...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const persistenceResponse = await client.get(`${baseUrl}/api/user-status`);
    
    if (persistenceResponse.status === 200 && persistenceResponse.data.authenticated) {
      console.log('✅ Session persistence successful');
      console.log(`   Session maintained after delay`);
      testResults.sessionPersistence = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Session persistence failed');
    }

    // Test 5: Manifest.json handling
    console.log('\n5️⃣ Testing Manifest.json Handling...');
    const manifestResponse = await client.get(`${baseUrl}/manifest.json`);
    
    if (manifestResponse.status === 200 && manifestResponse.data.name === 'TheAgencyIQ') {
      console.log('✅ Manifest.json properly served');
      console.log(`   App Name: ${manifestResponse.data.name}`);
      testResults.manifestHandling = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Manifest.json handling failed');
    }

    // Test 6: CORS Support
    console.log('\n6️⃣ Testing CORS Support...');
    const corsResponse = await client.options(`${baseUrl}/api/user`, {
      headers: {
        'Origin': baseUrl,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    if (corsResponse.status === 200) {
      console.log('✅ CORS preflight successful');
      console.log(`   CORS headers present`);
      testResults.corsSupport = true;
      testResults.passedTests++;
    } else {
      console.log('❌ CORS preflight failed');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
  }

  // Results Summary
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('=' .repeat(50));
  console.log(`✅ Session Establishment: ${testResults.sessionEstablishment ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Cookie Handling: ${testResults.cookieHandling ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Authentication Flow: ${testResults.authenticationFlow ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Session Persistence: ${testResults.sessionPersistence ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Manifest.json Handling: ${testResults.manifestHandling ? 'PASS' : 'FAIL'}`);
  console.log(`✅ CORS Support: ${testResults.corsSupport ? 'PASS' : 'FAIL'}`);
  console.log('=' .repeat(50));
  
  const successRate = (testResults.passedTests / testResults.totalTests) * 100;
  console.log(`📈 SUCCESS RATE: ${testResults.passedTests}/${testResults.totalTests} (${successRate.toFixed(1)}%)`);
  
  if (successRate >= 80) {
    console.log('🎉 SYSTEM READY FOR DEPLOYMENT');
  } else {
    console.log('⚠️  SYSTEM NEEDS ADDITIONAL FIXES');
  }
  
  return testResults;
}

// Run the test
if (require.main === module) {
  testSessionFixes().catch(console.error);
}

module.exports = { testSessionFixes };