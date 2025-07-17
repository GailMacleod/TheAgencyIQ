/**
 * Comprehensive End-to-End Launch Test for TheAgencyIQ
 * Tests: 200 users, Stripe subscriptions, platform connections, publishing, analytics
 */

const axios = require('axios');
const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

// Test configuration
const TEST_CONFIG = {
  totalUsers: 200,
  concurrentBatch: 50,
  testTimeout: 300000, // 5 minutes
  platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube'],
  testPost: {
    content: 'Test post from TheAgencyIQ automated system',
    platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube']
  }
};

class LaunchReadinessTest {
  constructor() {
    this.results = {
      userSignup: { success: 0, failed: 0, errors: [] },
      stripeSubscription: { success: 0, failed: 0, duplicates: 0, errors: [] },
      userLogin: { success: 0, failed: 0, errors: [] },
      sessionPersistence: { success: 0, failed: 0, errors: [] },
      platformConnections: { success: 0, failed: 0, errors: [] },
      postPublishing: { success: 0, failed: 0, errors: [] },
      quotaManagement: { success: 0, failed: 0, errors: [] },
      analytics: { success: 0, failed: 0, errors: [] },
      navigation: { success: 0, failed: 0, errors: [] },
      subscriptionCancel: { success: 0, failed: 0, errors: [] },
      memoryUsage: { current: 0, peak: 0, withinLimits: true },
      webhookStatus: { success: 0, failed: 0, errors: [] }
    };
    this.testUsers = [];
    this.adminUser = { email: 'gailm@macleodglba.com.au', preserved: false };
    this.startTime = Date.now();
  }

  async runComprehensiveTest() {
    console.log('🚀 COMPREHENSIVE END-TO-END LAUNCH TEST');
    console.log('=' .repeat(60));
    console.log(`📊 Testing ${TEST_CONFIG.totalUsers} users with full system validation`);
    console.log(`⏱️  Test timeout: ${TEST_CONFIG.testTimeout / 1000} seconds`);
    console.log('=' .repeat(60));

    try {
      // Phase 1: User Signup (200 users)
      await this.testMassUserSignup();
      
      // Phase 2: Stripe Subscription Integration
      await this.testStripeSubscriptions();
      
      // Phase 3: User Login & Session Persistence
      await this.testLoginAndSessions();
      
      // Phase 4: Platform Connections
      await this.testPlatformConnections();
      
      // Phase 5: Post Publishing
      await this.testPostPublishing();
      
      // Phase 6: Analytics & Navigation
      await this.testAnalyticsAndNavigation();
      
      // Phase 7: Subscription Management
      await this.testSubscriptionManagement();
      
      // Phase 8: System Health & Memory
      await this.testSystemHealth();
      
      // Phase 9: Admin User Preservation
      await this.testAdminPreservation();
      
      // Generate comprehensive report
      this.generateLaunchReport();
      
    } catch (error) {
      console.error('💥 Test execution failed:', error.message);
      this.results.systemError = error.message;
    }
  }

