/**
 * Comprehensive 200-User Launch Test for TheAgencyIQ
 * Production-Ready Launch Testing with Real API Integration
 */

const axios = require('axios');
const fs = require('fs');
const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class Comprehensive200UserLaunchTest {
  constructor() {
    this.results = {
      userSignupAndLogin: { success: 0, failed: 0, errors: [] },
      sessionPersistence: { success: 0, failed: 0, errors: [] },
      stripeSubscriptions: { success: 0, failed: 0, errors: [] },
      platformConnections: { success: 0, failed: 0, errors: [] },
      postPublishing: { success: 0, failed: 0, errors: [] },
      quotaManagement: { success: 0, failed: 0, errors: [] },
      analyticsTracking: { success: 0, failed: 0, errors: [] },
      navigationFlow: { success: 0, failed: 0, errors: [] },
      subscriptionCancellation: { success: 0, failed: 0, errors: [] },
      multiUserConcurrency: { success: 0, failed: 0, errors: [] },
      memoryOptimization: { success: 0, failed: 0, errors: [] },
      webhookReliability: { success: 0, failed: 0, errors: [] },
      adminUserPreservation: { success: 0, failed: 0, errors: [] }
    };
    
    this.testUsers = [];
    this.concurrentBatches = 10;
    this.usersPerBatch = 20;
    this.totalUsers = 200;
    this.startTime = Date.now();
    this.memorySnapshots = [];
    this.performanceMetrics = {
      signupTime: [],
      loginTime: [],
      sessionTime: [],
      subscriptionTime: [],
      publishTime: []
    };
  }

  async runComprehensive200UserTest() {
    console.log('🚀 COMPREHENSIVE 200-USER LAUNCH TEST');
    console.log('=' .repeat(70));
    console.log('📊 Testing Production-Ready Multi-User Platform');
    console.log('🎯 Target: 200 concurrent users with full functionality');
    console.log('⚡ Real API integration with comprehensive validation');
    console.log('=' .repeat(70));
    
    try {
      // Phase 1: Mass User Creation (200 users)
      console.log('\n🔥 PHASE 1: Mass User Creation (200 users)');
      await this.testMassUserCreation();
      
      // Phase 2: Session Persistence & Authentication
      console.log('\n🔐 PHASE 2: Session Persistence & Authentication');
      await this.testSessionPersistenceAtScale();
      
      // Phase 3: Stripe Subscription Integration
      console.log('\n💳 PHASE 3: Stripe Subscription Integration');
      await this.testStripeSubscriptionAtScale();
      
      // Phase 4: Platform Connections
      console.log('\n🔗 PHASE 4: Platform Connections');
      await this.testPlatformConnectionsAtScale();
      
      // Phase 5: Post Publishing & Quota Management
      console.log('\n📱 PHASE 5: Post Publishing & Quota Management');
      await this.testPostPublishingAtScale();
      
      // Phase 6: Analytics & Navigation
      console.log('\n📊 PHASE 6: Analytics & Navigation');
      await this.testAnalyticsAtScale();
      
      // Phase 7: Subscription Management
      console.log('\n🔄 PHASE 7: Subscription Management');
      await this.testSubscriptionManagementAtScale();
      
      // Phase 8: Multi-User Concurrency
      console.log('\n⚡ PHASE 8: Multi-User Concurrency');
      await this.testMultiUserConcurrencyAtScale();
      
      // Phase 9: Memory & Performance
      console.log('\n🖥️  PHASE 9: Memory & Performance');
      await this.testMemoryOptimizationAtScale();
      
      // Phase 10: Webhook Reliability
      console.log('\n🔔 PHASE 10: Webhook Reliability');
      await this.testWebhookReliabilityAtScale();
      
      // Phase 11: Admin User Preservation
      console.log('\n👤 PHASE 11: Admin User Preservation');
      await this.testAdminUserPreservation();
      
      // Generate comprehensive launch report
      this.generateComprehensiveLaunchReport();
      
    } catch (error) {
      console.error('💥 Comprehensive test execution failed:', error.message);
      this.results.systemError = error.message;
    }
  }

  async testMassUserCreation() {
    console.log('-' .repeat(50));
    console.log('Creating 200 users in 10 concurrent batches...');
    
    const batchPromises = [];
    for (let batch = 0; batch < this.concurrentBatches; batch++) {
      batchPromises.push(this.processBatch(batch));
    }
    
    await Promise.allSettled(batchPromises);
    
    console.log(`✅ User Creation: ${this.results.userSignupAndLogin.success} success / ${this.results.userSignupAndLogin.failed} failed`);
    console.log(`👥 Total Users Created: ${this.testUsers.length}`);
    
    if (this.performanceMetrics.signupTime.length > 0) {
      const avgSignupTime = this.performanceMetrics.signupTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.signupTime.length;
      console.log(`⏱️  Average Signup Time: ${avgSignupTime.toFixed(0)}ms`);
    }
  }

  async processBatch(batchIndex) {
    const startIndex = batchIndex * this.usersPerBatch;
    const endIndex = Math.min(startIndex + this.usersPerBatch, this.totalUsers);
    
    const userPromises = [];
    for (let i = startIndex; i < endIndex; i++) {
      userPromises.push(this.createAndAuthenticateUser(i));
    }
    
    const results = await Promise.allSettled(userPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        this.results.userSignupAndLogin.success++;
        this.testUsers.push(result.value.user);
        if (result.value.signupTime) {
          this.performanceMetrics.signupTime.push(result.value.signupTime);
        }
      } else {
        this.results.userSignupAndLogin.failed++;
        this.results.userSignupAndLogin.errors.push(result.reason || result.value?.error);
      }
    });
  }

  async createAndAuthenticateUser(index) {
    const startTime = Date.now();
    
    try {
      const userData = {
        email: `launch200-${index}@example.com`,
        password: 'LaunchTest123!',
        phone: `+61${500000000 + index}`
      };
      
      // Try signup first
      let response;
      try {
        response = await axios.post(`${baseURL}/api/auth/signup`, userData, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'LaunchTest/1.0'
          }
        });
      } catch (signupError) {
        // If user exists, try login
        response = await axios.post(`${baseURL}/api/auth/login`, {
          email: userData.email,
          password: userData.password
        }, {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'LaunchTest/1.0'
          }
        });
      }
      
      const signupTime = Date.now() - startTime;
      
      if (response.status === 200 && response.data.user) {
        return {
          success: true,
          user: {
            ...userData,
            id: response.data.user.id,
            sessionCookies: response.headers['set-cookie'],
            authenticated: true
          },
          signupTime
        };
      }
      
      return { success: false, error: 'Invalid response' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async testSessionPersistenceAtScale() {
    console.log('-' .repeat(50));
    console.log('Testing session persistence with 100 users...');
    
    const testUsers = this.testUsers.slice(0, 100);
    
    for (const user of testUsers) {
      try {
        if (!user.sessionCookies) continue;
        
        const startTime = Date.now();
        const cookies = user.sessionCookies.map(c => c.split(';')[0]).join('; ');
        
        const response = await axios.get(`${baseURL}/api/user`, {
          headers: { 
            Cookie: cookies,
            'User-Agent': 'LaunchTest/1.0'
          },
          timeout: 10000
        });
        
        const sessionTime = Date.now() - startTime;
        
        if (response.status === 200 && response.data.id) {
          this.results.sessionPersistence.success++;
          this.performanceMetrics.sessionTime.push(sessionTime);
        } else {
          this.results.sessionPersistence.failed++;
          this.results.sessionPersistence.errors.push(`User ${user.email}: Invalid response`);
        }
      } catch (error) {
        this.results.sessionPersistence.failed++;
        this.results.sessionPersistence.errors.push(`User ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Session Persistence: ${this.results.sessionPersistence.success} success / ${this.results.sessionPersistence.failed} failed`);
    
    if (this.performanceMetrics.sessionTime.length > 0) {
      const avgSessionTime = this.performanceMetrics.sessionTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.sessionTime.length;
      console.log(`⏱️  Average Session Time: ${avgSessionTime.toFixed(0)}ms`);
    }
  }

  async testStripeSubscriptionAtScale() {
    console.log('-' .repeat(50));
    console.log('Testing Stripe subscriptions with 50 users...');
    
    const testUsers = this.testUsers.slice(0, 50);
    
    for (const user of testUsers) {
      try {
        if (!user.sessionCookies) continue;
        
        const startTime = Date.now();
        const cookies = user.sessionCookies.map(c => c.split(';')[0]).join('; ');
        
        const response = await axios.post(`${baseURL}/api/stripe/create-subscription`, {
          planId: 'professional'
        }, {
          headers: { 
            Cookie: cookies,
            'Content-Type': 'application/json',
            'User-Agent': 'LaunchTest/1.0'
          },
          timeout: 30000
        });
        
        const subscriptionTime = Date.now() - startTime;
        
        if (response.status === 200 && response.data.subscription) {
          this.results.stripeSubscriptions.success++;
          this.performanceMetrics.subscriptionTime.push(subscriptionTime);
        } else {
          this.results.stripeSubscriptions.failed++;
          this.results.stripeSubscriptions.errors.push(`User ${user.email}: Invalid response`);
        }
      } catch (error) {
        this.results.stripeSubscriptions.failed++;
        this.results.stripeSubscriptions.errors.push(`User ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Stripe Subscriptions: ${this.results.stripeSubscriptions.success} success / ${this.results.stripeSubscriptions.failed} failed`);
    
    if (this.performanceMetrics.subscriptionTime.length > 0) {
      const avgSubscriptionTime = this.performanceMetrics.subscriptionTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.subscriptionTime.length;
      console.log(`⏱️  Average Subscription Time: ${avgSubscriptionTime.toFixed(0)}ms`);
    }
  }

  async testPlatformConnectionsAtScale() {
    console.log('-' .repeat(50));
    console.log('Testing platform connections with 30 users...');
    
    const testUsers = this.testUsers.slice(0, 30);
    
    for (const user of testUsers) {
      try {
        if (!user.sessionCookies) continue;
        
        const cookies = user.sessionCookies.map(c => c.split(';')[0]).join('; ');
        
        const response = await axios.get(`${baseURL}/api/platform-connections`, {
          headers: { 
            Cookie: cookies,
            'User-Agent': 'LaunchTest/1.0'
          },
          timeout: 10000
        });
        
        if (response.status === 200) {
          this.results.platformConnections.success++;
        } else {
          this.results.platformConnections.failed++;
          this.results.platformConnections.errors.push(`User ${user.email}: Invalid response`);
        }
      } catch (error) {
        this.results.platformConnections.failed++;
        this.results.platformConnections.errors.push(`User ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Platform Connections: ${this.results.platformConnections.success} success / ${this.results.platformConnections.failed} failed`);
  }

  async testPostPublishingAtScale() {
    console.log('-' .repeat(50));
    console.log('Testing post publishing with 20 users...');
    
    const testUsers = this.testUsers.slice(0, 20);
    
    for (const user of testUsers) {
      try {
        if (!user.sessionCookies) continue;
        
        const startTime = Date.now();
        const cookies = user.sessionCookies.map(c => c.split(';')[0]).join('; ');
        
        const response = await axios.post(`${baseURL}/api/posts`, {
          content: `Launch test post from user ${user.email}`,
          platforms: ['facebook', 'linkedin'],
          scheduleType: 'immediate'
        }, {
          headers: { 
            Cookie: cookies,
            'Content-Type': 'application/json',
            'User-Agent': 'LaunchTest/1.0'
          },
          timeout: 20000
        });
        
        const publishTime = Date.now() - startTime;
        
        if (response.status === 200) {
          this.results.postPublishing.success++;
          this.performanceMetrics.publishTime.push(publishTime);
        } else {
          this.results.postPublishing.failed++;
          this.results.postPublishing.errors.push(`User ${user.email}: Invalid response`);
        }
      } catch (error) {
        this.results.postPublishing.failed++;
        this.results.postPublishing.errors.push(`User ${user.email}: ${error.message}`);
      }
    }
    
    console.log(`✅ Post Publishing: ${this.results.postPublishing.success} success / ${this.results.postPublishing.failed} failed`);
    
    if (this.performanceMetrics.publishTime.length > 0) {
      const avgPublishTime = this.performanceMetrics.publishTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.publishTime.length;
      console.log(`⏱️  Average Publish Time: ${avgPublishTime.toFixed(0)}ms`);
    }
  }

  async testAnalyticsAtScale() {
    console.log('-' .repeat(50));
    console.log('Testing analytics with 15 users...');
    
    const testUsers = this.testUsers.slice(0, 15);
    
    for (const user of testUsers) {
      try {
        if (!user.sessionCookies) continue;
        
        const cookies = user.sessionCookies.map(c => c.split(';')[0]).join('; ');
        
        const endpoints = ['/api/analytics', '/api/brand-purpose', '/api/user-status'];
        let navSuccess = 0;
        
        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(`${baseURL}${endpoint}`, {
              headers: { 
                Cookie: cookies,
                'User-Agent': 'LaunchTest/1.0'
              },
              timeout: 10000
            });
            
            if (response.status === 200) {
              navSuccess++;
            }
          } catch (navError) {
            // Continue testing other endpoints
          }
        }
        
        if (navSuccess >= 2) {
          this.results.analyticsTracking.success++;
          this.results.navigationFlow.success++;
        } else {
          this.results.analyticsTracking.failed++;
          this.results.navigationFlow.failed++;
        }
      } catch (error) {
        this.results.analyticsTracking.failed++;
        this.results.navigationFlow.failed++;
      }
    }
    
    console.log(`✅ Analytics: ${this.results.analyticsTracking.success} success / ${this.results.analyticsTracking.failed} failed`);
    console.log(`✅ Navigation: ${this.results.navigationFlow.success} success / ${this.results.navigationFlow.failed} failed`);
  }

  async testSubscriptionManagementAtScale() {
    console.log('-' .repeat(50));
    console.log('Testing subscription management with 10 users...');
    
    const testUsers = this.testUsers.slice(0, 10);
    
    for (const user of testUsers) {
      try {
        if (!user.sessionCookies) continue;
        
        const cookies = user.sessionCookies.map(c => c.split(';')[0]).join('; ');
        
        const response = await axios.post(`${baseURL}/api/stripe/cancel-subscription`, {}, {
          headers: { 
            Cookie: cookies,
            'Content-Type': 'application/json',
            'User-Agent': 'LaunchTest/1.0'
          },
          timeout: 15000
        });
        
        if (response.status === 200) {
          this.results.subscriptionCancellation.success++;
        } else {
          this.results.subscriptionCancellation.failed++;
        }
      } catch (error) {
        this.results.subscriptionCancellation.failed++;
      }
    }
    
    console.log(`✅ Subscription Management: ${this.results.subscriptionCancellation.success} success / ${this.results.subscriptionCancellation.failed} failed`);
  }

  async testMultiUserConcurrencyAtScale() {
    console.log('-' .repeat(50));
    console.log('Testing multi-user concurrency with 100 concurrent requests...');
    
    const concurrentPromises = [];
    for (let i = 0; i < 100; i++) {
      concurrentPromises.push(this.makeConcurrentRequest(i));
    }
    
    const results = await Promise.allSettled(concurrentPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value.success) {
        this.results.multiUserConcurrency.success++;
      } else {
        this.results.multiUserConcurrency.failed++;
      }
    });
    
    console.log(`✅ Multi-User Concurrency: ${this.results.multiUserConcurrency.success} success / ${this.results.multiUserConcurrency.failed} failed`);
  }

  async makeConcurrentRequest(index) {
    try {
      const userData = {
        email: `concurrent-${index}@example.com`,
        password: 'ConcurrentTest123!',
        phone: `+61${600000000 + index}`
      };
      
      const response = await axios.post(`${baseURL}/api/auth/login`, {
        email: userData.email,
        password: userData.password
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LaunchTest/1.0'
        }
      });
      
      return { success: response.status === 200 };
    } catch (error) {
      return { success: false };
    }
  }

  async testMemoryOptimizationAtScale() {
    console.log('-' .repeat(50));
    console.log('Testing memory optimization and performance...');
    
    try {
      const response = await axios.get(`${baseURL}/api/health`, {
        timeout: 10000,
        headers: {
          'User-Agent': 'LaunchTest/1.0'
        }
      });
      
      if (response.status === 200) {
        const memoryUsage = response.data.memory || {};
        const memoryMB = Math.round(memoryUsage.rss / 1024 / 1024);
        const withinLimits = memoryMB < 500; // 500MB limit
        
        this.memorySnapshots.push({
          timestamp: new Date().toISOString(),
          rss: memoryUsage.rss,
          heap: memoryUsage.heapUsed,
          external: memoryUsage.external
        });
        
        if (withinLimits) {
          this.results.memoryOptimization.success++;
        } else {
          this.results.memoryOptimization.failed++;
        }
        
        console.log(`📊 Memory Usage: ${memoryMB}MB`);
        console.log(`🎯 Within Limits: ${withinLimits ? 'Yes' : 'No'}`);
      }
    } catch (error) {
      this.results.memoryOptimization.failed++;
      console.log(`❌ Memory test failed: ${error.message}`);
    }
  }

  async testWebhookReliabilityAtScale() {
    console.log('-' .repeat(50));
    console.log('Testing webhook reliability...');
    
    const webhookTests = [
      'invoice.payment_succeeded',
      'customer.subscription.created',
      'customer.subscription.updated',
      'customer.subscription.deleted',
      'payment_intent.succeeded'
    ];
    
    for (const eventType of webhookTests) {
      try {
        const response = await axios.post(`${baseURL}/api/stripe/webhook`, {
          type: eventType,
          data: { object: { id: `test_${eventType}` } }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'LaunchTest/1.0'
          },
          timeout: 10000
        });
        
        if (response.status >= 200 && response.status < 300) {
          this.results.webhookReliability.success++;
        } else {
          this.results.webhookReliability.failed++;
        }
      } catch (error) {
        this.results.webhookReliability.failed++;
      }
    }
    
    console.log(`✅ Webhook Reliability: ${this.results.webhookReliability.success} success / ${this.results.webhookReliability.failed} failed`);
  }

  async testAdminUserPreservation() {
    console.log('-' .repeat(50));
    console.log('Testing admin user preservation...');
    
    try {
      const response = await axios.post(`${baseURL}/api/auth/login`, {
        email: 'gailm@macleodglba.com.au',
        password: 'admin123'
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LaunchTest/1.0'
        }
      });
      
      if (response.status === 200 && response.data.user) {
        this.results.adminUserPreservation.success++;
        console.log(`✅ Admin user preserved: ${response.data.user.email}`);
      } else {
        this.results.adminUserPreservation.failed++;
        console.log(`❌ Admin user not accessible`);
      }
    } catch (error) {
      this.results.adminUserPreservation.failed++;
      console.log(`❌ Admin user test failed: ${error.message}`);
    }
  }

  generateComprehensiveLaunchReport() {
    const totalTime = Date.now() - this.startTime;
    const totalTests = Object.values(this.results).reduce((sum, result) => 
      sum + (result.success || 0) + (result.failed || 0), 0
    );
    const totalSuccess = Object.values(this.results).reduce((sum, result) => 
      sum + (result.success || 0), 0
    );
    const successRate = totalTests > 0 ? (totalSuccess / totalTests * 100).toFixed(1) : 0;
    
    console.log('\n' + '='.repeat(70));
    console.log('🎯 COMPREHENSIVE 200-USER LAUNCH READINESS REPORT');
    console.log('='.repeat(70));
    
    console.log(`\n📊 EXECUTIVE SUMMARY:`);
    console.log(`   Overall Success Rate: ${successRate}%`);
    console.log(`   Total Tests Executed: ${totalTests}`);
    console.log(`   Tests Passed: ${totalSuccess}`);
    console.log(`   Tests Failed: ${totalTests - totalSuccess}`);
    console.log(`   Total Test Duration: ${(totalTime / 1000).toFixed(1)} seconds`);
    console.log(`   Users Successfully Created: ${this.testUsers.length}`);
    
    console.log(`\n📈 DETAILED TEST RESULTS:`);
    Object.entries(this.results).forEach(([testName, result]) => {
      const total = result.success + result.failed;
      const rate = total > 0 ? (result.success / total * 100).toFixed(1) : 0;
      const status = result.success > 0 ? '✅' : '❌';
      console.log(`   ${status} ${testName}: ${result.success}/${total} (${rate}%)`);
    });
    
    console.log(`\n⚡ PERFORMANCE METRICS:`);
    if (this.performanceMetrics.signupTime.length > 0) {
      const avgSignup = this.performanceMetrics.signupTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.signupTime.length;
      console.log(`   Average Signup Time: ${avgSignup.toFixed(0)}ms`);
    }
    if (this.performanceMetrics.sessionTime.length > 0) {
      const avgSession = this.performanceMetrics.sessionTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.sessionTime.length;
      console.log(`   Average Session Time: ${avgSession.toFixed(0)}ms`);
    }
    if (this.performanceMetrics.subscriptionTime.length > 0) {
      const avgSubscription = this.performanceMetrics.subscriptionTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.subscriptionTime.length;
      console.log(`   Average Subscription Time: ${avgSubscription.toFixed(0)}ms`);
    }
    if (this.performanceMetrics.publishTime.length > 0) {
      const avgPublish = this.performanceMetrics.publishTime.reduce((a, b) => a + b, 0) / this.performanceMetrics.publishTime.length;
      console.log(`   Average Publish Time: ${avgPublish.toFixed(0)}ms`);
    }
    
    console.log(`\n🖥️  SYSTEM HEALTH:`);
    if (this.memorySnapshots.length > 0) {
      const latestMemory = this.memorySnapshots[this.memorySnapshots.length - 1];
      const memoryMB = Math.round(latestMemory.rss / 1024 / 1024);
      console.log(`   Memory Usage: ${memoryMB}MB`);
      console.log(`   Memory Status: ${memoryMB < 500 ? 'Within Limits' : 'Exceeds Limits'}`);
    }
    
    console.log(`\n🚀 LAUNCH READINESS ASSESSMENT:`);
    if (successRate >= 85) {
      console.log(`   Status: ✅ PRODUCTION READY`);
      console.log(`   Confidence: HIGH - System ready for immediate launch`);
      console.log(`   Recommendation: Deploy with confidence - ${successRate}% success rate`);
    } else if (successRate >= 70) {
      console.log(`   Status: ⚠️  PARTIALLY READY`);
      console.log(`   Confidence: MEDIUM - Most systems operational`);
      console.log(`   Recommendation: Address key issues before launch`);
    } else {
      console.log(`   Status: ❌ NEEDS WORK`);
      console.log(`   Confidence: LOW - Significant issues detected`);
      console.log(`   Recommendation: Major improvements required`);
    }
    
    console.log(`\n🔧 CRITICAL FINDINGS:`);
    console.log(`   • Multi-user authentication: ${this.results.userSignupAndLogin.success > 0 ? 'Working' : 'Needs Fix'}`);
    console.log(`   • Session persistence: ${this.results.sessionPersistence.success > 0 ? 'Working' : 'Needs Fix'}`);
    console.log(`   • Stripe integration: ${this.results.stripeSubscriptions.success > 0 ? 'Working' : 'Needs Fix'}`);
    console.log(`   • Platform connections: ${this.results.platformConnections.success > 0 ? 'Working' : 'Needs Fix'}`);
    console.log(`   • Post publishing: ${this.results.postPublishing.success > 0 ? 'Working' : 'Needs Fix'}`);
    console.log(`   • Analytics system: ${this.results.analyticsTracking.success > 0 ? 'Working' : 'Needs Fix'}`);
    console.log(`   • Admin preservation: ${this.results.adminUserPreservation.success > 0 ? 'Working' : 'Needs Fix'}`);
    console.log(`   • Webhook reliability: ${this.results.webhookReliability.success > 0 ? 'Working' : 'Needs Fix'}`);
    
    console.log(`\n📋 NEXT STEPS:`);
    console.log(`   1. Review and fix failed test categories`);
    console.log(`   2. Optimize memory usage if needed`);
    console.log(`   3. Configure OAuth platform connections`);
    console.log(`   4. Set up production monitoring`);
    console.log(`   5. Deploy with confidence if >85% success rate`);
    
    console.log('\n' + '='.repeat(70));
    
    // Save comprehensive report
    const reportData = {
      timestamp: new Date().toISOString(),
      totalTime,
      successRate: parseFloat(successRate),
      totalTests,
      totalSuccess,
      results: this.results,
      performanceMetrics: this.performanceMetrics,
      memorySnapshots: this.memorySnapshots,
      testUsers: this.testUsers.length,
      launchReadiness: successRate >= 85 ? 'PRODUCTION_READY' : successRate >= 70 ? 'PARTIALLY_READY' : 'NEEDS_WORK'
    };
    
    const reportFilename = `COMPREHENSIVE_200_USER_LAUNCH_REPORT_${Date.now()}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify(reportData, null, 2));
    
    console.log(`💾 Comprehensive report saved: ${reportFilename}`);
  }
}

// Execute the comprehensive 200-user launch test
const launchTest = new Comprehensive200UserLaunchTest();
launchTest.runComprehensive200UserTest().catch(console.error);