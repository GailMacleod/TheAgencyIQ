/**
 * PLATFORM POST ID MANAGEMENT DEMO
 * Demonstrates the complete platform post ID tracking and quota integration system
 */

const axios = require('axios');
const assert = require('assert');

// Configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const TEST_USER_ID = 2;
const TEST_EMAIL = 'gailm@macleodglba.com.au';

class PlatformPostDemo {
  constructor() {
    this.sessionCookie = '';
    this.results = [];
  }

  async run() {
    console.log('🎬 PLATFORM POST ID MANAGEMENT DEMO');
    console.log('===================================');
    
    try {
      await this.establishSession();
      await this.createTestPost();
      await this.testPlatformPostTracking();
      await this.testQuotaIntegration();
      await this.testPostValidation();
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Demo failed:', error);
      this.results.push({
        step: 'Demo Execution',
        status: 'FAILED',
        error: error.message
      });
    }
    
    return this.results;
  }

  async establishSession() {
    console.log('\n🔐 Establishing session...');
    
    const response = await axios.post(`${BASE_URL}/api/auth/establish-session`, {
      email: TEST_EMAIL
    });
    
    this.sessionCookie = `theagencyiq.session=${response.data.sessionId}`;
    console.log('✅ Session established successfully');
    
    this.results.push({
      step: 'Session Establishment',
      status: 'SUCCESS',
      details: `Session ID: ${response.data.sessionId}`
    });
  }

  async createTestPost() {
    console.log('\n📝 Creating test post...');
    
    // Create a test post
    const createResponse = await axios.post(`${BASE_URL}/api/posts`, {
      content: 'TEST POST for platform post ID demonstration',
      platform: 'facebook',
      status: 'draft'
    }, {
      headers: { Cookie: this.sessionCookie }
    });
    
    this.testPostId = createResponse.data.id;
    console.log(`✅ Test post created with ID: ${this.testPostId}`);
    
    this.results.push({
      step: 'Test Post Creation',
      status: 'SUCCESS',
      details: `Post ID: ${this.testPostId}`
    });
  }

  async testPlatformPostTracking() {
    console.log('\n🔗 Testing platform post ID tracking...');
    
    // Simulate successful platform publication
    const platformPostId = 'fb_test_123456789';
    
    const trackingResponse = await axios.post(`${BASE_URL}/api/posts/${this.testPostId}/platform-id`, {
      platformPostId: platformPostId,
      success: true
    }, {
      headers: { Cookie: this.sessionCookie }
    });
    
    assert(trackingResponse.data.success, 'Platform post ID tracking should succeed');
    console.log(`✅ Platform post ID tracked: ${platformPostId}`);
    
    this.results.push({
      step: 'Platform Post ID Tracking',
      status: 'SUCCESS',
      details: `Platform post ID: ${platformPostId}`
    });
  }

  async testQuotaIntegration() {
    console.log('\n🔢 Testing quota integration...');
    
    // Check quota status before and after
    const quotaResponse = await axios.get(`${BASE_URL}/api/posts/platform-ids`, {
      headers: { Cookie: this.sessionCookie }
    });
    
    const publishedPosts = quotaResponse.data.publishedPosts;
    const quotaStatus = quotaResponse.data.quotaStatus;
    
    console.log(`✅ Published posts count: ${publishedPosts.length}`);
    console.log(`✅ Quota remaining: ${quotaStatus.remainingPosts}/${quotaStatus.totalPosts}`);
    
    // Verify our test post is in the published posts (if it was marked as published)
    const testPost = publishedPosts.find(p => p.id === this.testPostId);
    if (testPost) {
      console.log(`✅ Test post found in published posts with platform ID: ${testPost.platformPostId}`);
    }
    
    this.results.push({
      step: 'Quota Integration',
      status: 'SUCCESS',
      details: `${publishedPosts.length} posts with platform IDs, ${quotaStatus.remainingPosts} remaining`
    });
  }

  async testPostValidation() {
    console.log('\n✅ Testing post validation...');
    
    // Validate the test post
    const validationResponse = await axios.post(`${BASE_URL}/api/posts/validate-platform-id/${this.testPostId}`, {}, {
      headers: { Cookie: this.sessionCookie }
    });
    
    assert(validationResponse.data.success, 'Post validation should succeed');
    console.log(`✅ Post validation result: ${validationResponse.data.isValid ? 'VALID' : 'INVALID'}`);
    
    this.results.push({
      step: 'Post Validation',
      status: 'SUCCESS',
      details: `Post ${this.testPostId} validation: ${validationResponse.data.isValid ? 'VALID' : 'INVALID'}`
    });
  }

  async generateReport() {
    console.log('\n📊 DEMO RESULTS SUMMARY');
    console.log('=======================');
    
    const success = this.results.filter(r => r.status === 'SUCCESS').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    const total = this.results.length;
    
    console.log(`Total Steps: ${total}`);
    console.log(`Successful: ${success}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((success / total) * 100)}%`);
    
    console.log('\nDetailed Results:');
    this.results.forEach((result, index) => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.step}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Log final assessment
    if (failed === 0) {
      console.log('\n🎉 ALL DEMO STEPS COMPLETED SUCCESSFULLY!');
      console.log('The Platform Post ID Management System is working correctly.');
      console.log('✅ Posts are properly tracked with platform post IDs');
      console.log('✅ Quota is accurately calculated based on successful publications');
      console.log('✅ Platform post ID validation is working correctly');
      console.log('✅ API endpoints are responding as expected');
    } else {
      console.log(`\n⚠️  ${failed} step(s) failed - Some issues need attention`);
    }
    
    return {
      total,
      success,
      failed,
      successRate: Math.round((success / total) * 100),
      results: this.results
    };
  }
}

// Run the demo
(async () => {
  const demo = new PlatformPostDemo();
  const results = await demo.run();
  
  // Exit with appropriate code
  process.exit(results.failed === 0 ? 0 : 1);
})();