  async testMassUserSignup() {
    console.log('\n📝 PHASE 1: Mass User Signup (200 users)');
    console.log('-'.repeat(50));
    
    const batches = Math.ceil(TEST_CONFIG.totalUsers / TEST_CONFIG.concurrentBatch);
    
    for (let batch = 0; batch < batches; batch++) {
      const batchStart = batch * TEST_CONFIG.concurrentBatch;
      const batchEnd = Math.min(batchStart + TEST_CONFIG.concurrentBatch, TEST_CONFIG.totalUsers);
      
      console.log(`⚡ Processing batch ${batch + 1}/${batches}: Users ${batchStart + 1}-${batchEnd}`);
      
      const batchPromises = [];
      for (let i = batchStart; i < batchEnd; i++) {
        batchPromises.push(this.signupUser(i));
      }
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.success) {
          this.results.userSignup.success++;
          this.testUsers.push(result.value.user);
        } else {
          this.results.userSignup.failed++;
          this.results.userSignup.errors.push(result.reason || result.value?.error);
        }
      });
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`✅ Signup Results: ${this.results.userSignup.success} success, ${this.results.userSignup.failed} failed`);
  }

  async signupUser(index) {
    try {
      const userData = {
        email: `launch-test-${index}@example.com`,
        password: 'TestPass123!',
        phone: `+61${400000000 + index}`
      };
      
      const response = await axios.post(`${baseURL}/api/auth/signup`, userData, {
        timeout: 30000
      });
      
      if (response.status === 200) {
        return { 
          success: true, 
          user: { 
            ...userData, 
            id: response.data.user?.id,
            sessionCookie: response.headers['set-cookie']?.[0]
          } 
        };
      }
      
      return { success: false, error: 'Invalid response status' };
    } catch (error) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async testStripeSubscriptions() {
    console.log('\n💳 PHASE 2: Stripe Subscription Integration');
    console.log('-'.repeat(50));
    
    const testUsers = this.testUsers.slice(0, 50); // Test with 50 users
    
    for (const user of testUsers) {
      try {
        // Login user first
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        let cookies = '';
        if (loginResponse.headers['set-cookie']) {
          cookies = loginResponse.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        
        // Create subscription
        const subscriptionResponse = await axios.post(`${baseURL}/api/stripe/create-subscription`, {
          planId: 'professional'
        }, {
          headers: { Cookie: cookies },
          timeout: 30000
        });
        
        if (subscriptionResponse.status === 200) {
          this.results.stripeSubscription.success++;
        } else {
          this.results.stripeSubscription.failed++;
          this.results.stripeSubscription.errors.push(`User ${user.email}: Invalid response`);
        }
        
      } catch (error) {
        this.results.stripeSubscription.failed++;
        this.results.stripeSubscription.errors.push(`User ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Stripe Results: ${this.results.stripeSubscription.success} success, ${this.results.stripeSubscription.failed} failed`);
  }

  async testLoginAndSessions() {
    console.log('\n🔐 PHASE 3: Login & Session Persistence');
    console.log('-'.repeat(50));
    
    const testUsers = this.testUsers.slice(0, 100); // Test with 100 users
    
    for (const user of testUsers) {
      try {
        // Test login
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        if (loginResponse.status === 200) {
          this.results.userLogin.success++;
          
          // Test session persistence
          let cookies = '';
          if (loginResponse.headers['set-cookie']) {
            cookies = loginResponse.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
          }
          
          // Test authenticated endpoint
          const userResponse = await axios.get(`${baseURL}/api/user`, {
            headers: { Cookie: cookies }
          });
          
          if (userResponse.status === 200) {
            this.results.sessionPersistence.success++;
          } else {
            this.results.sessionPersistence.failed++;
            this.results.sessionPersistence.errors.push(`User ${user.email}: Session persistence failed`);
          }
        } else {
          this.results.userLogin.failed++;
          this.results.userLogin.errors.push(`User ${user.email}: Login failed`);
        }
        
      } catch (error) {
        this.results.userLogin.failed++;
        this.results.userLogin.errors.push(`User ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Login Results: ${this.results.userLogin.success} success, ${this.results.userLogin.failed} failed`);
    console.log(`✅ Session Results: ${this.results.sessionPersistence.success} success, ${this.results.sessionPersistence.failed} failed`);
  }

  async testPlatformConnections() {
    console.log('\n🔗 PHASE 4: Platform Connections');
    console.log('-'.repeat(50));
    
    const testUsers = this.testUsers.slice(0, 20); // Test with 20 users
    
    for (const user of testUsers) {
      try {
        // Login user
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        let cookies = '';
        if (loginResponse.headers['set-cookie']) {
          cookies = loginResponse.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        
        // Test platform connections endpoint
        const platformsResponse = await axios.get(`${baseURL}/api/platform-connections`, {
          headers: { Cookie: cookies }
        });
        
        if (platformsResponse.status === 200) {
          this.results.platformConnections.success++;
        } else {
          this.results.platformConnections.failed++;
          this.results.platformConnections.errors.push(`User ${user.email}: Platform connections failed`);
        }
        
      } catch (error) {
        this.results.platformConnections.failed++;
        this.results.platformConnections.errors.push(`User ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Platform Results: ${this.results.platformConnections.success} success, ${this.results.platformConnections.failed} failed`);
  }

  async testPostPublishing() {
    console.log('\n📱 PHASE 5: Post Publishing');
    console.log('-'.repeat(50));
    
    const testUsers = this.testUsers.slice(0, 10); // Test with 10 users
    
    for (const user of testUsers) {
      try {
        // Login user
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        let cookies = '';
        if (loginResponse.headers['set-cookie']) {
          cookies = loginResponse.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        
        // Test post creation
        const postResponse = await axios.post(`${baseURL}/api/posts`, {
          content: TEST_CONFIG.testPost.content,
          platforms: TEST_CONFIG.testPost.platforms,
          scheduleType: 'immediate'
        }, {
          headers: { Cookie: cookies }
        });
        
        if (postResponse.status === 200) {
          this.results.postPublishing.success++;
        } else {
          this.results.postPublishing.failed++;
          this.results.postPublishing.errors.push(`User ${user.email}: Post publishing failed`);
        }
        
      } catch (error) {
        this.results.postPublishing.failed++;
        this.results.postPublishing.errors.push(`User ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Publishing Results: ${this.results.postPublishing.success} success, ${this.results.postPublishing.failed} failed`);
  }

  async testAnalyticsAndNavigation() {
    console.log('\n📊 PHASE 6: Analytics & Navigation');
    console.log('-'.repeat(50));
    
    const testUsers = this.testUsers.slice(0, 10); // Test with 10 users
    
    for (const user of testUsers) {
      try {
        // Login user
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        let cookies = '';
        if (loginResponse.headers['set-cookie']) {
          cookies = loginResponse.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        
        // Test analytics endpoint
        const analyticsResponse = await axios.get(`${baseURL}/api/analytics`, {
          headers: { Cookie: cookies }
        });
        
        if (analyticsResponse.status === 200) {
          this.results.analytics.success++;
        } else {
          this.results.analytics.failed++;
          this.results.analytics.errors.push(`User ${user.email}: Analytics failed`);
        }
        
        // Test navigation endpoints
        const endpoints = ['/api/brand-purpose', '/api/user-status', '/api/posts'];
        let navSuccess = true;
        
        for (const endpoint of endpoints) {
          try {
            const navResponse = await axios.get(`${baseURL}${endpoint}`, {
              headers: { Cookie: cookies }
            });
            if (navResponse.status !== 200) {
              navSuccess = false;
              break;
            }
          } catch (navError) {
            navSuccess = false;
            break;
          }
        }
        
        if (navSuccess) {
          this.results.navigation.success++;
        } else {
          this.results.navigation.failed++;
          this.results.navigation.errors.push(`User ${user.email}: Navigation failed`);
        }
        
      } catch (error) {
        this.results.analytics.failed++;
        this.results.analytics.errors.push(`User ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Analytics Results: ${this.results.analytics.success} success, ${this.results.analytics.failed} failed`);
    console.log(`✅ Navigation Results: ${this.results.navigation.success} success, ${this.results.navigation.failed} failed`);
  }

  async testSubscriptionManagement() {
    console.log('\n🔄 PHASE 7: Subscription Management');
    console.log('-'.repeat(50));
    
    const testUsers = this.testUsers.slice(0, 5); // Test with 5 users
    
    for (const user of testUsers) {
      try {
        // Login user
        const loginResponse = await axios.post(`${baseURL}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        let cookies = '';
        if (loginResponse.headers['set-cookie']) {
          cookies = loginResponse.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
        }
        
        // Test subscription cancellation
        const cancelResponse = await axios.post(`${baseURL}/api/stripe/cancel-subscription`, {}, {
          headers: { Cookie: cookies }
        });
        
        if (cancelResponse.status === 200) {
          this.results.subscriptionCancel.success++;
        } else {
          this.results.subscriptionCancel.failed++;
          this.results.subscriptionCancel.errors.push(`User ${user.email}: Cancellation failed`);
        }
        
      } catch (error) {
        this.results.subscriptionCancel.failed++;
        this.results.subscriptionCancel.errors.push(`User ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Cancellation Results: ${this.results.subscriptionCancel.success} success, ${this.results.subscriptionCancel.failed} failed`);
  }

  async testSystemHealth() {
    console.log('\n🏥 PHASE 8: System Health & Memory');
    console.log('-'.repeat(50));
    
    try {
      // Test system health endpoint
      const healthResponse = await axios.get(`${baseURL}/api/health`);
      
      if (healthResponse.status === 200) {
        this.results.memoryUsage.current = healthResponse.data.memory?.rss || 0;
        this.results.memoryUsage.peak = healthResponse.data.memory?.peak || 0;
        this.results.memoryUsage.withinLimits = (this.results.memoryUsage.current < 512 * 1024 * 1024); // 512MB
        
        console.log(`✅ Memory Usage: ${Math.round(this.results.memoryUsage.current / 1024 / 1024)}MB`);
        console.log(`✅ Within Limits: ${this.results.memoryUsage.withinLimits ? 'Yes' : 'No'}`);
      }
      
      // Test webhook endpoint
      const webhookResponse = await axios.post(`${baseURL}/api/stripe/webhook`, {
        type: 'test.webhook',
        data: { object: { id: 'test' } }
      });
      
      if (webhookResponse.status >= 200 && webhookResponse.status < 300) {
        this.results.webhookStatus.success++;
      } else {
        this.results.webhookStatus.failed++;
        this.results.webhookStatus.errors.push(`Webhook returned ${webhookResponse.status}`);
      }
      
    } catch (error) {
      console.log(`❌ System Health Error: ${error.message}`);
    }
  }

  async testAdminPreservation() {
    console.log('\n👤 PHASE 9: Admin User Preservation');
    console.log('-'.repeat(50));
    
    try {
      // Test admin user login
      const adminLoginResponse = await axios.post(`${baseURL}/api/auth/login`, {
        email: this.adminUser.email,
        password: 'admin123' // Assuming admin password
      });
      
      if (adminLoginResponse.status === 200) {
        this.adminUser.preserved = true;
        console.log(`✅ Admin user preserved: ${this.adminUser.email}`);
      } else {
        console.log(`❌ Admin user not accessible: ${this.adminUser.email}`);
      }
      
    } catch (error) {
      console.log(`❌ Admin user test failed: ${error.message}`);
    }
  }

  generateLaunchReport() {
    const totalTime = Date.now() - this.startTime;
    const totalTests = Object.values(this.results).reduce((sum, result) => 
      sum + (result.success || 0) + (result.failed || 0), 0
    );
    const totalSuccess = Object.values(this.results).reduce((sum, result) => 
      sum + (result.success || 0), 0
    );
    const successRate = totalTests > 0 ? (totalSuccess / totalTests * 100).toFixed(1) : 0;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 COMPREHENSIVE LAUNCH READINESS REPORT');
    console.log('='.repeat(60));
    
    console.log(`\n📊 OVERALL RESULTS:`);
    console.log(`   Success Rate: ${successRate}% (${totalSuccess}/${totalTests} tests)`);
    console.log(`   Total Test Time: ${(totalTime / 1000).toFixed(1)} seconds`);
    console.log(`   Total Users Created: ${this.results.userSignup.success}`);
    
    console.log(`\n📈 DETAILED BREAKDOWN:`);
    console.log(`   User Signup: ${this.results.userSignup.success} ✅ / ${this.results.userSignup.failed} ❌`);
    console.log(`   Stripe Subscriptions: ${this.results.stripeSubscription.success} ✅ / ${this.results.stripeSubscription.failed} ❌`);
    console.log(`   User Login: ${this.results.userLogin.success} ✅ / ${this.results.userLogin.failed} ❌`);
    console.log(`   Session Persistence: ${this.results.sessionPersistence.success} ✅ / ${this.results.sessionPersistence.failed} ❌`);
    console.log(`   Platform Connections: ${this.results.platformConnections.success} ✅ / ${this.results.platformConnections.failed} ❌`);
    console.log(`   Post Publishing: ${this.results.postPublishing.success} ✅ / ${this.results.postPublishing.failed} ❌`);
    console.log(`   Analytics: ${this.results.analytics.success} ✅ / ${this.results.analytics.failed} ❌`);
    console.log(`   Navigation: ${this.results.navigation.success} ✅ / ${this.results.navigation.failed} ❌`);
    console.log(`   Subscription Cancel: ${this.results.subscriptionCancel.success} ✅ / ${this.results.subscriptionCancel.failed} ❌`);
    
    console.log(`\n🖥️  SYSTEM HEALTH:`);
    console.log(`   Memory Usage: ${Math.round(this.results.memoryUsage.current / 1024 / 1024)}MB`);
    console.log(`   Within Limits: ${this.results.memoryUsage.withinLimits ? 'Yes' : 'No'}`);
    console.log(`   Webhook Status: ${this.results.webhookStatus.success > 0 ? 'Working' : 'Needs Attention'}`);
    console.log(`   Admin Preserved: ${this.adminUser.preserved ? 'Yes' : 'No'}`);
    
    console.log(`\n🚀 LAUNCH READINESS:`);
    if (successRate >= 85) {
      console.log(`   Status: ✅ PRODUCTION READY`);
      console.log(`   Recommendation: Safe to launch with ${successRate}% success rate`);
    } else if (successRate >= 70) {
      console.log(`   Status: ⚠️  PARTIALLY READY`);
      console.log(`   Recommendation: Address key issues before launch`);
    } else {
      console.log(`   Status: ❌ NEEDS WORK`);
      console.log(`   Recommendation: Significant improvements needed`);
    }
    
    console.log(`\n📝 NEXT STEPS:`);
    console.log(`   1. Review error logs for failed tests`);
    console.log(`   2. Implement missing functionality`);
    console.log(`   3. Optimize memory usage if needed`);
    console.log(`   4. Configure OAuth platform connections`);
    console.log(`   5. Set up production monitoring`);
    
    console.log('\n' + '='.repeat(60));
    
    // Save detailed results to file
    const fs = require('fs');
    const reportData = {
      timestamp: new Date().toISOString(),
      totalTime: totalTime,
      successRate: successRate,
      results: this.results,
      testUsers: this.testUsers.length,
      adminUser: this.adminUser
    };
    
    fs.writeFileSync(
      `LAUNCH_READINESS_REPORT_${Date.now()}.json`,
      JSON.stringify(reportData, null, 2)
    );
    
    console.log(`💾 Detailed report saved to: LAUNCH_READINESS_REPORT_${Date.now()}.json`);
  }
}

// Run the comprehensive test
const test = new LaunchReadinessTest();
test.runComprehensiveTest().catch(console.error);