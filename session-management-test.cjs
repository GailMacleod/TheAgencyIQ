/**
 * Session Management Security Test
 * Tests the fixed session management system with no fallback user IDs
 */

import http from 'http';
import querystring from 'querystring';

const BASE_URL = 'http://localhost:3000';

// Test configuration
const tests = [
  {
    name: 'Session Establishment',
    path: '/api/establish-session',
    method: 'POST',
    body: {},
    expectedStatus: 200
  },
  {
    name: 'User Authentication',
    path: '/api/user',
    method: 'GET',
    requiresAuth: true,
    expectedStatus: 200
  },
  {
    name: 'Session Persistence',
    path: '/api/user-status',
    method: 'GET',
    requiresAuth: true,
    expectedStatus: 200
  },
  {
    name: 'Platform Connections',
    path: '/api/platform-connections',
    method: 'GET',
    requiresAuth: true,
    expectedStatus: 200
  },
  {
    name: 'Quota Check',
    path: '/api/quota/check',
    method: 'GET',
    requiresAuth: true,
    expectedStatus: 200
  },
  {
    name: 'Unauthorized Access Block',
    path: '/api/user-status',
    method: 'GET',
    requiresAuth: false,
    expectedStatus: 401
  }
];

async function makeRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

async function testSessionSecurity() {
  console.log('🔐 Starting Session Management Security Tests...\n');
  
  let sessionCookie = null;
  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`📋 Testing: ${test.name}`);
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: test.path,
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Session-Security-Test/1.0'
        }
      };

      // Add session cookie for authenticated requests
      if (test.requiresAuth && sessionCookie) {
        options.headers.Cookie = sessionCookie;
      }

      const body = test.body ? JSON.stringify(test.body) : null;
      const response = await makeRequest(options, body);

      // Extract session cookie from first request
      if (test.name === 'Session Establishment' && response.headers['set-cookie']) {
        sessionCookie = response.headers['set-cookie'][0];
        console.log(`🍪 Session cookie extracted: ${sessionCookie.substring(0, 50)}...`);
      }

      // Check if response matches expected status
      if (response.statusCode === test.expectedStatus) {
        console.log(`✅ PASSED: ${test.name} (Status: ${response.statusCode})`);
        passedTests++;
        
        // Log additional details for successful tests
        if (response.statusCode === 200) {
          try {
            const data = JSON.parse(response.body);
            if (data.user) {
              console.log(`   User ID: ${data.user.id}, Email: ${data.user.email}`);
            }
          } catch (e) {
            // Non-JSON response
          }
        }
      } else {
        console.log(`❌ FAILED: ${test.name} (Expected: ${test.expectedStatus}, Got: ${response.statusCode})`);
        console.log(`   Response: ${response.body.substring(0, 200)}...`);
      }

    } catch (error) {
      console.log(`❌ ERROR: ${test.name} - ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
  }

  console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED - Session management security is working correctly!');
  } else {
    console.log('⚠️  Some tests failed - session management needs attention');
  }
}

// Run the test
testSessionSecurity().catch(console.error);