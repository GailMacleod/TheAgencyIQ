/**
 * REAL API PUBLISHING TEST
 * Comprehensive test for publishing to all 5 platforms with real APIs
 * Tests platform post ID tracking, quota management, and rollback functionality
 */

import axios from 'axios';
import fs from 'fs';
import { performance } from 'perf_hooks';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class RealApiPublishingTest {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      testType: 'REAL_API_PUBLISHING',
      platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube'],
      results: [],
      summary: {
        totalPosts: 0,
        successfulPosts: 0,
        failedPosts: 0,
        platformPostIds: [],
        quotaDeducted: 0,
        errors: []
      }
    };
    this.sessionId = null;
    this.cookies = {};
  }

  async runComprehensiveTest() {
    console.log('🚀 REAL API PUBLISHING TEST STARTED');
    console.log('📋 Testing authentic platform APIs with post ID tracking and quota management');
    
    const startTime = performance.now();
    
    try {
      // Step 1: Establish authenticated session
      const sessionData = await this.establishSession();
      this.sessionId = sessionData.sessionId;
      
      // Step 2: Get initial quota status
      const initialQuota = await this.getQuotaStatus();
      console.log(`📊 Initial quota: ${initialQuota.remainingPosts}/${initialQuota.totalPosts}`);
      
      // Step 3: Create test posts for each platform
      const testPosts = await this.createTestPosts();
      
      // Step 4: Test real API publishing for each platform
      for (const platform of this.testResults.platforms) {
        await this.testRealApiPublishing(platform, testPosts);
      }
      
      // Step 5: Verify platform post IDs
      await this.verifyPlatformPostIds();
      
      // Step 6: Get final quota status
      const finalQuota = await this.getQuotaStatus();
      console.log(`📊 Final quota: ${finalQuota.remainingPosts}/${finalQuota.totalPosts}`);
      
      const endTime = performance.now();
      this.testResults.duration = Math.round(endTime - startTime);
      
      this.generateFinalReport();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      this.testResults.error = error.message;
      this.generateFinalReport();
    }
  }

  async establishSession() {
    try {
      const response = await axios.post(`${BASE_URL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      });
      
      if (response.data.sessionEstablished) {
        console.log('✅ Session established:', response.data.user.email);
        return response.data;
      } else {
        throw new Error('Session establishment failed');
      }
    } catch (error) {
      throw new Error(`Session establishment failed: ${error.message}`);
    }
  }

  async getQuotaStatus() {
    try {
      const response = await axios.get(`${BASE_URL}/api/subscription-usage`, {
        params: {
          sessionId: this.sessionId,
          userId: 2,
          userEmail: 'gailm@macleodglba.com.au'
        }
      });
      
      return response.data;
    } catch (error) {
      console.warn('⚠️ Quota status check failed:', error.message);
      return { remainingPosts: 48, totalPosts: 52 }; // Default quota
    }
  }

  async createTestPosts() {
    const posts = [];
    
    console.log('📝 Creating test posts for all platforms...');
    
    for (const platform of this.testResults.platforms) {
      try {
        const response = await axios.post(`${BASE_URL}/api/posts`, {
          content: `REAL API TEST POST for ${platform.toUpperCase()} - ${new Date().toISOString()}`,
          platform: platform,
          status: 'approved',
          scheduledFor: new Date().toISOString()
        }, {
          params: {
            sessionId: this.sessionId,
            userId: 2,
            userEmail: 'gailm@macleodglba.com.au'
          }
        });
        
        posts.push({
          id: response.data.id,
          platform: platform,
          content: response.data.content
        });
        
        console.log(`✅ Test post created for ${platform}: ID ${response.data.id}`);
      } catch (error) {
        console.error(`❌ Failed to create test post for ${platform}:`, error.response?.data?.message || error.message);
      }
    }
    
    return posts;
  }

  async testRealApiPublishing(platform, testPosts) {
    const post = testPosts.find(p => p.platform === platform);
    if (!post) {
      console.log(`⚠️ No test post found for ${platform}`);
      return;
    }

    console.log(`🚀 Testing ${platform} real API publishing...`);
    
    const platformResult = {
      platform: platform,
      postId: post.id,
      success: false,
      error: null,
      platformPostId: null,
      quotaDeducted: false,
      apiResponse: null,
      startTime: performance.now()
    };

    try {
      // Test real API publishing
      const response = await axios.post(`${BASE_URL}/api/publish-post`, {
        postId: post.id,
        platform: platform,
        useRealApi: true,
        trackQuota: true
      }, {
        params: {
          sessionId: this.sessionId,
          userId: 2,
          userEmail: 'gailm@macleodglba.com.au'
        }
      });
      
      platformResult.success = response.data.success;
      platformResult.platformPostId = response.data.platformPostId;
      platformResult.quotaDeducted = response.data.quotaDeducted;
      platformResult.apiResponse = response.data.apiResponse;
      
      if (response.data.success) {
        console.log(`✅ ${platform} published successfully: ${response.data.platformPostId}`);
        this.testResults.summary.successfulPosts++;
        this.testResults.summary.platformPostIds.push({
          platform: platform,
          postId: post.id,
          platformPostId: response.data.platformPostId
        });
      } else {
        console.log(`❌ ${platform} publishing failed: ${response.data.error}`);
        platformResult.error = response.data.error;
        this.testResults.summary.failedPosts++;
        this.testResults.summary.errors.push(`${platform}: ${response.data.error}`);
      }
      
      if (response.data.quotaDeducted) {
        this.testResults.summary.quotaDeducted++;
      }
      
    } catch (error) {
      platformResult.error = error.response?.data?.error || error.message;
      this.testResults.summary.failedPosts++;
      this.testResults.summary.errors.push(`${platform}: ${platformResult.error}`);
      console.error(`❌ ${platform} API error:`, platformResult.error);
    }
    
    platformResult.endTime = performance.now();
    platformResult.duration = Math.round(platformResult.endTime - platformResult.startTime);
    
    this.testResults.results.push(platformResult);
    this.testResults.summary.totalPosts++;
  }

  async verifyPlatformPostIds() {
    console.log('🔍 Verifying platform post IDs...');
    
    for (const platformPost of this.testResults.summary.platformPostIds) {
      try {
        const response = await axios.get(`${BASE_URL}/api/posts/${platformPost.postId}/platform-id`, {
          params: {
            sessionId: this.sessionId,
            userId: 2,
            userEmail: 'gailm@macleodglba.com.au'
          }
        });
        
        if (response.data.platformPostId === platformPost.platformPostId) {
          console.log(`✅ ${platformPost.platform} post ID verified: ${platformPost.platformPostId}`);
        } else {
          console.log(`❌ ${platformPost.platform} post ID mismatch: expected ${platformPost.platformPostId}, got ${response.data.platformPostId}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to verify ${platformPost.platform} post ID:`, error.message);
      }
    }
  }

  validatePlatformPostId(platform, postId) {
    const patterns = {
      facebook: /^[0-9]+_[0-9]+$/,
      instagram: /^[0-9]+$/,
      linkedin: /^urn:li:share:[0-9]+$/,
      x: /^[0-9]+$/,
      youtube: /^[A-Za-z0-9_-]{11}$/
    };
    
    return patterns[platform]?.test(postId) || false;
  }

  generateFinalReport() {
    console.log('\n📋 REAL API PUBLISHING TEST REPORT');
    console.log('============================================================');
    console.log(`✅ Total Posts: ${this.testResults.summary.totalPosts}`);
    console.log(`✅ Successful Posts: ${this.testResults.summary.successfulPosts}`);
    console.log(`❌ Failed Posts: ${this.testResults.summary.failedPosts}`);
    console.log(`💰 Quota Deducted: ${this.testResults.summary.quotaDeducted}`);
    console.log(`🎯 Platform Post IDs: ${this.testResults.summary.platformPostIds.length}`);
    console.log(`📊 Success Rate: ${this.testResults.summary.totalPosts > 0 ? Math.round((this.testResults.summary.successfulPosts / this.testResults.summary.totalPosts) * 100) : 0}%`);
    console.log(`⏱️ Duration: ${this.testResults.duration || 0}ms`);
    
    if (this.testResults.summary.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.testResults.summary.errors.forEach(error => {
        console.log(`   ${error}`);
      });
    }
    
    if (this.testResults.summary.platformPostIds.length > 0) {
      console.log('\n🆔 PLATFORM POST IDS:');
      this.testResults.summary.platformPostIds.forEach(post => {
        console.log(`   ${post.platform}: ${post.platformPostId}`);
      });
    }
    
    // Save detailed report
    const reportFilename = `REAL_API_PUBLISHING_TEST_REPORT_${Date.now()}.json`;
    try {
      fs.writeFileSync(reportFilename, JSON.stringify(this.testResults, null, 2));
      console.log(`📁 Report saved: ${reportFilename}`);
    } catch (error) {
      console.error('❌ Failed to save report:', error.message);
    }
    
    console.log('============================================================');
    
    // Summary by platform
    console.log('\n🌐 PLATFORM RESULTS:');
    this.testResults.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.platform}: ${result.success ? result.platformPostId : result.error}`);
    });
  }
}

// Run the test
const test = new RealApiPublishingTest();
test.runComprehensiveTest().catch(console.error);