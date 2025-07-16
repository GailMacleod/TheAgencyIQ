/**
 * REAL PLATFORM PUBLISHING TEST WITH QUOTA DEDUCTION
 * Tests actual API publishing to all 5 platforms with platform post ID tracking
 */

const axios = require('axios');
const assert = require('assert');

// Configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const TEST_EMAIL = 'gailm@macleodglba.com.au';

const PLATFORMS = [
  { name: 'facebook', displayName: 'Facebook' },
  { name: 'instagram', displayName: 'Instagram' },
  { name: 'linkedin', displayName: 'LinkedIn' },
  { name: 'x', displayName: 'X (Twitter)' },
  { name: 'youtube', displayName: 'YouTube' }
];

class RealPlatformPublishingTest {
  constructor() {
    this.sessionCookie = '';
    this.results = [];
    this.testPosts = [];
    this.initialQuota = 0;
    this.finalQuota = 0;
  }

  async run() {
    console.log('🚀 REAL PLATFORM PUBLISHING TEST WITH QUOTA DEDUCTION');
    console.log('====================================================');
    
    try {
      await this.establishSession();
      await this.checkInitialQuota();
      await this.createTestPosts();
      await this.publishToAllPlatforms();
      await this.verifyPlatformPostIds();
      await this.checkFinalQuota();
      await this.testRollbackOnFailure();
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
      this.results.push({
        test: 'Real Platform Publishing',
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
      test: 'Session Establishment',
      status: 'PASSED',
      details: `Session ID: ${response.data.sessionId}`
    });
  }

  async checkInitialQuota() {
    console.log('\n📊 Checking initial quota...');
    
    const response = await axios.get(`${BASE_URL}/api/user-status`, {
      headers: { Cookie: this.sessionCookie }
    });
    
    this.initialQuota = response.data.remainingPosts;
    console.log(`✅ Initial quota: ${this.initialQuota} posts remaining`);
    
    this.results.push({
      test: 'Initial Quota Check',
      status: 'PASSED',
      details: `Initial quota: ${this.initialQuota} posts`
    });
  }

  async createTestPosts() {
    console.log('\n📝 Creating test posts for all platforms...');
    
    for (const platform of PLATFORMS) {
      const postData = {
        content: `TEST POST for ${platform.displayName} - Platform Post ID Tracking Demo - ${new Date().toISOString()}`,
        platform: platform.name,
        status: 'approved'
      };
      
      const response = await axios.post(`${BASE_URL}/api/posts`, postData, {
        headers: { Cookie: this.sessionCookie }
      });
      
      this.testPosts.push({
        id: response.data.id,
        platform: platform.name,
        displayName: platform.displayName,
        content: postData.content
      });
      
      console.log(`✅ Created ${platform.displayName} post (ID: ${response.data.id})`);
    }
    
    this.results.push({
      test: 'Test Post Creation',
      status: 'PASSED',
      details: `Created ${this.testPosts.length} test posts`
    });
  }

  async publishToAllPlatforms() {
    console.log('\n🚀 Publishing to all platforms with real APIs...');
    
    const publishResults = [];
    
    for (const testPost of this.testPosts) {
      try {
        console.log(`\n📤 Publishing to ${testPost.displayName}...`);
        
        const publishResponse = await axios.post(`${BASE_URL}/api/publish-immediate`, {
          postId: testPost.id,
          platform: testPost.platform
        }, {
          headers: { Cookie: this.sessionCookie },
          timeout: 30000 // 30 second timeout for real API calls
        });
        
        const result = {
          platform: testPost.displayName,
          postId: testPost.id,
          success: publishResponse.data.success,
          platformPostId: publishResponse.data.platformPostId,
          error: publishResponse.data.error
        };
        
        publishResults.push(result);
        
        if (result.success && result.platformPostId) {
          console.log(`✅ ${testPost.displayName}: SUCCESS - Platform Post ID: ${result.platformPostId}`);
        } else {
          console.log(`❌ ${testPost.displayName}: FAILED - ${result.error || 'Unknown error'}`);
        }
        
      } catch (error) {
        console.log(`❌ ${testPost.displayName}: ERROR - ${error.message}`);
        publishResults.push({
          platform: testPost.displayName,
          postId: testPost.id,
          success: false,
          error: error.message
        });
      }
    }
    
    this.publishResults = publishResults;
    const successCount = publishResults.filter(r => r.success).length;
    const failCount = publishResults.filter(r => !r.success).length;
    
    console.log(`\n📊 Publishing Summary: ${successCount} successful, ${failCount} failed`);
    
    this.results.push({
      test: 'Real Platform Publishing',
      status: successCount > 0 ? 'PASSED' : 'FAILED',
      details: `${successCount} successful, ${failCount} failed publications`
    });
  }

  async verifyPlatformPostIds() {
    console.log('\n🔍 Verifying platform post IDs...');
    
    const response = await axios.get(`${BASE_URL}/api/posts/platform-ids`, {
      headers: { Cookie: this.sessionCookie }
    });
    
    const publishedPosts = response.data.publishedPosts;
    const verifiedPosts = [];
    
    for (const testPost of this.testPosts) {
      const publishedPost = publishedPosts.find(p => p.id === testPost.id);
      if (publishedPost && publishedPost.platformPostId) {
        verifiedPosts.push({
          platform: testPost.displayName,
          postId: testPost.id,
          platformPostId: publishedPost.platformPostId,
          verified: true
        });
        console.log(`✅ ${testPost.displayName}: Platform Post ID verified: ${publishedPost.platformPostId}`);
      } else {
        console.log(`❌ ${testPost.displayName}: No platform post ID found`);
      }
    }
    
    this.results.push({
      test: 'Platform Post ID Verification',
      status: verifiedPosts.length > 0 ? 'PASSED' : 'FAILED',
      details: `${verifiedPosts.length} posts with verified platform post IDs`
    });
  }

  async checkFinalQuota() {
    console.log('\n📊 Checking final quota after publishing...');
    
    const response = await axios.get(`${BASE_URL}/api/user-status`, {
      headers: { Cookie: this.sessionCookie }
    });
    
    this.finalQuota = response.data.remainingPosts;
    const quotaUsed = this.initialQuota - this.finalQuota;
    const successfulPosts = this.publishResults ? this.publishResults.filter(r => r.success).length : 0;
    
    console.log(`✅ Final quota: ${this.finalQuota} posts remaining`);
    console.log(`✅ Quota used: ${quotaUsed} posts`);
    console.log(`✅ Successful publications: ${successfulPosts}`);
    
    const quotaAccurate = quotaUsed === successfulPosts;
    if (quotaAccurate) {
      console.log('✅ Quota deduction is ACCURATE - only successful publications deducted');
    } else {
      console.log('❌ Quota deduction is INACCURATE - mismatch between usage and success');
    }
    
    this.results.push({
      test: 'Quota Accuracy',
      status: quotaAccurate ? 'PASSED' : 'FAILED',
      details: `Used: ${quotaUsed}, Successful: ${successfulPosts}, Accurate: ${quotaAccurate}`
    });
  }

  async testRollbackOnFailure() {
    console.log('\n🔄 Testing rollback on publication failure...');
    
    // Get current quota
    const beforeResponse = await axios.get(`${BASE_URL}/api/user-status`, {
      headers: { Cookie: this.sessionCookie }
    });
    const quotaBefore = beforeResponse.data.remainingPosts;
    
    // Create a test post
    const testPost = await axios.post(`${BASE_URL}/api/posts`, {
      content: 'ROLLBACK TEST POST',
      platform: 'facebook',
      status: 'approved'
    }, {
      headers: { Cookie: this.sessionCookie }
    });
    
    // Simulate a failed publication by manually recording failure
    await axios.post(`${BASE_URL}/api/posts/${testPost.data.id}/platform-id`, {
      platformPostId: null,
      success: false
    }, {
      headers: { Cookie: this.sessionCookie }
    });
    
    // Check quota after failure
    const afterResponse = await axios.get(`${BASE_URL}/api/user-status`, {
      headers: { Cookie: this.sessionCookie }
    });
    const quotaAfter = afterResponse.data.remainingPosts;
    
    const rollbackWorking = quotaBefore === quotaAfter;
    console.log(`✅ Quota before failure: ${quotaBefore}`);
    console.log(`✅ Quota after failure: ${quotaAfter}`);
    console.log(`✅ Rollback working: ${rollbackWorking ? 'YES' : 'NO'}`);
    
    this.results.push({
      test: 'Rollback on Failure',
      status: rollbackWorking ? 'PASSED' : 'FAILED',
      details: `Quota preserved on failure: ${rollbackWorking}`
    });
  }

  async generateReport() {
    console.log('\n📊 REAL PLATFORM PUBLISHING TEST RESULTS');
    console.log('=========================================');
    
    const passed = this.results.filter(r => r.status === 'PASSED').length;
    const failed = this.results.filter(r => r.status === 'FAILED').length;
    const total = this.results.length;
    
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    
    console.log('\nDetailed Results:');
    this.results.forEach((result, index) => {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    // Final assessment
    if (failed === 0) {
      console.log('\n🎉 ALL TESTS PASSED - Real Platform Publishing with Quota Deduction Working!');
    } else {
      console.log(`\n⚠️  ${failed} test(s) failed - Some issues need attention`);
    }
    
    return {
      total,
      passed,
      failed,
      successRate: Math.round((passed / total) * 100),
      results: this.results
    };
  }
}

// Run the test
(async () => {
  const tester = new RealPlatformPublishingTest();
  const results = await tester.run();
  
  process.exit(results.failed === 0 ? 0 : 1);
})();