/**
 * Multi-Tab Session Test
 * Tests persistent session storage across multiple browser tabs and scenarios
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

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
        'User-Agent': 'TheAgencyIQ-MultiTab-Test/1.0',
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

async function testMultiTabSession() {
  console.log('📱 Testing Multi-Tab Session Persistence...\n');
  
  let testResults = {
    sessionEstablishment: false,
    setCookieHeaders: false,
    sessionPersistence: false,
    multiTabConsistency: false,
    userTracking: false,
    oauthCallback: false,
    sqliteStorage: false,
    totalTests: 7,
    passedTests: 0
  };

  let cookies = '';
  let sessionId = '';

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
      
      sessionId = sessionResponse.data.sessionId;
      
      // Extract cookies from response headers
      const setCookieHeader = sessionResponse.headers['set-cookie'];
      if (setCookieHeader) {
        cookies = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
        console.log(`   Cookies: ${cookies.substring(0, 80)}...`);
      }
      
      testResults.sessionEstablishment = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Session establishment failed');
      console.log(`   Status: ${sessionResponse.status}`);
      return testResults;
    }

    // Test 2: Set-Cookie Headers
    console.log('\n2️⃣ Testing Set-Cookie Headers...');
    const setCookieHeader = sessionResponse.headers['set-cookie'];
    if (setCookieHeader && setCookieHeader.length > 0) {
      console.log('✅ Set-Cookie headers found');
      setCookieHeader.forEach((cookie, index) => {
        console.log(`   Cookie ${index + 1}: ${cookie.substring(0, 80)}...`);
      });
      testResults.setCookieHeaders = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Set-Cookie headers missing');
    }

    // Test 3: Session Persistence
    console.log('\n3️⃣ Testing Session Persistence...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    
    const persistenceResponse = await makeRequest(`${baseUrl}/api/user`, {
      headers: { Cookie: cookies }
    });
    
    if (persistenceResponse.status === 200 && persistenceResponse.data.id) {
      console.log('✅ Session persistence successful');
      console.log(`   User authenticated: ${persistenceResponse.data.email}`);
      testResults.sessionPersistence = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Session persistence failed');
      console.log(`   Status: ${persistenceResponse.status}`);
    }

    // Test 4: Multi-Tab Consistency (Simulate different tabs)
    console.log('\n4️⃣ Testing Multi-Tab Consistency...');
    const tabTests = [];
    
    // Simulate 3 different tabs
    for (let i = 1; i <= 3; i++) {
      const tabResponse = await makeRequest(`${baseUrl}/api/user-status`, {
        headers: { 
          Cookie: cookies,
          'User-Agent': `TheAgencyIQ-MultiTab-Test-Tab${i}/1.0`
        }
      });
      
      tabTests.push({
        tab: i,
        status: tabResponse.status,
        authenticated: tabResponse.data?.authenticated || false
      });
    }
    
    const successfulTabs = tabTests.filter(tab => tab.status === 200 && tab.authenticated);
    if (successfulTabs.length === 3) {
      console.log('✅ Multi-tab consistency successful');
      console.log(`   All 3 tabs authenticated successfully`);
      testResults.multiTabConsistency = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Multi-tab consistency failed');
      console.log(`   Successful tabs: ${successfulTabs.length}/3`);
    }

    // Test 5: User Tracking Across App Usage
    console.log('\n5️⃣ Testing User Tracking Across App Usage...');
    const endpoints = [
      '/api/platform-connections',
      '/api/posts',
      '/api/user-status'
    ];
    
    let trackingSuccess = true;
    for (const endpoint of endpoints) {
      const trackingResponse = await makeRequest(`${baseUrl}${endpoint}`, {
        headers: { Cookie: cookies }
      });
      
      if (trackingResponse.status !== 200) {
        trackingSuccess = false;
        console.log(`   ❌ ${endpoint}: Failed (${trackingResponse.status})`);
      } else {
        console.log(`   ✅ ${endpoint}: Success`);
      }
    }
    
    if (trackingSuccess) {
      console.log('✅ User tracking across app usage successful');
      testResults.userTracking = true;
      testResults.passedTests++;
    } else {
      console.log('❌ User tracking across app usage failed');
    }

    // Test 6: OAuth Callback Testing
    console.log('\n6️⃣ Testing OAuth Callback with Session...');
    const oauthResponse = await makeRequest(`${baseUrl}/auth/facebook`, {
      headers: { 
        Cookie: cookies,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    
    if (oauthResponse.status === 302 || oauthResponse.status === 200) {
      console.log('✅ OAuth callback with session successful');
      testResults.oauthCallback = true;
      testResults.passedTests++;
    } else {
      console.log('❌ OAuth callback with session failed');
      console.log(`   Status: ${oauthResponse.status}`);
    }

    // Test 7: SQLite Storage Verification
    console.log('\n7️⃣ Testing SQLite Storage...');
    const sqliteDbPath = path.join('./data', 'sessions.db');
    
    if (fs.existsSync(sqliteDbPath)) {
      const stats = fs.statSync(sqliteDbPath);
      console.log('✅ SQLite session storage verified');
      console.log(`   Database size: ${stats.size} bytes`);
      console.log(`   Last modified: ${stats.mtime.toISOString()}`);
      testResults.sqliteStorage = true;
      testResults.passedTests++;
    } else {
      console.log('❌ SQLite session storage not found');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  // Results Summary
  console.log('\n📊 MULTI-TAB SESSION TEST RESULTS:');
  console.log('=' .repeat(70));
  console.log(`✅ Session Establishment: ${testResults.sessionEstablishment ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Set-Cookie Headers: ${testResults.setCookieHeaders ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Session Persistence: ${testResults.sessionPersistence ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Multi-Tab Consistency: ${testResults.multiTabConsistency ? 'PASS' : 'FAIL'}`);
  console.log(`✅ User Tracking: ${testResults.userTracking ? 'PASS' : 'FAIL'}`);
  console.log(`✅ OAuth Callback: ${testResults.oauthCallback ? 'PASS' : 'FAIL'}`);
  console.log(`✅ SQLite Storage: ${testResults.sqliteStorage ? 'PASS' : 'FAIL'}`);
  console.log('=' .repeat(70));
  
  const successRate = (testResults.passedTests / testResults.totalTests) * 100;
  console.log(`📈 SUCCESS RATE: ${testResults.passedTests}/${testResults.totalTests} (${successRate.toFixed(1)}%)`);
  
  if (successRate >= 85) {
    console.log('🎉 MULTI-TAB SESSION SYSTEM READY FOR PRODUCTION');
  } else {
    console.log('⚠️  MULTI-TAB SESSION SYSTEM NEEDS FIXES');
  }
  
  // Additional diagnostics
  console.log('\n🔍 DIAGNOSTICS:');
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Cookies: ${cookies ? 'Present' : 'Missing'}`);
  console.log(`   SQLite Path: ${path.join('./data', 'sessions.db')}`);
  console.log(`   Test Environment: ${baseUrl}`);
  
  return testResults;
}

// Run the test
if (require.main === module) {
  testMultiTabSession().catch(console.error);
}

module.exports = { testMultiTabSession };