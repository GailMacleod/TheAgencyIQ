/**
 * 200-USER SCALABILITY TEST
 * Tests session management with 200 simulated users
 * Validates multi-user support and session persistence
 */

const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const TEST_USERS = 200;

class ScalabilityTest {
  constructor() {
    this.testResults = [];
    this.successCount = 0;
    this.failureCount = 0;
    this.startTime = Date.now();
  }

  async runScalabilityTest() {
    console.log('🚀 200-USER SCALABILITY TEST');
    console.log(`Target: ${BASE_URL}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log('');

    // Create promises for all user tests
    const userTests = [];
    for (let i = 1; i <= TEST_USERS; i++) {
      userTests.push(this.testUserSession(i));
    }

    // Run all tests concurrently
    console.log(`🔍 Testing ${TEST_USERS} concurrent users...`);
    const results = await Promise.allSettled(userTests);

    // Process results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        this.testResults.push(result.value);
        if (result.value.success) {
          this.successCount++;
        } else {
          this.failureCount++;
        }
      } else {
        this.failureCount++;
        this.testResults.push({
          userId: index + 1,
          success: false,
          error: result.reason.message || 'Unknown error'
        });
      }
    });

    this.generateReport();
  }

  async testUserSession(userId) {
    try {
      const testEmail = `testuser${userId}@example.com`;
      const testPhone = `+61400000${userId.toString().padStart(3, '0')}`;
      
      // Step 1: Establish session
      const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
        email: testEmail,
        phone: testPhone
      }, {
        timeout: 30000,
        validateStatus: () => true
      });

      if (sessionResponse.status !== 200) {
        return {
          userId,
          success: false,
          error: `Session establishment failed: ${sessionResponse.status}`
        };
      }

      // Extract session cookie - use the signed session cookie
      const cookieHeader = sessionResponse.headers['set-cookie'];
      let sessionCookie = null;
      
      if (cookieHeader) {
        // Look for the signed session cookie (the one with the signature)
        const signedCookieMatch = cookieHeader.find(cookie => cookie.includes('s%3A'));
        if (signedCookieMatch) {
          sessionCookie = signedCookieMatch.split(';')[0];
        } else {
          // Fallback to regular session cookie
          const sessionCookieMatch = cookieHeader.find(cookie => cookie.startsWith('theagencyiq.session='));
          if (sessionCookieMatch) {
            sessionCookie = sessionCookieMatch.split(';')[0];
          }
        }
      }

      if (!sessionCookie) {
        return {
          userId,
          success: false,
          error: 'No session cookie received'
        };
      }

      // Step 2: Test session persistence with /api/user
      const userResponse = await axios.get(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': sessionCookie
        },
        timeout: 30000,
        validateStatus: () => true
      });

      if (userResponse.status === 200) {
        return {
          userId,
          success: true,
          sessionId: sessionResponse.data.sessionId,
          user: userResponse.data.email || 'Test User'
        };
      } else {
        return {
          userId,
          success: false,
          error: `User endpoint failed: ${userResponse.status}`
        };
      }

    } catch (error) {
      return {
        userId,
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  generateReport() {
    const endTime = Date.now();
    const duration = (endTime - this.startTime) / 1000;
    const successRate = (this.successCount / TEST_USERS * 100).toFixed(1);
    
    console.log('');
    console.log('📊 200-USER SCALABILITY TEST REPORT');
    console.log('================================================================================');
    console.log(`⏱️  Duration: ${duration.toFixed(2)}s`);
    console.log(`👥 Total Users: ${TEST_USERS}`);
    console.log(`✅ Successful Sessions: ${this.successCount}`);
    console.log(`❌ Failed Sessions: ${this.failureCount}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⚡ Average Response Time: ${(duration / TEST_USERS * 1000).toFixed(0)}ms per user`);
    console.log('');

    // Show sample successful sessions
    const successfulSessions = this.testResults.filter(r => r.success).slice(0, 5);
    if (successfulSessions.length > 0) {
      console.log('🎯 Sample Successful Sessions:');
      successfulSessions.forEach(session => {
        console.log(`   User ${session.userId}: ${session.user} (${session.sessionId.substring(0, 20)}...)`);
      });
      console.log('');
    }

    // Show sample failures
    const failedSessions = this.testResults.filter(r => !r.success).slice(0, 5);
    if (failedSessions.length > 0) {
      console.log('❌ Sample Failed Sessions:');
      failedSessions.forEach(session => {
        console.log(`   User ${session.userId}: ${session.error}`);
      });
      console.log('');
    }

    // Production readiness assessment
    if (successRate >= 95) {
      console.log('🎉 PRODUCTION READY - Excellent scalability performance!');
      console.log('✅ System can handle 200+ concurrent users with high reliability');
    } else if (successRate >= 80) {
      console.log('⚠️  PRODUCTION CAPABLE - Good scalability with room for improvement');
      console.log('✅ System can handle moderate user load');
    } else {
      console.log('❌ PRODUCTION NEEDS WORK - Scalability issues detected');
      console.log('⚠️  System may struggle with high user load');
    }

    console.log('');
    console.log(`📄 Test completed at ${new Date().toISOString()}`);
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      duration: duration,
      totalUsers: TEST_USERS,
      successCount: this.successCount,
      failureCount: this.failureCount,
      successRate: successRate,
      avgResponseTime: (duration / TEST_USERS * 1000).toFixed(0),
      sampleResults: this.testResults.slice(0, 20)
    };

    require('fs').writeFileSync(
      `200_USER_SCALABILITY_TEST_REPORT_${Date.now()}.json`,
      JSON.stringify(reportData, null, 2)
    );
  }
}

// Run the test
const test = new ScalabilityTest();
test.runScalabilityTest().catch(console.error);