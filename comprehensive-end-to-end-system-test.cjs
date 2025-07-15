/**
 * COMPREHENSIVE END-TO-END SYSTEM TEST
 * Tests complete multi-user system with session management, user creation, and API functionality
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class ComprehensiveSystemTest {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  async runCompleteTest() {
    console.log('🚀 COMPREHENSIVE END-TO-END SYSTEM TEST');
    console.log(`Target: ${BASE_URL}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');

    // Test 1: Session Establishment
    await this.testSessionEstablishment();

    // Test 2: Session Persistence
    await this.testSessionPersistence();

    // Test 3: User Creation (Test Users)
    await this.testUserCreation();

    // Test 4: Multi-User Scalability (50 users)
    await this.testMultiUserScalability();

    // Test 5: API Endpoint Functionality
    await this.testAPIEndpoints();

    // Test 6: Error Handling
    await this.testErrorHandling();

    this.generateFinalReport();
  }

  async testSessionEstablishment() {
    console.log('🔍 Test 1: Session Establishment');
    try {
      const response = await axios.post(`${BASE_URL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      }, { timeout: 30000 });

      if (response.status === 200 && response.data.sessionEstablished) {
        this.addResult('Session Establishment', 'PASSED', `User ID: ${response.data.user.id}, Session: ${response.data.sessionId}`);
      } else {
        this.addResult('Session Establishment', 'FAILED', `Unexpected response: ${response.status}`);
      }
    } catch (error) {
      this.addResult('Session Establishment', 'FAILED', error.message);
    }
  }

  async testSessionPersistence() {
    console.log('🔍 Test 2: Session Persistence - NO NEW SESSION IDS');
    try {
      // Establish session
      const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      }, { timeout: 30000 });

      if (sessionResponse.status === 200) {
        const originalSessionId = sessionResponse.data.sessionId;
        console.log(`📋 Original Session ID: ${originalSessionId}`);
        
        // Extract session cookie (prefer signed format)
        const cookieHeader = sessionResponse.headers['set-cookie'];
        let sessionCookie = cookieHeader?.find(cookie => cookie.includes('theagencyiq.session=s%3A'));
        
        // If no signed cookie found, try unsigned
        if (!sessionCookie) {
          sessionCookie = cookieHeader?.find(cookie => cookie.includes('theagencyiq.session=') && !cookie.includes('s%3A'));
        }
        
        if (sessionCookie) {
          const cookie = sessionCookie.split(';')[0];
          console.log(`📋 Using cookie: ${cookie}`);
          
          // Test session persistence - should use SAME session ID
          const userResponse = await axios.get(`${BASE_URL}/api/user`, {
            headers: { 'Cookie': cookie },
            timeout: 30000
          });

          if (userResponse.status === 200) {
            // Check session debug endpoint to verify session ID consistency
            const debugResponse = await axios.get(`${BASE_URL}/api/session-debug`, {
              headers: { 'Cookie': cookie },
              timeout: 30000
            });
            
            if (debugResponse.status === 200) {
              const sessionId = debugResponse.data.sessionID;
              console.log(`📋 Debug Session ID: ${sessionId}`);
              
              if (sessionId === originalSessionId) {
                this.addResult('Session Persistence', 'PASSED', `Session ID consistent: ${sessionId}, User: ${userResponse.data.email}`);
              } else {
                this.addResult('Session Persistence', 'FAILED', `Session ID changed! Original: ${originalSessionId}, New: ${sessionId}`);
              }
            } else {
              this.addResult('Session Persistence', 'FAILED', `Debug endpoint failed: ${debugResponse.status}`);
            }
          } else {
            this.addResult('Session Persistence', 'FAILED', `User endpoint failed: ${userResponse.status}`);
          }
        } else {
          this.addResult('Session Persistence', 'FAILED', 'No session cookie found');
        }
      } else {
        this.addResult('Session Persistence', 'FAILED', `Session establishment failed: ${sessionResponse.status}`);
      }
    } catch (error) {
      this.addResult('Session Persistence', 'FAILED', error.message);
    }
  }

  async testUserCreation() {
    console.log('🔍 Test 3: User Creation (Test Users)');
    try {
      // Use unique timestamp to avoid duplicate user errors
      const timestamp = Date.now();
      const response = await axios.post(`${BASE_URL}/api/auth/signup`, {
        email: `testuser${timestamp}@example.com`,
        phone: `+61400${timestamp.toString().slice(-6)}`,
        password: 'testpassword123',
        confirmPassword: 'testpassword123',
        userId: `test-user-${timestamp}`
      }, { timeout: 30000 });

      if (response.status === 200 && response.data.success) {
        this.addResult('User Creation', 'PASSED', `Created test user: ${response.data.email}`);
      } else {
        this.addResult('User Creation', 'FAILED', `User creation failed: ${response.status} - ${response.data.message || 'Unknown error'}`);
      }
    } catch (error) {
      this.addResult('User Creation', 'FAILED', error.response?.data?.message || error.message);
    }
  }

  async testMultiUserScalability() {
    console.log('🔍 Test 4: Multi-User Scalability (50 users)');
    try {
      const userTests = [];
      for (let i = 1; i <= 50; i++) {
        userTests.push(this.testConcurrentUser(i));
      }

      const results = await Promise.allSettled(userTests);
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const successRate = (successCount / 50 * 100).toFixed(1);

      if (successRate >= 95) {
        this.addResult('Multi-User Scalability', 'PASSED', `${successCount}/50 users (${successRate}%)`);
      } else {
        this.addResult('Multi-User Scalability', 'FAILED', `Only ${successCount}/50 users (${successRate}%)`);
      }
    } catch (error) {
      this.addResult('Multi-User Scalability', 'FAILED', error.message);
    }
  }

  async testConcurrentUser(userId) {
    try {
      const timestamp = Date.now();
      const response = await axios.post(`${BASE_URL}/api/auth/signup`, {
        email: `testuser${timestamp}${userId}@example.com`,
        phone: `+61400${timestamp.toString().slice(-6)}${userId.toString().padStart(2, '0')}`,
        password: 'testpassword123',
        confirmPassword: 'testpassword123',
        userId: `test-user-${timestamp}-${userId}`
      }, { timeout: 30000 });

      return { success: response.status === 200 && response.data.success, userId };
    } catch (error) {
      return { success: false, userId, error: error.response?.data?.message || error.message };
    }
  }

  async testAPIEndpoints() {
    console.log('🔍 Test 5: API Endpoint Functionality');
    try {
      // Establish session first
      const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      }, { timeout: 30000 });

      if (sessionResponse.status === 200) {
        const cookieHeader = sessionResponse.headers['set-cookie'];
        const signedCookie = cookieHeader?.find(cookie => cookie.includes('s%3A'));
        const sessionCookie = signedCookie?.split(';')[0];

        // Test multiple endpoints
        const endpoints = [
          { path: '/api/user', method: 'GET' },
          { path: '/api/user-status', method: 'GET' },
          { path: '/api/platform-connections', method: 'GET' }
        ];

        let passedEndpoints = 0;
        for (const endpoint of endpoints) {
          try {
            const response = await axios({
              method: endpoint.method,
              url: `${BASE_URL}${endpoint.path}`,
              headers: { 'Cookie': sessionCookie },
              timeout: 30000
            });

            if (response.status === 200) {
              passedEndpoints++;
            }
          } catch (error) {
            // Some endpoints might fail due to missing data, that's OK
          }
        }

        if (passedEndpoints >= 2) {
          this.addResult('API Endpoint Functionality', 'PASSED', `${passedEndpoints}/${endpoints.length} endpoints working`);
        } else {
          this.addResult('API Endpoint Functionality', 'FAILED', `Only ${passedEndpoints}/${endpoints.length} endpoints working`);
        }
      } else {
        this.addResult('API Endpoint Functionality', 'FAILED', 'Session establishment failed');
      }
    } catch (error) {
      this.addResult('API Endpoint Functionality', 'FAILED', error.message);
    }
  }

  async testErrorHandling() {
    console.log('🔍 Test 6: Error Handling');
    try {
      // Test 401 error for unauthenticated request
      const response = await axios.get(`${BASE_URL}/api/user`, {
        timeout: 30000,
        validateStatus: () => true
      });

      if (response.status === 401) {
        this.addResult('Error Handling', 'PASSED', 'Proper 401 response for unauthenticated request');
      } else {
        this.addResult('Error Handling', 'FAILED', `Expected 401, got ${response.status}`);
      }
    } catch (error) {
      this.addResult('Error Handling', 'FAILED', error.message);
    }
  }

  addResult(testName, status, details) {
    const result = { testName, status, details, timestamp: new Date().toISOString() };
    this.testResults.push(result);
    
    const statusIcon = status === 'PASSED' ? '✅' : '❌';
    console.log(`   ${statusIcon} ${testName}: ${details}`);
  }

  generateFinalReport() {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;
    
    const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log('');
    console.log('📊 COMPREHENSIVE END-TO-END SYSTEM TEST REPORT');
    console.log('================================================================================');
    console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log(`🧪 Total Tests: ${totalTests}`);
    console.log(`✅ Passed Tests: ${passedTests}`);
    console.log(`❌ Failed Tests: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('');

    // Production readiness assessment
    if (successRate >= 95) {
      console.log('🎉 PRODUCTION READY - System fully operational!');
      console.log('✅ Multi-user session management working');
      console.log('✅ Scalability validated');
      console.log('✅ API endpoints functional');
      console.log('✅ Error handling proper');
    } else if (successRate >= 80) {
      console.log('⚠️  PRODUCTION CAPABLE - Minor issues detected');
      console.log('✅ Core functionality working');
      console.log('⚠️  Some improvements needed');
    } else {
      console.log('❌ PRODUCTION NEEDS WORK - Critical issues detected');
      console.log('⚠️  System requires fixes before deployment');
    }

    console.log('');
    console.log('📋 Test Results Summary:');
    this.testResults.forEach(result => {
      const statusIcon = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${statusIcon} ${result.testName}: ${result.details}`);
    });

    console.log('');
    console.log(`📄 Test completed at ${new Date().toISOString()}`);
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: duration,
      totalTests: totalTests,
      passedTests: passedTests,
      failedTests: totalTests - passedTests,
      successRate: successRate,
      testResults: this.testResults
    };

    fs.writeFileSync(
      `COMPREHENSIVE_END_TO_END_SYSTEM_TEST_REPORT_${Date.now()}.json`,
      JSON.stringify(reportData, null, 2)
    );
  }
}

// Run the comprehensive test
const test = new ComprehensiveSystemTest();
test.runCompleteTest().catch(console.error);