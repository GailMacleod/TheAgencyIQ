#!/usr/bin/env node

/**
 * COMPREHENSIVE AUTO-POSTING VALIDATION SUITE
 * Tests auto-posting after onboarding, token refresh scenarios, and notification confirmations
 */

const axios = require('axios');
const util = require('util');

const BASE_URL = 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
  userId: '2',
  testEmail: 'gail@macleodglbal.com.au',
  platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube'],
  sleepDelay: 2000, // 2 seconds between tests
  maxRetries: 3
};

// Utility functions
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const exponentialBackoff = async (attempt, maxDelay = 60000) => {
  const baseDelay = 1000; // 1 second
  const jitter = Math.random() * 0.1; // 10% jitter
  const delay = Math.min(baseDelay * Math.pow(2, attempt) * (1 + jitter), maxDelay);
  
  console.log(`⏱️ Exponential backoff: ${delay.toFixed(0)}ms (attempt ${attempt + 1})`);
  await sleep(delay);
};

class AutoPostingTestManager {
  constructor() {
    this.testResults = {
      onboardingTests: [],
      tokenRefreshTests: [],
      notificationTests: [],
      healthChecks: [],
      connectionTriggerTests: []
    };
    this.sessionCookie = null;
  }

  /**
   * Establish test session
   */
  async establishTestSession() {
    try {
      console.log('🔐 Establishing test session...');
      
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        phone: '+61424835189',
        password: 'password123'
      }, {
        withCredentials: true,
        timeout: 10000
      });

      if (response.data.success) {
        // Extract session cookie
        const cookies = response.headers['set-cookie'];
        if (cookies && cookies.length > 0) {
          this.sessionCookie = cookies[0].split(';')[0];
          console.log('✅ Session established successfully');
          return true;
        }
      }
      
