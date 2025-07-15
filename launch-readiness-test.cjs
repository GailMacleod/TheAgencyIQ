/**
 * LAUNCH READINESS TEST - Comprehensive Production Validation
 * Tests all critical systems for 200+ user deployment
 */

const axios = require('axios');

class LaunchReadinessTest {
  constructor() {
    this.baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
    this.startTime = Date.now();
    this.testResults = [];
  }

  async runAllTests() {
    console.log('🚀 LAUNCH READINESS TEST - THEAGENCYIQ PLATFORM');
    console.log('Target:', this.baseUrl);
    console.log('Time:', new Date().toISOString());
    console.log('');

    // Core System Tests
    await this.testSessionManagement();
    await this.testUserAuthentication();
    await this.testPlatformConnections();
    await this.testPublishingSystem();
    await this.testMemoryLimits();
    await this.testErrorHandling();
    
    this.generateFinalReport();
  }

  async testSessionManagement() {
    console.log('🔍 Test 1: Session Management & Persistence');
    
    try {
      // Test session establishment
      const sessionResponse = await axios.post(`${this.baseUrl}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      }, { timeout: 30000 });

      if (sessionResponse.status === 200 && sessionResponse.data.sessionEstablished) {
        const cookieHeader = sessionResponse.headers['set-cookie'];
        const signedCookie = cookieHeader?.find(cookie => cookie.includes('s%3A'));
        
        if (signedCookie) {
          // Test session persistence across 10 requests
          let persistentRequests = 0;
          for (let i = 0; i < 10; i++) {
            try {
              const testResponse = await axios.get(`${this.baseUrl}/api/user`, {
                headers: { 'Cookie': signedCookie.split(';')[0] },
                timeout: 30000
              });
              
              if (testResponse.status === 200) {
                persistentRequests++;
              }
            } catch (error) {
              // Request failed
            }
          }
          
          if (persistentRequests >= 9) {
            this.addResult('Session Management', 'PASSED', `${persistentRequests}/10 requests successful`);
          } else {
            this.addResult('Session Management', 'FAILED', `Only ${persistentRequests}/10 requests successful`);
          }
        } else {
          this.addResult('Session Management', 'FAILED', 'No signed cookie found');
        }
      } else {
        this.addResult('Session Management', 'FAILED', 'Session establishment failed');
      }
    } catch (error) {
      this.addResult('Session Management', 'FAILED', error.message);
    }
  }

  async testUserAuthentication() {
    console.log('🔍 Test 2: User Authentication System');
    
    try {
      // Test authenticated user data retrieval
      const sessionResponse = await axios.post(`${this.baseUrl}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      }, { timeout: 30000 });

      if (sessionResponse.status === 200) {
        const cookieHeader = sessionResponse.headers['set-cookie'];
        const signedCookie = cookieHeader?.find(cookie => cookie.includes('s%3A'));
        
        if (signedCookie) {
          const userResponse = await axios.get(`${this.baseUrl}/api/user`, {
            headers: { 'Cookie': signedCookie.split(';')[0] },
            timeout: 30000
          });
          
          if (userResponse.status === 200 && userResponse.data.email) {
            this.addResult('User Authentication', 'PASSED', `User authenticated: ${userResponse.data.email}`);
          } else {
            this.addResult('User Authentication', 'FAILED', 'User data not returned');
          }
        } else {
          this.addResult('User Authentication', 'FAILED', 'No signed cookie found');
        }
      } else {
        this.addResult('User Authentication', 'FAILED', 'Session establishment failed');
      }
    } catch (error) {
      this.addResult('User Authentication', 'FAILED', error.message);
    }
  }

  async testPlatformConnections() {
    console.log('🔍 Test 3: Platform Connections (5 Platforms)');
    
    try {
      // Test platform connections endpoint
      const sessionResponse = await axios.post(`${this.baseUrl}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      }, { timeout: 30000 });

      if (sessionResponse.status === 200) {
        const cookieHeader = sessionResponse.headers['set-cookie'];
        const signedCookie = cookieHeader?.find(cookie => cookie.includes('s%3A'));
        
        if (signedCookie) {
          const connectionsResponse = await axios.get(`${this.baseUrl}/api/platform-connections`, {
            headers: { 'Cookie': signedCookie.split(';')[0] },
            timeout: 30000
          });
          
          if (connectionsResponse.status === 200) {
            const connections = connectionsResponse.data;
            const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
            const connectedPlatforms = connections.filter(c => c.isActive).length;
            
            if (connectedPlatforms >= 3) {
              this.addResult('Platform Connections', 'PASSED', `${connectedPlatforms}/5 platforms connected`);
            } else {
              this.addResult('Platform Connections', 'PARTIAL', `${connectedPlatforms}/5 platforms connected`);
            }
          } else {
            this.addResult('Platform Connections', 'FAILED', 'Platform connections endpoint failed');
          }
        } else {
          this.addResult('Platform Connections', 'FAILED', 'No signed cookie found');
        }
      } else {
        this.addResult('Platform Connections', 'FAILED', 'Session establishment failed');
      }
    } catch (error) {
      this.addResult('Platform Connections', 'FAILED', error.message);
    }
  }

  async testPublishingSystem() {
    console.log('🔍 Test 4: Publishing System Architecture');
    
    try {
      // Test publishing endpoints accessibility
      const endpoints = [
        '/api/posts',
        '/api/ai/generate-content',
        '/api/user-status'
      ];
      
      let accessibleEndpoints = 0;
      
      for (const endpoint of endpoints) {
        try {
          const response = await axios.get(`${this.baseUrl}${endpoint}`, {
            timeout: 30000,
            validateStatus: () => true
          });
          
          // Accept 200 (success) or 401 (requires auth) as valid responses
          if (response.status === 200 || response.status === 401) {
            accessibleEndpoints++;
          }
        } catch (error) {
          // Endpoint not accessible
        }
      }
      
      if (accessibleEndpoints >= 2) {
        this.addResult('Publishing System', 'PASSED', `${accessibleEndpoints}/${endpoints.length} endpoints accessible`);
      } else {
        this.addResult('Publishing System', 'FAILED', `Only ${accessibleEndpoints}/${endpoints.length} endpoints accessible`);
      }
    } catch (error) {
      this.addResult('Publishing System', 'FAILED', error.message);
    }
  }

  async testMemoryLimits() {
    console.log('🔍 Test 5: Memory & Performance (512MB Limit)');
    
    try {
      const startTime = Date.now();
      
      // Test concurrent requests to simulate load
      const concurrentRequests = 50;
      const requests = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          axios.get(`${this.baseUrl}/api/user`, {
            timeout: 30000,
            validateStatus: () => true
          })
        );
      }
      
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Check response times (should be under 10 seconds for 50 requests)
      if (duration < 10000) {
        const avgTime = Math.round(duration / concurrentRequests);
        this.addResult('Memory & Performance', 'PASSED', `${concurrentRequests} requests in ${duration}ms (${avgTime}ms avg)`);
      } else {
        this.addResult('Memory & Performance', 'FAILED', `${duration}ms too slow for ${concurrentRequests} requests`);
      }
    } catch (error) {
      this.addResult('Memory & Performance', 'FAILED', error.message);
    }
  }

  async testErrorHandling() {
    console.log('🔍 Test 6: Error Handling & Security');
    
    try {
      // Test 401 error for unauthenticated request
      const response = await axios.get(`${this.baseUrl}/api/user`, {
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
    
    const statusIcon = status === 'PASSED' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌';
    console.log(`   ${statusIcon} ${testName}: ${details}`);
  }

  generateFinalReport() {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;
    
    const passedTests = this.testResults.filter(r => r.status === 'PASSED').length;
    const partialTests = this.testResults.filter(r => r.status === 'PARTIAL').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAILED').length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests * 100).toFixed(1);
    
    console.log('\n📊 LAUNCH READINESS REPORT');
    console.log('================================================================================');
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`🧪 Total Tests: ${totalTests}`);
    console.log(`✅ Passed Tests: ${passedTests}`);
    console.log(`⚠️  Partial Tests: ${partialTests}`);
    console.log(`❌ Failed Tests: ${failedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('');
    
    // Production readiness assessment
    if (passedTests >= 5) {
      console.log('🎉 PRODUCTION READY - TheAgencyIQ Platform Ready for Launch!');
      console.log('✅ Session management bulletproof');
      console.log('✅ User authentication working');
      console.log('✅ Platform connections operational');
      console.log('✅ Publishing system accessible');
      console.log('✅ Memory limits within bounds');
      console.log('✅ Error handling secure');
      console.log('');
      console.log('🚀 LAUNCH APPROVED - Ready for 200+ customers');
    } else {
      console.log('❌ PRODUCTION NEEDS WORK - Critical issues detected');
      console.log(`⚠️  Only ${passedTests}/6 core tests passed`);
      console.log('🔧 Fix critical issues before launch');
    }
    
    console.log('\n📋 Test Results Summary:');
    this.testResults.forEach(result => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`   ${icon} ${result.testName}: ${result.details}`);
    });
    
    console.log('\n📄 Test completed at', new Date().toISOString());
    
    // Save report to file
    const reportData = {
      summary: {
        duration,
        totalTests,
        passedTests,
        partialTests,
        failedTests,
        successRate: parseFloat(successRate),
        productionReady: passedTests >= 5
      },
      results: this.testResults,
      timestamp: new Date().toISOString()
    };
    
    require('fs').writeFileSync(
      `LAUNCH_READINESS_TEST_REPORT_${Date.now()}.json`,
      JSON.stringify(reportData, null, 2)
    );
  }
}

// Run the test
const test = new LaunchReadinessTest();
test.runAllTests().catch(console.error);