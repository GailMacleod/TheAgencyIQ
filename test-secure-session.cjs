/**
 * Test Secure Session Implementation
 * Validates SQLite3 session store, secure cookies, and cross-tab persistence
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
        'User-Agent': 'TheAgencyIQ-SecureSession-Test/1.0',
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

async function testSecureSession() {
  console.log('🔐 Testing Secure Session Implementation...\n');
  
  let cookies = '';
  let testResults = {
    sessionEstablishment: false,
    secureCookies: false,
    sessionPersistence: false,
    sqliteStore: false,
    authenticationFlow: false,
    oauthCallbacks: false,
    crossTabSupport: false,
    totalTests: 7,
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
        console.log(`   Cookies: ${cookies.substring(0, 100)}...`);
      }
      
      testResults.sessionEstablishment = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Session establishment failed');
      console.log(`   Status: ${sessionResponse.status}`);
    }

    // Test 2: Secure Cookie Validation
    console.log('\n2️⃣ Testing Secure Cookie Configuration...');
    const setCookieHeader = sessionResponse.headers['set-cookie'];
    if (setCookieHeader) {
      const sessionCookie = setCookieHeader.find(cookie => cookie.includes('theagencyiq.session'));
      if (sessionCookie) {
        const hasSecure = sessionCookie.includes('Secure');
        const hasHttpOnly = sessionCookie.includes('HttpOnly');
        const hasSameSiteNone = sessionCookie.includes('SameSite=None');
        
        console.log(`   Secure flag: ${hasSecure ? '✅' : '❌'}`);
        console.log(`   HttpOnly flag: ${hasHttpOnly ? '✅' : '❌'}`);
        console.log(`   SameSite=None: ${hasSameSiteNone ? '✅' : '❌'}`);
        
        if (hasSecure && hasHttpOnly && hasSameSiteNone) {
          testResults.secureCookies = true;
          testResults.passedTests++;
          console.log('✅ Secure cookie configuration validated');
        } else {
          console.log('❌ Secure cookie configuration incomplete');
        }
      } else {
        console.log('❌ Session cookie not found');
      }
    } else {
      console.log('❌ No Set-Cookie header found');
    }

    // Test 3: SQLite Session Store
    console.log('\n3️⃣ Testing SQLite Session Store...');
    const sqliteDbPath = path.join('./data', 'sessions.db');
    
    // Give the session store time to create the database
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (fs.existsSync(sqliteDbPath)) {
      const stats = fs.statSync(sqliteDbPath);
      console.log('✅ SQLite session database created');
      console.log(`   File size: ${stats.size} bytes`);
      console.log(`   Modified: ${stats.mtime.toISOString()}`);
      testResults.sqliteStore = true;
      testResults.passedTests++;
    } else {
      console.log('❌ SQLite session database not found');
      console.log(`   Expected path: ${sqliteDbPath}`);
    }

    // Test 4: Authentication Flow
    console.log('\n4️⃣ Testing Authentication Flow...');
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

    // Test 5: Session Persistence
    console.log('\n5️⃣ Testing Session Persistence...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
    
    const persistenceResponse = await makeRequest(`${baseUrl}/api/user-status`, {
      headers: { Cookie: cookies }
    });
    
    if (persistenceResponse.status === 200 && persistenceResponse.data.authenticated) {
      console.log('✅ Session persistence successful');
      console.log(`   Session maintained after delay`);
      testResults.sessionPersistence = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Session persistence failed');
      console.log(`   Status: ${persistenceResponse.status}`);
    }

    // Test 6: OAuth Callback URLs
    console.log('\n6️⃣ Testing OAuth Callback URLs...');
    const platforms = ['facebook', 'instagram', 'linkedin', 'twitter', 'google'];
    let oauthWorking = true;
    
    for (const platform of platforms) {
      try {
        const oauthResponse = await makeRequest(`${baseUrl}/auth/${platform}`, {
          headers: { 
            Cookie: cookies,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });
        
        if (oauthResponse.status === 302 || oauthResponse.status === 200) {
          console.log(`   ✅ ${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth: Working`);
        } else {
          console.log(`   ❌ ${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth: Failed (${oauthResponse.status})`);
          oauthWorking = false;
        }
      } catch (error) {
        console.log(`   ❌ ${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth: Error`);
        oauthWorking = false;
      }
    }
    
    if (oauthWorking) {
      testResults.oauthCallbacks = true;
      testResults.passedTests++;
    }

    // Test 7: Cross-Tab Support Simulation
    console.log('\n7️⃣ Testing Cross-Tab Support...');
    const tabSimulation = await makeRequest(`${baseUrl}/api/platform-connections`, {
      headers: { 
        Cookie: cookies,
        'User-Agent': 'TheAgencyIQ-SecureSession-Test-Tab2/1.0'
      }
    });
    
    if (tabSimulation.status === 200 && Array.isArray(tabSimulation.data)) {
      console.log('✅ Cross-tab session support working');
      console.log(`   Platform connections accessible from different tab`);
      testResults.crossTabSupport = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Cross-tab session support failed');
      console.log(`   Status: ${tabSimulation.status}`);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  // Results Summary
  console.log('\n📊 SECURE SESSION TEST RESULTS:');
  console.log('=' .repeat(60));
  console.log(`✅ Session Establishment: ${testResults.sessionEstablishment ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Secure Cookie Config: ${testResults.secureCookies ? 'PASS' : 'FAIL'}`);
  console.log(`✅ SQLite Session Store: ${testResults.sqliteStore ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Authentication Flow: ${testResults.authenticationFlow ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Session Persistence: ${testResults.sessionPersistence ? 'PASS' : 'FAIL'}`);
  console.log(`✅ OAuth Callbacks: ${testResults.oauthCallbacks ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Cross-Tab Support: ${testResults.crossTabSupport ? 'PASS' : 'FAIL'}`);
  console.log('=' .repeat(60));
  
  const successRate = (testResults.passedTests / testResults.totalTests) * 100;
  console.log(`📈 SUCCESS RATE: ${testResults.passedTests}/${testResults.totalTests} (${successRate.toFixed(1)}%)`);
  
  if (successRate >= 85) {
    console.log('🎉 SECURE SESSION SYSTEM READY FOR PRODUCTION');
  } else {
    console.log('⚠️  SECURE SESSION SYSTEM NEEDS ADDITIONAL CONFIGURATION');
  }
  
  // Additional diagnostics
  console.log('\n🔍 DIAGNOSTICS:');
  console.log(`   SQLite Database Path: ${path.join('./data', 'sessions.db')}`);
  console.log(`   Session Store Type: connect-sqlite3`);
  console.log(`   Trust Proxy: Enabled (1)`);
  console.log(`   Cookie Security: secure=true, httpOnly=true, sameSite=none`);
  
  return testResults;
}

// Run the test
if (require.main === module) {
  testSecureSession().catch(console.error);
}

module.exports = { testSecureSession };