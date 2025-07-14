/**
 * SESSION PERSISTENCE TEST
 * Simulates multiple logins to test session consistency and User ID 2 maintenance
 */

const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const TARGET_USER = {
  id: 2,
  email: 'gailm@macleodglba.com.au'
};

class SessionPersistenceTest {
  constructor() {
    this.testResults = [];
    this.sessionCount = 0;
  }

  async run() {
    console.log('🔐 Starting session persistence test...');
    console.log(`📋 Target: User ID ${TARGET_USER.id} (${TARGET_USER.email})`);
    
    try {
      // Test 1: Initial session establishment
      await this.testSessionEstablishment();
      
      // Test 2: Multiple login simulation
      await this.testMultipleLogins();
      
      // Test 3: Cookie reliability across requests
      await this.testCookieReliability();
      
      // Test 4: Session consistency validation
      await this.testSessionConsistency();
      
      // Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Session persistence test failed:', error);
    }
  }

  async testSessionEstablishment() {
    console.log('\n📝 Test 1: Session establishment...');
    
    try {
      const response = await axios.post(`${BASE_URL}/api/establish-session`, {
        email: TARGET_USER.email,
        userId: TARGET_USER.id
      });
      
      const sessionCookies = response.headers['set-cookie'];
      const sessionData = response.data;
      
      this.recordResult('session_establishment', {
        status: response.status,
        sessionId: sessionData.sessionId,
        userId: sessionData.user?.id,
        email: sessionData.user?.email,
        cookiesSet: !!sessionCookies,
        success: response.status === 200 && sessionData.user?.id === TARGET_USER.id
      });
      
      if (sessionData.user?.id === TARGET_USER.id) {
        console.log(`✅ Session established for User ID ${sessionData.user.id}`);
      } else {
        console.log(`❌ Session established for wrong user: ${sessionData.user?.id}`);
      }
      
    } catch (error) {
      this.recordResult('session_establishment', {
        error: error.message,
        success: false
      });
    }
  }

  async testMultipleLogins() {
    console.log('\n🔄 Test 2: Multiple login simulation...');
    
    const loginAttempts = 5;
    const userIds = [];
    
    for (let i = 0; i < loginAttempts; i++) {
      try {
        const response = await axios.post(`${BASE_URL}/api/establish-session`, {
          email: TARGET_USER.email,
          userId: TARGET_USER.id
        });
        
        const userId = response.data.user?.id;
        userIds.push(userId);
        
        console.log(`  Login ${i + 1}: User ID ${userId}`);
        
        // Brief delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`  Login ${i + 1}: Error - ${error.message}`);
        userIds.push(null);
      }
    }
    
    const consistentUserId = userIds.every(id => id === TARGET_USER.id);
    
    this.recordResult('multiple_logins', {
      attempts: loginAttempts,
      userIds,
      consistentUserId,
      allCorrect: consistentUserId,
      success: consistentUserId
    });
    
    if (consistentUserId) {
      console.log(`✅ All ${loginAttempts} logins returned User ID ${TARGET_USER.id}`);
    } else {
      console.log(`❌ Inconsistent user IDs detected: ${JSON.stringify(userIds)}`);
    }
  }

  async testCookieReliability() {
    console.log('\n🍪 Test 3: Cookie reliability...');
    
    try {
      // Establish session and get cookies
      const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
        email: TARGET_USER.email,
        userId: TARGET_USER.id
      });
      
      const cookies = sessionResponse.headers['set-cookie'];
      const headers = cookies ? { Cookie: cookies.join('; ') } : {};
      
      // Test cookie persistence across multiple requests
      const requests = [
        { endpoint: '/api/user', name: 'user_data' },
        { endpoint: '/api/user-status', name: 'user_status' },
        { endpoint: '/api/auth/session', name: 'session_check' }
      ];
      
      const results = {};
      
      for (const request of requests) {
        try {
          const response = await axios.get(`${BASE_URL}${request.endpoint}`, { headers });
          results[request.name] = {
            status: response.status,
            userId: response.data.id || response.data.userId || response.data.user?.id,
            success: response.status === 200
          };
        } catch (error) {
          results[request.name] = {
            error: error.message,
            success: false
          };
        }
      }
      
