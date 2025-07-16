/**
 * OAuth and Platform Connection Test
 * Validates OAuth endpoints and platform connections
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
        'User-Agent': 'TheAgencyIQ-OAuth-Test/1.0',
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

async function testOAuthSystem() {
  console.log('🔐 Testing OAuth and Platform Connection System...\n');
  
  let cookies = '';
  let testResults = {
    sessionAuth: false,
    platformConnections: false,
    oauthRedirects: false,
    totalTests: 3,
    passedTests: 0
  };

  try {
    // First establish session
    console.log('🔑 Establishing authenticated session...');
    const sessionResponse = await makeRequest(`${baseUrl}/api/establish-session`, {
      method: 'POST',
      data: { email: 'gailm@macleodglba.com.au' }
    });
    
    if (sessionResponse.status === 200 && sessionResponse.data.sessionEstablished) {
      const setCookieHeader = sessionResponse.headers['set-cookie'];
      if (setCookieHeader) {
        cookies = setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ');
      }
      testResults.sessionAuth = true;
      testResults.passedTests++;
      console.log('✅ Session authenticated successfully');
    } else {
      console.log('❌ Session authentication failed');
      return testResults;
    }

    // Test 1: Platform Connections
    console.log('\n1️⃣ Testing Platform Connections...');
    const connectionsResponse = await makeRequest(`${baseUrl}/api/platform-connections`, {
      headers: { Cookie: cookies }
    });
    
    if (connectionsResponse.status === 200 && Array.isArray(connectionsResponse.data)) {
      console.log('✅ Platform connections accessible');
      console.log(`   Found ${connectionsResponse.data.length} platform connections`);
      connectionsResponse.data.forEach(conn => {
        console.log(`   - ${conn.platform}: ${conn.isActive ? 'Active' : 'Inactive'}`);
      });
      testResults.platformConnections = true;
      testResults.passedTests++;
    } else {
      console.log('❌ Platform connections failed');
      console.log(`   Status: ${connectionsResponse.status}`);
    }

    // Test 2: OAuth Redirect URLs
    console.log('\n2️⃣ Testing OAuth Redirect URLs...');
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
        console.log(`   ❌ ${platform.charAt(0).toUpperCase() + platform.slice(1)} OAuth: Error - ${error.message}`);
        oauthWorking = false;
      }
    }
    
    if (oauthWorking) {
      testResults.oauthRedirects = true;
      testResults.passedTests++;
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  // Results Summary
  console.log('\n📊 OAUTH TEST RESULTS SUMMARY:');
  console.log('=' .repeat(50));
  console.log(`✅ Session Authentication: ${testResults.sessionAuth ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Platform Connections: ${testResults.platformConnections ? 'PASS' : 'FAIL'}`);
  console.log(`✅ OAuth Redirects: ${testResults.oauthRedirects ? 'PASS' : 'FAIL'}`);
  console.log('=' .repeat(50));
  
  const successRate = (testResults.passedTests / testResults.totalTests) * 100;
  console.log(`📈 SUCCESS RATE: ${testResults.passedTests}/${testResults.totalTests} (${successRate.toFixed(1)}%)`);
  
  if (successRate >= 80) {
    console.log('🎉 OAUTH SYSTEM READY FOR PRODUCTION');
  } else {
    console.log('⚠️  OAUTH SYSTEM NEEDS ADDITIONAL CONFIGURATION');
  }
  
  return testResults;
}

// Run the test
if (require.main === module) {
  testOAuthSystem().catch(console.error);
}

module.exports = { testOAuthSystem };