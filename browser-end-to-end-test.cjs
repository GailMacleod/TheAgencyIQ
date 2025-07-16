/**
 * BROWSER END-TO-END SESSION TEST
 * Tests session establishment and persistence in browser environment
 */

const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class BrowserSessionTest {
  constructor() {
    this.testResults = [];
    this.cookieJar = [];
  }

  async runBrowserTest() {
    console.log('🌐 BROWSER END-TO-END SESSION TEST');
    console.log(`Target: ${BASE_URL}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');

    // Step 1: Establish session
    await this.testSessionEstablishment();

    // Step 2: Test /api/user with same session
    await this.testUserEndpoint();

    // Step 3: Test multiple endpoint calls
    await this.testMultipleEndpoints();

    this.generateReport();
  }

  async testSessionEstablishment() {
    console.log('🔍 Step 1: Session Establishment');
    try {
      const response = await axios.post(`${BASE_URL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      });

      if (response.status === 200 && response.data.sessionEstablished) {
        this.sessionId = response.data.sessionId;
        console.log(`✅ Session established: ${this.sessionId}`);
        console.log(`✅ User: ${response.data.user.email}`);
        
        // Extract cookies
        if (response.headers['set-cookie']) {
          this.cookieJar = response.headers['set-cookie'];
          console.log(`📋 Cookies received: ${this.cookieJar.length} cookies`);
          
          // Find the session cookie - look for signed cookie format
          const sessionCookie = this.cookieJar.find(cookie => cookie.includes('theagencyiq.session='));
          if (sessionCookie) {
            this.sessionCookie = sessionCookie.split(';')[0];
            console.log(`📋 Session cookie: ${this.sessionCookie}`);
            
            // Check if it's a signed cookie (contains s%3A prefix)
            if (this.sessionCookie.includes('s%3A')) {
              console.log('✅ Using signed session cookie');
            } else {
              console.log('⚠️  Using unsigned session cookie - may cause issues');
            }
          }
        }
        
        this.addResult('Session Establishment', 'PASSED', `Session ID: ${this.sessionId}`);
      } else {
        this.addResult('Session Establishment', 'FAILED', `Unexpected response: ${response.status}`);
      }
    } catch (error) {
      this.addResult('Session Establishment', 'FAILED', error.message);
    }
  }

  async testUserEndpoint() {
    console.log('🔍 Step 2: /api/user with Same Session');
    try {
      if (!this.sessionCookie) {
        this.addResult('User Endpoint', 'FAILED', 'No session cookie available');
        return;
      }

      const response = await axios.get(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      if (response.status === 200) {
        console.log(`✅ User endpoint successful`);
        console.log(`✅ User: ${response.data.email}`);
        console.log(`✅ User ID: ${response.data.id}`);
        
        // Check session debug endpoint
        const debugResponse = await axios.get(`${BASE_URL}/api/session-debug`, {
          headers: {
            'Cookie': this.sessionCookie
          }
        });

        if (debugResponse.status === 200) {
          const debugSessionId = debugResponse.data.sessionID;
          console.log(`📋 Debug session ID: ${debugSessionId}`);
          
          if (debugSessionId === this.sessionId) {
            this.addResult('User Endpoint', 'PASSED', `Session ID consistent: ${debugSessionId}`);
          } else {
            this.addResult('User Endpoint', 'FAILED', `Session ID mismatch! Expected: ${this.sessionId}, Got: ${debugSessionId}`);
          }
        } else {
          this.addResult('User Endpoint', 'FAILED', `Debug endpoint failed: ${debugResponse.status}`);
        }
      } else {
        this.addResult('User Endpoint', 'FAILED', `User endpoint failed: ${response.status}`);
      }
    } catch (error) {
      this.addResult('User Endpoint', 'FAILED', error.message);
    }
  }

  async testMultipleEndpoints() {
    console.log('🔍 Step 3: Multiple Endpoint Calls');
    try {
      if (!this.sessionCookie) {
        this.addResult('Multiple Endpoints', 'FAILED', 'No session cookie available');
        return;
      }

      const endpoints = [
        '/api/user-status',
        '/api/platform-connections',
        '/api/user'
      ];

      let successCount = 0;
      let sessionIdConsistent = true;

      for (const endpoint of endpoints) {
        const response = await axios.get(`${BASE_URL}${endpoint}`, {
          headers: {
            'Cookie': this.sessionCookie
          }
        });

        if (response.status === 200) {
          successCount++;
          console.log(`✅ ${endpoint} - Success`);
        } else {
          console.log(`❌ ${endpoint} - Failed (${response.status})`);
        }

        // Check session consistency
        const debugResponse = await axios.get(`${BASE_URL}/api/session-debug`, {
          headers: {
            'Cookie': this.sessionCookie
          }
        });

        if (debugResponse.status === 200) {
          const debugSessionId = debugResponse.data.sessionID;
          if (debugSessionId !== this.sessionId) {
            sessionIdConsistent = false;
            console.log(`⚠️  Session ID changed on ${endpoint}: ${debugSessionId}`);
          }
        }
      }

      if (successCount === endpoints.length && sessionIdConsistent) {
        this.addResult('Multiple Endpoints', 'PASSED', `All ${endpoints.length} endpoints successful with consistent session ID`);
      } else {
        this.addResult('Multiple Endpoints', 'FAILED', `${successCount}/${endpoints.length} endpoints successful, Session consistent: ${sessionIdConsistent}`);
      }
    } catch (error) {
      this.addResult('Multiple Endpoints', 'FAILED', error.message);
    }
  }

  addResult(step, status, message) {
    this.testResults.push({
      step,
      status,
      message,
      timestamp: new Date().toISOString()
    });
    
    const emoji = status === 'PASSED' ? '✅' : '❌';
    console.log(`   ${emoji} ${step}: ${message}`);
  }

  generateReport() {
    const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
    const totalTests = this.testResults.length;
    const successRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log('\n📊 BROWSER END-TO-END SESSION TEST REPORT');
    console.log('================================================================================');
    console.log(`🧪 Total Tests: ${totalTests}`);
    console.log(`✅ Passed Tests: ${passedTests}`);
    console.log(`❌ Failed Tests: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('');

    if (successRate === '100.0') {
      console.log('🎉 BROWSER SESSION PERSISTENCE WORKING!');
      console.log('✅ Session establishment successful');
      console.log('✅ Session persistence across endpoints');
      console.log('✅ No new session ID creation');
    } else {
      console.log('⚠️  BROWSER SESSION ISSUES DETECTED');
      console.log('❌ Session persistence problems');
    }

    console.log('\n📋 Test Results Summary:');
    this.testResults.forEach(result => {
      const emoji = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${emoji} ${result.step}: ${result.message}`);
    });

    console.log(`\n📄 Test completed at ${new Date().toISOString()}`);
  }
}

// Run the test
const test = new BrowserSessionTest();
test.runBrowserTest().catch(console.error);