      const allSuccessful = Object.values(results).every(result => result.success);
      const consistentUserIds = Object.values(results)
        .filter(result => result.userId)
        .every(result => result.userId === TARGET_USER.id);
      
      this.recordResult('cookie_reliability', {
        cookiesProvided: !!cookies,
        requestResults: results,
        allSuccessful,
        consistentUserIds,
        success: allSuccessful && consistentUserIds
      });
      
      if (allSuccessful && consistentUserIds) {
        console.log('✅ Cookies working reliably across all endpoints');
      } else {
        console.log('❌ Cookie reliability issues detected');
      }
      
    } catch (error) {
      this.recordResult('cookie_reliability', {
        error: error.message,
        success: false
      });
    }
  }

  async testSessionConsistency() {
    console.log('\n🔍 Test 4: Session consistency validation...');
    
    try {
      // Test concurrent session requests
      const concurrentRequests = 3;
      const promises = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        promises.push(
          axios.post(`${BASE_URL}/api/establish-session`, {
            email: TARGET_USER.email,
            userId: TARGET_USER.id
          })
        );
      }
      
      const responses = await Promise.all(promises);
      const userIds = responses.map(response => response.data.user?.id);
      const sessionIds = responses.map(response => response.data.sessionId);
      
      const consistentUserIds = userIds.every(id => id === TARGET_USER.id);
      const uniqueSessionIds = new Set(sessionIds).size === sessionIds.length;
      
      this.recordResult('session_consistency', {
        concurrentRequests,
        userIds,
        sessionIds,
        consistentUserIds,
        uniqueSessionIds,
        success: consistentUserIds && uniqueSessionIds
      });
      
      if (consistentUserIds) {
        console.log(`✅ Consistent User ID ${TARGET_USER.id} across ${concurrentRequests} concurrent requests`);
      } else {
        console.log(`❌ Inconsistent user IDs: ${JSON.stringify(userIds)}`);
      }
      
      if (uniqueSessionIds) {
        console.log('✅ Unique session IDs generated');
      } else {
        console.log('❌ Duplicate session IDs detected');
      }
      
    } catch (error) {
      this.recordResult('session_consistency', {
        error: error.message,
        success: false
      });
    }
  }

  recordResult(testName, result) {
    this.testResults.push({
      test: testName,
      result,
      timestamp: new Date()
    });
  }

  generateReport() {
    const passedTests = this.testResults.filter(test => test.result.success).length;
    const totalTests = this.testResults.length;
    const successRate = (passedTests / totalTests) * 100;
    
    console.log('\n📊 SESSION PERSISTENCE TEST REPORT');
    console.log('='.repeat(40));
    console.log(`📋 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${totalTests - passedTests}`);
    console.log(`📊 Success Rate: ${successRate.toFixed(2)}%`);
    console.log(`🎯 Target User: ${TARGET_USER.email} (ID: ${TARGET_USER.id})`);
    
    console.log('\n📋 DETAILED RESULTS:');
    this.testResults.forEach((test, index) => {
      console.log(`${index + 1}. ${test.test}: ${test.result.success ? '✅ PASS' : '❌ FAIL'}`);
      if (!test.result.success && test.result.error) {
        console.log(`   Error: ${test.result.error}`);
      }
    });
    
    // Write report to file
    const fs = require('fs');
    const reportPath = `SESSION_PERSISTENCE_TEST_REPORT_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify({
      summary: { totalTests, passedTests, successRate },
      tests: this.testResults,
      targetUser: TARGET_USER
    }, null, 2));
    
    console.log(`\n📄 Full report saved to: ${reportPath}`);
    
    if (successRate >= 80) {
      console.log('\n🎉 SESSION PERSISTENCE: PASSED');
    } else {
      console.log('\n⚠️ SESSION PERSISTENCE: NEEDS ATTENTION');
    }
  }
}

// Execute test if run directly
if (require.main === module) {
  const test = new SessionPersistenceTest();
  test.run()
    .then(() => {
      console.log('✅ Session persistence test completed');
    })
    .catch((error) => {
      console.error('❌ Session persistence test failed:', error);
    });
}

module.exports = { SessionPersistenceTest };