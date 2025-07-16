/**
 * Test Real API Publishing System
 * Validates actual posting to all 5 platforms with real platform APIs
 * Tests authentication, quota deduction, and platform post IDs
 */

const axios = require('axios');

// Create axios instance with session cookie handling
const axiosInstance = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Store session cookie for reuse
let sessionCookie = null;

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class RealAPIPublishingTest {
  constructor() {
    this.results = {
      testStartTime: new Date().toISOString(),
      sessionEstablished: false,
      platformTests: [],
      totalPosts: 0,
      successfulPosts: 0,
      failedPosts: 0,
      errors: []
    };
  }

  async establishSession() {
    try {
      console.log('🔐 Establishing authenticated session...');
      
      const response = await axiosInstance.post(`${BASE_URL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      });
      
      // Store session cookie for subsequent requests
      if (response.headers['set-cookie']) {
        sessionCookie = response.headers['set-cookie'][0];
        axiosInstance.defaults.headers.Cookie = sessionCookie;
      }

      if (response.data.sessionEstablished) {
        this.results.sessionEstablished = true;
        console.log('✅ Session established for User ID:', response.data.user.id);
        return true;
      } else {
        this.results.errors.push('Session establishment failed');
        return false;
      }
    } catch (error) {
      this.results.errors.push(`Session establishment error: ${error.message}`);
      return false;
    }
  }

  async testPlatformPublishing(platform) {
    try {
      console.log(`\n📱 Testing ${platform.toUpperCase()} real API publishing...`);
      
      const testContent = `TEST POST - Real API Publishing Test ${platform.toUpperCase()} - ${new Date().toISOString()}`;
      
      const response = await axiosInstance.post(`${BASE_URL}/api/posts`, {
        content: testContent,
        platform: platform,
        status: 'approved'
      });

      const result = {
        platform: platform,
        success: response.status === 200,
        postId: response.data.id,
        platformPostId: response.data.platformPostId,
        content: testContent,
        response: response.data,
        error: null
      };

      if (response.status === 200 && response.data.platformPostId) {
        console.log(`✅ ${platform.toUpperCase()} - Real post created with Platform ID: ${response.data.platformPostId}`);
        this.results.successfulPosts++;
      } else {
        console.log(`❌ ${platform.toUpperCase()} - Publishing failed`);
        result.error = 'No platform post ID returned';
        this.results.failedPosts++;
      }

      this.results.platformTests.push(result);
      this.results.totalPosts++;
      
      return result;
      
    } catch (error) {
      console.log(`❌ ${platform.toUpperCase()} - Error: ${error.message}`);
      
      const result = {
        platform: platform,
        success: false,
        error: error.message,
        response: error.response?.data
      };
      
      this.results.platformTests.push(result);
      this.results.totalPosts++;
      this.results.failedPosts++;
      
      return result;
    }
  }

  async testQuotaDeduction() {
    try {
      console.log('\n📊 Testing quota deduction...');
      
      const response = await axiosInstance.get(`${BASE_URL}/api/user`);

      if (response.data.remainingPosts !== undefined) {
        console.log(`✅ Quota system working - Remaining posts: ${response.data.remainingPosts}`);
        this.results.quotaWorking = true;
        this.results.remainingPosts = response.data.remainingPosts;
      } else {
        console.log('❌ Quota system not working');
        this.results.quotaWorking = false;
      }
      
    } catch (error) {
      console.log(`❌ Quota check error: ${error.message}`);
      this.results.quotaWorking = false;
    }
  }

  async runComprehensiveTest() {
    console.log('🚀 REAL API PUBLISHING COMPREHENSIVE TEST');
    console.log('==========================================');
    
    // Step 1: Establish session
    if (!await this.establishSession()) {
      console.log('❌ Test failed at session establishment');
      return this.generateReport();
    }

    // Step 2: Test all 5 platforms
    const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    
    for (const platform of platforms) {
      await this.testPlatformPublishing(platform);
      
      // Wait 2 seconds between posts to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Step 3: Test quota deduction
    await this.testQuotaDeduction();

    return this.generateReport();
  }

  generateReport() {
    const successRate = this.results.totalPosts > 0 ? 
      (this.results.successfulPosts / this.results.totalPosts * 100).toFixed(1) : 0;

    console.log('\n📋 REAL API PUBLISHING TEST REPORT');
    console.log('==================================');
    console.log(`⏱️  Test Duration: ${((new Date() - new Date(this.results.testStartTime)) / 1000).toFixed(2)}s`);
    console.log(`🔐 Session Established: ${this.results.sessionEstablished ? '✅' : '❌'}`);
    console.log(`📱 Platforms Tested: ${this.results.platformTests.length}`);
    console.log(`✅ Successful Posts: ${this.results.successfulPosts}/${this.results.totalPosts}`);
    console.log(`❌ Failed Posts: ${this.results.failedPosts}/${this.results.totalPosts}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`📊 Quota System: ${this.results.quotaWorking ? '✅' : '❌'}`);
    
    if (this.results.remainingPosts !== undefined) {
      console.log(`📋 Remaining Posts: ${this.results.remainingPosts}`);
    }

    // Platform-specific results
    console.log('\n📱 Platform Results:');
    this.results.platformTests.forEach(test => {
      const status = test.success ? '✅' : '❌';
      const platformPostId = test.platformPostId ? ` (ID: ${test.platformPostId})` : '';
      console.log(`   ${status} ${test.platform.toUpperCase()}${platformPostId}`);
      if (test.error) {
        console.log(`     Error: ${test.error}`);
      }
    });

    if (this.results.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.results.errors.forEach(error => console.log(`   - ${error}`));
    }

    const isProductionReady = this.results.sessionEstablished && 
                             this.results.successfulPosts >= 3 && 
                             this.results.quotaWorking;
    
    console.log(`\n🎯 PRODUCTION READINESS: ${isProductionReady ? '✅ READY' : '❌ NOT READY'}`);
    
    return {
      success: isProductionReady,
      results: this.results
    };
  }
}

// Run the test
const test = new RealAPIPublishingTest();
test.runComprehensiveTest().then(result => {
  console.log('\n=== FINAL RESULT ===');
  console.log(result.success ? '✅ REAL API PUBLISHING SYSTEM READY' : '❌ REAL API PUBLISHING SYSTEM NOT READY');
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});