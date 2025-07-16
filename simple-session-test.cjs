/**
 * Simple Session Test - Quick validation of core session functionality
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TheAgencyIQ-SimpleSession-Test/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data ? JSON.parse(data) : null
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    
    if (options.data) {
      req.write(JSON.stringify(options.data));
    }
    
    req.end();
  });
}

async function testSimpleSession() {
  console.log('🧪 Testing Session and Authentication Fixes...\n');
  
  let cookies = '';
  let testResults = {
    sessionEstablishment: false,
    manifestHandling: false,
    authenticationFlow: false,
    totalTests: 3,
    passedTests: 0
  };

  try {
    // Test 1: Session Establishment
    console.log('1️⃣ Testing Session Establishment...');
    const sessionResponse = await makeRequest(`${baseUrl}/api/establish-session`, {
      method: 'POST',
      data: { email: 'gailm@macleodglba.com.au' }
    });
    
    if (sessionResponse.status === 200 && sessionResponse.data.sessionEstablished) {
      console.log('✅ Session establishment successful');
      console.log(`   User: ${sessionResponse.data.user.email}`);
      console.log(`   Session ID: ${sessionResponse.data.sessionId}`);
      
      // Extract cookies from response
      const setCookieHeader = sessionResponse.headers['set-cookie'];
      if (setCookieHeader) {
        cookies = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
        console.log(`   Cookies set: ${cookies.substring(0, 100)}...`);
      }
      
      testResults.sessionEstablishment = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Session establishment failed');
      console.log(`   Status: ${sessionResponse.status}`);
    }

    // Test 2: Manifest.json Handling
    console.log('\n2️⃣ Testing Manifest.json Handling...');
    const manifestResponse = await makeRequest(`${baseUrl}/manifest.json`);
    
    if (manifestResponse.status === 200 && manifestResponse.data.name) {
      console.log('✅ Manifest.json properly served');
      console.log(`   App Name: ${manifestResponse.data.name}`);
      testResults.manifestHandling = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Manifest.json handling failed');
      console.log(`   Status: ${manifestResponse.status}`);
    }

    // Test 3: Authentication Flow
    console.log('\n3️⃣ Testing Authentication Flow...');
    const userResponse = await makeRequest(`${baseUrl}/api/user`, {
      headers: { Cookie: cookies }
    });
    
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

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  // Results Summary
  console.log('\n📊 TEST RESULTS SUMMARY:');
  console.log('=' .repeat(50));
  console.log(`✅ Session Establishment: ${testResults.sessionEstablishment ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Manifest.json Handling: ${testResults.manifestHandling ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Authentication Flow: ${testResults.authenticationFlow ? 'PASS' : 'FAIL'}`);
  console.log('=' .repeat(50));
  
  const successRate = (testResults.passedTests / testResults.totalTests) * 100;
  console.log(`📈 SUCCESS RATE: ${testResults.passedTests}/${testResults.totalTests} (${successRate.toFixed(1)}%)`);
  
  if (successRate === 100) {
    console.log('🎉 SYSTEM READY FOR DEPLOYMENT');
  } else {
    console.log('⚠️  SYSTEM NEEDS ADDITIONAL FIXES');
  }
  
  return testResults;
}

// Run the test
if (require.main === module) {
  testSimpleSession().catch(console.error);
}

module.exports = { testSimpleSession };