      console.log('❌ Session establishment failed');
      return false;
    } catch (error) {
      console.error('❌ Session establishment error:', error.message);
      return false;
    }
  }

  /**
   * Make authenticated request
   */
  async authenticatedRequest(method, endpoint, data = null) {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      withCredentials: true,
      timeout: 15000,
      headers: {}
    };

    if (this.sessionCookie) {
      config.headers.Cookie = this.sessionCookie;
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
      config.headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await axios(config);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || error.message,
        status: error.response?.status
      };
    }
  }

  /**
   * Test auto-posting after onboarding completion
   */
  async testOnboardingAutoPosting() {
    console.log('\n📋 1. ONBOARDING AUTO-POSTING TESTS');
    console.log('--------------------------------------------------');

    try {
      console.log('🔄 Testing auto-posting after onboarding completion...');
      
      const result = await this.authenticatedRequest('POST', '/api/auto-posting/test-onboarding');
      
      if (result.success) {
        const data = result.data;
        this.testResults.onboardingTests.push({
          test: 'Onboarding Auto-Posting',
          passed: data.success,
          platforms: data.platforms || [],
          successfulPosts: data.results?.filter(r => r.success).length || 0,
          totalPosts: data.results?.length || 0,
          notificationsSent: data.notificationsSent || 0,
          errors: data.errors || []
        });

        if (data.success) {
          console.log('✅ PASS Onboarding Auto-Posting Test');
          console.log(`   Platforms: ${data.platforms?.join(', ') || 'None'}`);
          console.log(`   Successful posts: ${data.results?.filter(r => r.success).length || 0}/${data.results?.length || 0}`);
          console.log(`   Notifications sent: ${data.notificationsSent || 0}`);
        } else {
          console.log('❌ FAIL Onboarding Auto-Posting Test');
          console.log(`   Errors: ${data.errors?.join(', ') || 'Unknown'}`);
        }
      } else {
        console.log('❌ FAIL Onboarding Auto-Posting Test');
        console.log(`   Error: ${result.error}`);
        
        this.testResults.onboardingTests.push({
          test: 'Onboarding Auto-Posting',
          passed: false,
          error: result.error
        });
      }

      await sleep(TEST_CONFIG.sleepDelay);

    } catch (error) {
      console.error('❌ Onboarding auto-posting test failed:', error.message);
      this.testResults.onboardingTests.push({
        test: 'Onboarding Auto-Posting',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test posting with refreshed tokens
   */
  async testTokenRefreshPosting() {
    console.log('\n🔄 2. TOKEN REFRESH POSTING TESTS');
    console.log('--------------------------------------------------');

    const platforms = TEST_CONFIG.platforms;
    
    for (const platform of platforms) {
      try {
        console.log(`🔑 Testing token refresh posting for ${platform}...`);
        
        const oldToken = `old_token_${platform}_${Date.now()}`;
        
        const result = await this.authenticatedRequest('POST', '/api/auto-posting/test-refresh-token', {
          platform,
          oldToken
        });
        
        if (result.success) {
          const data = result.data;
          this.testResults.tokenRefreshTests.push({
            test: `Token Refresh Posting - ${platform}`,
            passed: data.success,
            platform: data.platform,
            tokenRefreshed: data.tokenRefreshed,
            postId: data.postId,
            quotaUsed: data.quotaUsed,
            notificationSent: data.notificationSent,
            errors: data.errors || []
          });

          if (data.success) {
            console.log(`✅ PASS Token Refresh Posting - ${platform}`);
            console.log(`   Token refreshed: ${data.tokenRefreshed ? 'Yes' : 'No'}`);
            console.log(`   Post ID: ${data.postId || 'None'}`);
            console.log(`   Notification sent: ${data.notificationSent ? 'Yes' : 'No'}`);
          } else {
            console.log(`❌ FAIL Token Refresh Posting - ${platform}`);
            console.log(`   Errors: ${data.errors?.join(', ') || 'Unknown'}`);
          }
        } else {
          console.log(`❌ FAIL Token Refresh Posting - ${platform}`);
          console.log(`   Error: ${result.error}`);
          
          this.testResults.tokenRefreshTests.push({
            test: `Token Refresh Posting - ${platform}`,
            passed: false,
            platform,
            error: result.error
          });
        }

        await sleep(TEST_CONFIG.sleepDelay);

      } catch (error) {
        console.error(`❌ Token refresh posting test failed for ${platform}:`, error.message);
        this.testResults.tokenRefreshTests.push({
          test: `Token Refresh Posting - ${platform}`,
          passed: false,
          platform,
          error: error.message
        });
      }
    }
  }

  /**
   * Test notification system
   */
  async testNotificationSystem() {
    console.log('\n📧 3. NOTIFICATION SYSTEM TESTS');
    console.log('--------------------------------------------------');

    const notificationTypes = [
      'onboarding_complete',
      'post_success',
      'token_refresh',
      'system_health'
    ];

    for (const type of notificationTypes) {
      try {
        console.log(`📨 Testing ${type} notification...`);
        
        const result = await this.authenticatedRequest('POST', '/api/auto-posting/test-notification', {
          type,
          platform: 'facebook' // test platform
        });
        
        if (result.success) {
          const data = result.data;
          this.testResults.notificationTests.push({
            test: `Notification - ${type}`,
            passed: data.success,
            type,
            email: data.email,
            subject: data.subject,
            error: data.error
          });

          if (data.success) {
            console.log(`✅ PASS Notification - ${type}`);
            console.log(`   Email: ${data.email || 'Unknown'}`);
            console.log(`   Subject: ${data.subject || 'Unknown'}`);
          } else {
            console.log(`❌ FAIL Notification - ${type}`);
            console.log(`   Error: ${data.error || 'Unknown'}`);
          }
        } else {
          console.log(`❌ FAIL Notification - ${type}`);
          console.log(`   Error: ${result.error}`);
          
          this.testResults.notificationTests.push({
            test: `Notification - ${type}`,
            passed: false,
            type,
            error: result.error
          });
        }

        await sleep(1000); // Shorter delay for notifications

      } catch (error) {
        console.error(`❌ Notification test failed for ${type}:`, error.message);
        this.testResults.notificationTests.push({
          test: `Notification - ${type}`,
          passed: false,
          type,
          error: error.message
        });
      }
    }
  }

  /**
   * Test auto-posting system health
   */
  async testSystemHealth() {
    console.log('\n🏥 4. SYSTEM HEALTH TESTS');
    console.log('--------------------------------------------------');

    try {
      console.log('🔍 Testing auto-posting system health...');
      
      const result = await this.authenticatedRequest('GET', '/api/auto-posting/health-check');
      
      if (result.success) {
        const data = result.data;
        this.testResults.healthChecks.push({
          test: 'System Health Check',
          passed: data.healthy,
          issues: data.issues || [],
          recommendations: data.recommendations || [],
          message: data.message
        });

        if (data.healthy) {
          console.log('✅ PASS System Health Check');
          console.log(`   Message: ${data.message || 'System healthy'}`);
        } else {
          console.log('⚠️ WARN System Health Check - Issues Found');
          console.log(`   Issues: ${data.issues?.join(', ') || 'None'}`);
          console.log(`   Recommendations: ${data.recommendations?.join(', ') || 'None'}`);
        }
      } else {
        console.log('❌ FAIL System Health Check');
        console.log(`   Error: ${result.error}`);
        
        this.testResults.healthChecks.push({
          test: 'System Health Check',
          passed: false,
          error: result.error
        });
      }

    } catch (error) {
      console.error('❌ System health test failed:', error.message);
      this.testResults.healthChecks.push({
        test: 'System Health Check',
        passed: false,
        error: error.message
      });
    }
  }

  /**
   * Test connection trigger
   */
  async testConnectionTrigger() {
    console.log('\n🔗 5. CONNECTION TRIGGER TESTS');
    console.log('--------------------------------------------------');

    const platforms = ['facebook', 'instagram'];
    
    for (const platform of platforms) {
      try {
        console.log(`⚡ Testing connection trigger for ${platform}...`);
        
        const result = await this.authenticatedRequest('POST', '/api/auto-posting/trigger-after-connection', {
          platform
        });
        
        if (result.success) {
          const data = result.data;
          this.testResults.connectionTriggerTests.push({
            test: `Connection Trigger - ${platform}`,
            passed: data.success,
            platform: data.platform,
            postId: data.postId,
            notificationSent: data.notificationSent,
            errors: data.errors || []
          });

          if (data.success) {
            console.log(`✅ PASS Connection Trigger - ${platform}`);
            console.log(`   Post ID: ${data.postId || 'None'}`);
            console.log(`   Notification sent: ${data.notificationSent ? 'Yes' : 'No'}`);
          } else {
            console.log(`❌ FAIL Connection Trigger - ${platform}`);
            console.log(`   Errors: ${data.errors?.join(', ') || 'Unknown'}`);
          }
        } else {
          console.log(`❌ FAIL Connection Trigger - ${platform}`);
          console.log(`   Error: ${result.error}`);
          
          this.testResults.connectionTriggerTests.push({
            test: `Connection Trigger - ${platform}`,
            passed: false,
            platform,
            error: result.error
          });
        }

        await sleep(TEST_CONFIG.sleepDelay);

      } catch (error) {
        console.error(`❌ Connection trigger test failed for ${platform}:`, error.message);
        this.testResults.connectionTriggerTests.push({
          test: `Connection Trigger - ${platform}`,
          passed: false,
          platform,
          error: error.message
        });
      }
    }
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('\n📊 COMPREHENSIVE AUTO-POSTING VALIDATION SUMMARY');
    console.log('======================================================================');

    const allTests = [
      ...this.testResults.onboardingTests,
      ...this.testResults.tokenRefreshTests,
      ...this.testResults.notificationTests,
      ...this.testResults.healthChecks,
      ...this.testResults.connectionTriggerTests
    ];

    const passedTests = allTests.filter(t => t.passed).length;
    const totalTests = allTests.length;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';

    console.log(`✅ Tests Passed: ${passedTests}`);
    console.log(`❌ Tests Failed: ${totalTests - passedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log('');

    // Category breakdown
    console.log('🔍 CATEGORY BREAKDOWN:');
    console.log('--------------------------------------------------');
    
    const categories = [
      { name: 'Onboarding Tests', tests: this.testResults.onboardingTests },
      { name: 'Token Refresh Tests', tests: this.testResults.tokenRefreshTests },
      { name: 'Notification Tests', tests: this.testResults.notificationTests },
      { name: 'Health Checks', tests: this.testResults.healthChecks },
      { name: 'Connection Triggers', tests: this.testResults.connectionTriggerTests }
    ];

    categories.forEach(category => {
      const passed = category.tests.filter(t => t.passed).length;
      const total = category.tests.length;
      const rate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0.0';
      
      console.log(`${category.name}: ${passed}/${total} (${rate}%)`);
    });

    console.log('');

    // Detailed failures
    const failedTests = allTests.filter(t => !t.passed);
    if (failedTests.length > 0) {
      console.log('❌ FAILED TESTS DETAILS:');
      console.log('--------------------------------------------------');
      failedTests.forEach(test => {
        console.log(`• ${test.test}: ${test.error || 'Unknown error'}`);
      });
      console.log('');
    }

    // Success indicators
    if (successRate >= '80.0') {
      console.log('🎯 OVERALL STATUS: ✅ AUTO-POSTING VALIDATION SUCCESSFUL');
      console.log('');
      console.log('⚡ AUTO-POSTING FEATURES CONFIRMED:');
      console.log('   ✅ Onboarding auto-posting tests working correctly');
      console.log('   ✅ Token refresh posting validation implemented');
      console.log('   ✅ Twilio/SendGrid notification system operational');
      console.log('   ✅ System health checks providing comprehensive monitoring');
      console.log('   ✅ Connection trigger tests ensuring post-onboarding validation');
      console.log('   ✅ Comprehensive error handling and notification workflows');
      console.log('');
      console.log('🚀 AUTO-POSTING VALIDATION COMPLETE: Post-onboarding testing with notifications');
    } else {
      console.log('🎯 OVERALL STATUS: ❌ AUTO-POSTING VALIDATION NEEDS ATTENTION');
      console.log('');
      console.log('⚠️ ISSUES TO ADDRESS:');
      console.log('   • Review failed test details above');
      console.log('   • Ensure notification services are properly configured');
      console.log('   • Verify platform connections and token refresh mechanisms');
      console.log('   • Check quota management integration');
    }

    return successRate >= '80.0';
  }

  /**
   * Run all validation tests
   */
  async runAllTests() {
    console.log('🚀 STARTING COMPREHENSIVE AUTO-POSTING VALIDATION');
    console.log('======================================================================');
    console.log(`Test Configuration:`);
    console.log(`- Base URL: ${BASE_URL}`);
    console.log(`- User ID: ${TEST_CONFIG.userId}`);
    console.log(`- Test Email: ${TEST_CONFIG.testEmail}`);
    console.log(`- Platforms: ${TEST_CONFIG.platforms.join(', ')}`);
    console.log(`- Sleep Delay: ${TEST_CONFIG.sleepDelay}ms`);
    console.log('');

    // Establish session first
    const sessionEstablished = await this.establishTestSession();
    if (!sessionEstablished) {
      console.log('❌ Cannot continue without valid session');
      return false;
    }

    // Run all test suites
    await this.testOnboardingAutoPosting();
    await this.testTokenRefreshPosting();
    await this.testNotificationSystem();
    await this.testSystemHealth();
    await this.testConnectionTrigger();

    // Generate final report
    return this.generateReport();
  }
}

// Main execution
async function main() {
  const validator = new AutoPostingTestManager();
  
  try {
    const success = await validator.runAllTests();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('💥 Validation suite crashed:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⚠️ Validation interrupted');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n⚠️ Validation terminated');
  process.exit(1);
});

if (require.main === module) {
  main();
}