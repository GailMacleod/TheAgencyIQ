/**
 * SESSION SECURITY VALIDATION TEST
 * Validates that hardcoded user_id=2 vulnerabilities are completely eliminated
 * and proper session authentication is required throughout the system
 */

const axios = require('axios');
const assert = require('assert');

// Test configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const TEST_TIMEOUT = 30000;

class SessionSecurityValidator {
  constructor() {
    this.results = [];
    this.totalTests = 0;
    this.passedTests = 0;
  }

  async runTest(testName, testFunction) {
    this.totalTests++;
    try {
      console.log(`\n🧪 Testing: ${testName}`);
      await testFunction();
      this.passedTests++;
      this.results.push({ test: testName, status: 'PASS', error: null });
      console.log(`✅ PASS: ${testName}`);
    } catch (error) {
      this.results.push({ test: testName, status: 'FAIL', error: error.message });
      console.log(`❌ FAIL: ${testName} - ${error.message}`);
    }
  }

  async validateNoAutoEstablishment() {
    // Test that endpoints reject requests without proper sessions
    const protectedEndpoints = [
      '/api/user-status',
      '/api/platform-connections', 
      '/api/subscription-usage',
      '/api/brand-purpose',
      '/api/quota-status'
    ];

    for (const endpoint of protectedEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          timeout: 5000,
          validateStatus: () => true // Don't throw on error status
        });

        if (response.status === 401) {
          console.log(`✅ ${endpoint}: Properly rejects unauthenticated requests (401)`);
        } else {
          throw new Error(`${endpoint} returned ${response.status} instead of 401 for unauthenticated request`);
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Server not running - cannot test ${endpoint}`);
        }
        throw error;
      }
    }
  }

  async validateSessionEstablishmentRequiresCredentials() {
    // Test that session establishment requires userId and email
    try {
      const response = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 400 && response.data.code === 'MISSING_CREDENTIALS') {
        console.log('✅ Session establishment properly requires credentials');
      } else {
        throw new Error(`Session establishment should require credentials but returned ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Server not running - cannot test session establishment');
      }
      throw error;
    }
  }

  async validatePublicRouteAuthentication() {
    // Test that /public route requires authentication
    try {
      const response = await axios.get(`${BASE_URL}/public`, {
        timeout: 5000,
        validateStatus: () => true,
        maxRedirects: 0 // Don't follow redirects
      });

      if (response.status === 401) {
        console.log('✅ /public route properly requires authentication');
      } else if (response.status === 302) {
        throw new Error('/public route is redirecting instead of requiring authentication');
      } else {
        throw new Error(`/public route returned ${response.status} instead of 401`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Server not running - cannot test /public route');
      }
      throw error;
    }
  }

  async validateMiddlewareAuthentication() {
    // Test that subscription auth middleware requires proper sessions
    const authEndpoints = [
      '/api/posts',
      '/api/generate-content'
    ];

    for (const endpoint of authEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          timeout: 5000,
          validateStatus: () => true
        });

        if (response.status === 401) {
          console.log(`✅ ${endpoint}: Middleware properly requires authentication`);
        } else {
          throw new Error(`${endpoint} middleware returned ${response.status} instead of 401`);
        }
      } catch (error) {
        if (error.code === 'ECONNREFUSED') {
          throw new Error(`Server not running - cannot test ${endpoint}`);
        }
        throw error;
      }
    }
  }

  async validateSessionIntegrity() {
    // Test that session validation checks proper format and content
    const testCookie = 'invalid_session_format';
    
    try {
      const response = await axios.get(`${BASE_URL}/api/user-status`, {
        headers: {
          'Cookie': `theagencyiq.session=${testCookie}`
        },
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 401) {
        console.log('✅ Session validation properly rejects invalid session formats');
      } else {
        throw new Error(`Session validation should reject invalid formats but returned ${response.status}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Server not running - cannot test session integrity');
      }
      throw error;
    }
  }

  async validateScriptAuthentication() {
    // Test that script-based access requires environment variables
    try {
      // This would normally be tested by running a script, but we'll check the API directly
      const response = await axios.post(`${BASE_URL}/api/enforce-auto-posting`, {
        testMode: true
      }, {
        timeout: 5000,
        validateStatus: () => true
      });

      if (response.status === 401) {
        console.log('✅ Script endpoints properly require authentication');
      } else {
        throw new Error(`Script endpoint returned ${response.status} instead of 401`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Server not running - cannot test script authentication');
      }
      throw error;
    }
  }

  generateReport() {
    const successRate = ((this.passedTests / this.totalTests) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(80));
    console.log('SESSION SECURITY VALIDATION REPORT');
    console.log('='.repeat(80));
    console.log(`📊 Total Tests: ${this.totalTests}`);
    console.log(`✅ Passed: ${this.passedTests}`);
    console.log(`❌ Failed: ${this.totalTests - this.passedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.passedTests === this.totalTests) {
      console.log('\n🎉 ALL SESSION SECURITY TESTS PASSED!');
      console.log('✅ Hardcoded user_id=2 vulnerabilities eliminated');
      console.log('✅ Proper session authentication enforced');
      console.log('✅ Auto-establishment vulnerabilities fixed');
      console.log('✅ Script bypass protections deployed');
    } else {
      console.log('\n⚠️  SECURITY VULNERABILITIES DETECTED');
      console.log('❌ Session security validation failed');
      
      const failedTests = this.results.filter(r => r.status === 'FAIL');
      failedTests.forEach(test => {
        console.log(`   - ${test.test}: ${test.error}`);
      });
    }
    
    console.log('='.repeat(80));
    return this.passedTests === this.totalTests;
  }
}

async function main() {
  console.log('🔒 SESSION SECURITY VALIDATION TEST SUITE');
  console.log('Testing elimination of hardcoded user_id=2 vulnerabilities...\n');
  
  const validator = new SessionSecurityValidator();
  
  // Run all security validation tests
  await validator.runTest('No Auto-Establishment', () => validator.validateNoAutoEstablishment());
  await validator.runTest('Session Establishment Requires Credentials', () => validator.validateSessionEstablishmentRequiresCredentials());
  await validator.runTest('Public Route Authentication', () => validator.validatePublicRouteAuthentication());
  await validator.runTest('Middleware Authentication', () => validator.validateMiddlewareAuthentication());
  await validator.runTest('Session Integrity Validation', () => validator.validateSessionIntegrity());
  await validator.runTest('Script Authentication', () => validator.validateScriptAuthentication());
  
  // Generate final report
  const allTestsPassed = validator.generateReport();
  
  if (!allTestsPassed) {
    process.exit(1);
  }
}

// Handle errors and timeouts
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
  process.exit(1);
});

// Set test timeout
setTimeout(() => {
  console.error('❌ Test suite timed out after 30 seconds');
  process.exit(1);
}, TEST_TIMEOUT);

// Run the validation
main().catch(error => {
  console.error('❌ Session security validation failed:', error.message);
  process.exit(1);
});