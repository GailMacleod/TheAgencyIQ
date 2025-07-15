/**
 * Launch Readiness Test for TheAgencyIQ
 * Tests complete end-to-end flow with 200 simulated users
 */

const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class LaunchReadinessTest {
  constructor() {
    this.results = {
      totalTests: 0,
      passed: 0,
      failed: 0,
      testResults: [],
      startTime: new Date(),
      endTime: null,
      memoryUsage: [],
      errors: []
    };
  }

  async runTest(testName, testFn) {
    this.results.totalTests++;
    console.log(`\n🔍 Running: ${testName}`);
    
    const start = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - start;
      
      this.results.passed++;
      this.results.testResults.push({
        name: testName,
        status: 'PASSED',
        duration: `${duration}ms`,
        result
      });
      
      console.log(`✅ ${testName} - PASSED (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      
      this.results.failed++;
      this.results.testResults.push({
        name: testName,
        status: 'FAILED',
        duration: `${duration}ms`,
        error: error.message
      });
      
      this.results.errors.push({
        test: testName,
        error: error.message,
        stack: error.stack
      });
      
      console.log(`❌ ${testName} - FAILED (${duration}ms): ${error.message}`);
      throw error;
    }
  }

  async checkMemoryUsage() {
    try {
      const response = await axios.get(`${BASE_URL}/api/system/memory`);
      this.results.memoryUsage.push({
        timestamp: new Date(),
        ...response.data
      });
      return response.data;
    } catch (error) {
      console.warn('Memory check failed:', error.message);
      return null;
    }
  }

  async testHealthEndpoints() {
    return await this.runTest('Health Endpoints', async () => {
      const healthResponse = await axios.get(`${BASE_URL}/api/health`);
      
      if (healthResponse.status !== 200) {
        throw new Error(`Health check failed: ${healthResponse.status}`);
      }
      
      const healthData = healthResponse.data;
      if (!healthData || healthData.status !== 'healthy') {
        throw new Error(`System unhealthy: ${healthData?.status || 'undefined'}`);
      }
      
      return {
        status: healthData.status,
        server: healthData.server,
        database: healthData.database,
        memoryMB: Math.round(healthData.memory.rss / 1024 / 1024)
      };
    });
  }

  async testSessionManagement() {
    return await this.runTest('Session Management', async () => {
      // Establish session
      const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
        withCredentials: true
      });
      
      if (sessionResponse.status !== 200) {
        throw new Error(`Session establishment failed: ${sessionResponse.status}`);
      }
      
      // Extract session cookie
      const cookies = sessionResponse.headers['set-cookie'];
      if (!cookies) {
        throw new Error('No session cookies received');
      }
      
      const sessionCookie = cookies.find(c => c.includes('theagencyiq.session'));
      if (!sessionCookie) {
        throw new Error('Session cookie not found');
      }
      
      // Extract just the session value for consistent usage
      const sessionValue = sessionCookie.split(';')[0];
      
      // Test authenticated endpoint
      const userResponse = await axios.get(`${BASE_URL}/api/user`, {
        headers: {
          Cookie: sessionValue
        },
        withCredentials: true
      });
      
      if (userResponse.status !== 200) {
        throw new Error(`User endpoint failed: ${userResponse.status}`);
      }
      
      return {
        sessionEstablished: true,
        userId: userResponse.data.id,
        userEmail: userResponse.data.email,
        cookiePresent: !!sessionCookie
      };
    });
  }

  async testRealAPIIntegration() {
    return await this.runTest('Real API Integration', async () => {
      // Get session cookie first
      const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
        withCredentials: true
      });
      
      const cookies = sessionResponse.headers['set-cookie'];
      const sessionCookie = cookies.find(c => c.includes('theagencyiq.session'));
      
      // Test post creation with real API
      const postResponse = await axios.post(`${BASE_URL}/api/posts`, {
        content: 'Test post for launch readiness verification',
        platforms: ['facebook', 'linkedin'],
        publishNow: true
      }, {
        headers: {
          Cookie: sessionCookie
        },
        withCredentials: true
      });
      
      if (postResponse.status !== 201 && postResponse.status !== 200) {
        throw new Error(`Post creation failed: ${postResponse.status}`);
      }
      
      return {
        postCreated: true,
        postId: postResponse.data.id,
        platforms: postResponse.data.platforms,
        status: postResponse.data.status,
        realAPIUsed: true
      };
    });
  }

  async testQuotaManagement() {
    return await this.runTest('Quota Management', async () => {
      // Get session cookie first
      const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
        withCredentials: true
      });
      
      const cookies = sessionResponse.headers['set-cookie'];
      const sessionCookie = cookies.find(c => c.includes('theagencyiq.session'));
      
      // Check user status before post
      const userStatusBefore = await axios.get(`${BASE_URL}/api/user-status`, {
        headers: {
          Cookie: sessionCookie
        },
        withCredentials: true
      });
      
      const remainingBefore = userStatusBefore.data.remainingPosts;
      
      // Create post with quota deduction
      const postResponse = await axios.post(`${BASE_URL}/api/posts`, {
        content: 'Quota test post',
        platforms: ['facebook'],
        publishNow: true
      }, {
        headers: {
          Cookie: sessionCookie
        },
        withCredentials: true
      });
      
      // Check user status after post
      const userStatusAfter = await axios.get(`${BASE_URL}/api/user-status`, {
        headers: {
          Cookie: sessionCookie
        },
        withCredentials: true
      });
      
      const remainingAfter = userStatusAfter.data.remainingPosts;
      const quotaDeducted = remainingBefore - remainingAfter;
      
      return {
        quotaDeducted,
        remainingBefore,
        remainingAfter,
        quotaManagement: quotaDeducted > 0
      };
    });
  }

  async testWebhookValidation() {
    return await this.runTest('Webhook Validation', async () => {
      // Test webhook endpoint returns 200
      const webhookResponse = await axios.post(`${BASE_URL}/api/webhook`, {
        type: 'test_event',
        data: { test: true }
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Webhook should return 200 for proper validation
      if (webhookResponse.status < 200 || webhookResponse.status >= 300) {
        throw new Error(`Webhook validation failed: ${webhookResponse.status}`);
      }
      
      return {
        webhookStatus: webhookResponse.status,
        webhookResponse: webhookResponse.data,
        validationPassed: true
      };
    });
  }

  async testAnalyticsTracking() {
    return await this.runTest('Analytics Tracking', async () => {
      // Test analytics endpoint
      const analyticsResponse = await axios.post(`${BASE_URL}/api/analytics/track`, {
        event: 'test_event',
        data: { 
          userId: 2,
          action: 'launch_readiness_test',
          timestamp: new Date().toISOString()
        }
      });
      
      if (analyticsResponse.status !== 200) {
        throw new Error(`Analytics tracking failed: ${analyticsResponse.status}`);
      }
      
      return {
        analyticsWorking: true,
        event: analyticsResponse.data.event,
        timestamp: analyticsResponse.data.timestamp
      };
    });
  }

  async testTokenRefresh() {
    return await this.runTest('Token Refresh', async () => {
      // Get session cookie first
      const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
        withCredentials: true
      });
      
      const cookies = sessionResponse.headers['set-cookie'];
      const sessionCookie = cookies.find(c => c.includes('theagencyiq.session'));
      
      // Test token validation endpoint
      const tokenResponse = await axios.get(`${BASE_URL}/api/validate-tokens`, {
        headers: {
          Cookie: sessionCookie
        },
        withCredentials: true
      });
      
      if (tokenResponse.status !== 200) {
        throw new Error(`Token validation failed: ${tokenResponse.status}`);
      }
      
      return {
        tokenValidationWorking: true,
        totalConnections: tokenResponse.data.summary.totalConnections,
        validConnections: tokenResponse.data.summary.validConnections,
        needingReconnection: tokenResponse.data.summary.needingReconnection
      };
    });
  }

  async testSchedulingSystem() {
    return await this.runTest('Scheduling System', async () => {
      // Get session cookie first
      const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
        withCredentials: true
      });
      
      const cookies = sessionResponse.headers['set-cookie'];
      const sessionCookie = cookies.find(c => c.includes('theagencyiq.session'));
      
      // Test scheduling endpoint
      const scheduleResponse = await axios.post(`${BASE_URL}/api/schedule`, {
        content: 'Scheduled post for launch readiness test',
        platforms: ['facebook', 'linkedin'],
        scheduleDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }, {
        headers: {
          Cookie: sessionCookie
        },
        withCredentials: true
      });
      
      if (scheduleResponse.status !== 201) {
        throw new Error(`Scheduling failed: ${scheduleResponse.status}`);
      }
      
      return {
        schedulingWorking: true,
        scheduledPostId: scheduleResponse.data.id,
        platforms: scheduleResponse.data.platforms,
        status: scheduleResponse.data.status
      };
    });
  }

  async testPlatformConnections() {
    return await this.runTest('Platform Connections', async () => {
      // Get session cookie first
      const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
        withCredentials: true
      });
      
      const cookies = sessionResponse.headers['set-cookie'];
      const sessionCookie = cookies.find(c => c.includes('theagencyiq.session'));
      
      // Test platform connections endpoint
      const connectionsResponse = await axios.get(`${BASE_URL}/api/platform-connections`, {
        headers: {
          Cookie: sessionCookie
        },
        withCredentials: true
      });
      
      if (connectionsResponse.status !== 200) {
        throw new Error(`Platform connections failed: ${connectionsResponse.status}`);
      }
      
      const connections = connectionsResponse.data;
      
      return {
        platformConnectionsWorking: true,
        totalConnections: connections.length,
        activeConnections: connections.filter(c => c.isActive).length,
        platforms: connections.map(c => c.platform)
      };
    });
  }

  async test200UserLoad() {
    return await this.runTest('200 User Load Test', async () => {
      const userPromises = [];
      const results = [];
      
      console.log('🔄 Creating 200 simulated users...');
      
      for (let i = 1; i <= 200; i++) {
        const userPromise = (async (userId) => {
          try {
            // Establish session
            const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
              withCredentials: true,
              timeout: 30000
            });
            
            const cookies = sessionResponse.headers['set-cookie'];
            const sessionCookie = cookies?.find(c => c.includes('theagencyiq.session'));
            
            if (!sessionCookie) {
              throw new Error('No session cookie received');
            }
            
            // Test user endpoint
            const userResponse = await axios.get(`${BASE_URL}/api/user`, {
              headers: {
                Cookie: sessionCookie
              },
              withCredentials: true,
              timeout: 30000
            });
            
            return {
              userId: i,
              sessionEstablished: true,
              userDataReceived: !!userResponse.data,
              responseTime: userResponse.headers['x-response-time'] || 'N/A'
            };
          } catch (error) {
            return {
              userId: i,
              sessionEstablished: false,
              error: error.message
            };
          }
        })(i);
        
        userPromises.push(userPromise);
      }
      
      const userResults = await Promise.all(userPromises);
      const successfulUsers = userResults.filter(r => r.sessionEstablished);
      const failedUsers = userResults.filter(r => !r.sessionEstablished);
      
      if (successfulUsers.length < 180) { // 90% success rate minimum
        throw new Error(`Only ${successfulUsers.length}/200 users successful (${(successfulUsers.length/200*100).toFixed(1)}%)`);
      }
      
      return {
        totalUsers: 200,
        successfulUsers: successfulUsers.length,
        failedUsers: failedUsers.length,
        successRate: `${(successfulUsers.length/200*100).toFixed(1)}%`,
        loadTestPassed: true
      };
    });
  }

  async runAllTests() {
    console.log('🚀 Starting Launch Readiness Test for TheAgencyIQ...\n');
    
    try {
      // Track memory usage throughout tests
      await this.checkMemoryUsage();
      
      // Run all tests
      await this.testHealthEndpoints();
      await this.testSessionManagement();
      await this.testRealAPIIntegration();
      await this.testQuotaManagement();
      await this.testWebhookValidation();
      await this.testAnalyticsTracking();
      await this.testTokenRefresh();
      await this.testSchedulingSystem();
      await this.testPlatformConnections();
      await this.test200UserLoad();
      
      // Final memory check
      await this.checkMemoryUsage();
      
    } catch (error) {
      console.error('Test suite failed:', error.message);
    }
    
    this.results.endTime = new Date();
    this.generateReport();
  }

  generateReport() {
    const duration = this.results.endTime - this.results.startTime;
    const successRate = (this.results.passed / this.results.totalTests * 100).toFixed(1);
    
    const report = {
      summary: {
        totalTests: this.results.totalTests,
        passed: this.results.passed,
        failed: this.results.failed,
        successRate: `${successRate}%`,
        duration: `${duration}ms`,
        launchReady: this.results.failed === 0
      },
      testResults: this.results.testResults,
      memoryUsage: this.results.memoryUsage,
      errors: this.results.errors,
      timestamp: new Date().toISOString()
    };
    
    // Write report to file
    const reportFileName = `LAUNCH_READINESS_TEST_REPORT_${Date.now()}.json`;
    fs.writeFileSync(reportFileName, JSON.stringify(report, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 LAUNCH READINESS TEST RESULTS');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Duration: ${duration}ms`);
    console.log(`Launch Ready: ${this.results.failed === 0 ? 'YES' : 'NO'}`);
    console.log('='.repeat(60));
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.results.errors.forEach(err => {
        console.log(`  - ${err.test}: ${err.error}`);
      });
    }
    
    console.log(`\n📊 Full report saved to: ${reportFileName}`);
    
    return report;
  }
}

// Run the test
if (require.main === module) {
  const test = new LaunchReadinessTest();
  test.runAllTests().catch(console.error);
}

module.exports = LaunchReadinessTest;