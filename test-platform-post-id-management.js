/**
 * PLATFORM POST ID MANAGEMENT TEST
 * Tests real API publishing to all 5 platforms with proper quota deduction and rollback
 * Uses authentic platform APIs with real post ID validation
 */

import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class PlatformPostIdTest {
  constructor() {
    this.testResults = {
      timestamp: new Date().toISOString(),
      testType: 'PLATFORM_POST_ID_MANAGEMENT',
      platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube'],
      results: [],
      summary: {
        totalPosts: 0,
        successfulPosts: 0,
        failedPosts: 0,
        quotaDeducted: 0,
        rollbacksPerformed: 0
      }
    };
  }

  async runComprehensiveTest() {
    console.log('🧪 PLATFORM POST ID MANAGEMENT TEST STARTED');
    console.log('📋 Testing real API publishing with quota deduction and rollback');
    
    try {
      // Step 1: Get user session and quota status
      const session = await this.establishSession();
      const quotaStatus = await this.getQuotaStatus(session);
      
      console.log(`📊 Current quota: ${quotaStatus.remainingPosts}/${quotaStatus.totalPosts}`);
      
      // Step 2: Create test posts for all platforms
      const testPosts = await this.createTestPosts(session);
      
      // Step 3: Test publishing to all platforms with quota management
      for (const platform of this.testResults.platforms) {
        await this.testPlatformPublishingWithQuota(session, platform, testPosts);
      }
      
      // Step 4: Verify post IDs and quota deduction
      await this.verifyPostIdsAndQuota(session);
      
      // Step 5: Test rollback functionality
      await this.testRollbackFunctionality(session);
      
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
      
      console.log('✅ Session established:', response.data.user.email);
      
      // Store session information for subsequent requests
      this.sessionId = response.data.sessionId;
      this.sessionCookie = response.data.sessionId;
      
      return response.data.sessionId;
    } catch (error) {
      throw new Error(`Session establishment failed: ${error.message}`);
    }
  }

  async getQuotaStatus(sessionId) {
    try {
      const response = await axios.get(`${BASE_URL}/api/subscription-usage`, {
        headers: {
          'x-session-id': sessionId
        }
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Quota status failed: ${error.message}`);
    }
  }

  async createTestPosts(sessionId) {
    const posts = [];
    
    for (const platform of this.testResults.platforms) {
      try {
        const response = await axios.post(`${BASE_URL}/api/posts`, {
          content: `TEST POST for ${platform.toUpperCase()} - Platform Post ID Management Test ${Date.now()}`,
          platform: platform,
          status: 'approved',
          scheduledFor: new Date().toISOString()
        }, {
          headers: {
            'x-session-id': sessionId,
            'Content-Type': 'application/json'
          }
        });
        
        posts.push(response.data);
        console.log(`✅ Test post created for ${platform}: ID ${response.data.id}`);
      } catch (error) {
        console.error(`❌ Failed to create test post for ${platform}:`, error.message);
      }
    }
    
    return posts;
  }

  async testPlatformPublishingWithQuota(sessionId, platform, testPosts) {
    const post = testPosts.find(p => p.platform === platform);
    if (!post) {
      console.log(`⚠️ No test post found for ${platform}`);
      return;
    }

    console.log(`🚀 Testing ${platform} publishing with quota management...`);
    
    try {
      // Get quota before publishing
      const quotaBefore = await this.getQuotaStatus(sessionId);
      
      // Publish with real API
      const response = await axios.post(`${BASE_URL}/api/publish-post`, {
        postId: post.id,
        platform: platform,
        useRealApi: true,
        trackQuota: true
      }, {
        headers: {
          'x-session-id': sessionId,
          'Content-Type': 'application/json'
        }
      });
      
      // Get quota after publishing
      const quotaAfter = await this.getQuotaStatus(sessionId);
      
      const result = {
        platform: platform,
        postId: post.id,
        success: response.data.success,
        platformPostId: response.data.platformPostId,
        quotaDeductedProperly: quotaBefore.remainingPosts - quotaAfter.remainingPosts === 1,
        quotaBefore: quotaBefore.remainingPosts,
        quotaAfter: quotaAfter.remainingPosts,
        apiResponse: response.data,
        timestamp: new Date().toISOString()
      };
      
      this.testResults.results.push(result);
      this.testResults.summary.totalPosts++;
      
      if (result.success) {
        this.testResults.summary.successfulPosts++;
        if (result.quotaDeductedProperly) {
          this.testResults.summary.quotaDeducted++;
        }
        console.log(`✅ ${platform} published successfully - Post ID: ${result.platformPostId}`);
      } else {
        this.testResults.summary.failedPosts++;
        console.log(`❌ ${platform} publishing failed: ${response.data.error}`);
      }
      
    } catch (error) {
      console.error(`❌ ${platform} publishing error:`, error.message);
      this.testResults.results.push({
        platform: platform,
        postId: post.id,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      this.testResults.summary.failedPosts++;
    }
  }

  async verifyPostIdsAndQuota(sessionId) {
    console.log('🔍 Verifying platform post IDs and quota accuracy...');
    
    try {
      // Get all posts with platform IDs
      const response = await axios.get(`${BASE_URL}/api/posts/platform-ids`, {
        headers: {
          'x-session-id': sessionId
        }
      });
      
      const postsWithIds = response.data.posts || [];
      
      for (const post of postsWithIds) {
        if (post.platformPostId) {
          console.log(`✅ Post ${post.id} has platform ID: ${post.platformPostId}`);
          
          // Verify the platform post ID format
          const isValidId = this.validatePlatformPostId(post.platform, post.platformPostId);
          if (isValidId) {
            console.log(`✅ Platform post ID format valid for ${post.platform}`);
          } else {
            console.log(`❌ Platform post ID format invalid for ${post.platform}`);
          }
        } else {
          console.log(`⚠️ Post ${post.id} missing platform ID`);
        }
      }
      
      // Verify quota accuracy
      const currentQuota = await this.getQuotaStatus(sessionId);
      const expectedQuota = 52 - this.testResults.summary.quotaDeducted;
      
      if (currentQuota.remainingPosts === expectedQuota) {
        console.log(`✅ Quota accuracy verified: ${currentQuota.remainingPosts} remaining`);
      } else {
        console.log(`❌ Quota mismatch: Expected ${expectedQuota}, got ${currentQuota.remainingPosts}`);
      }
      
    } catch (error) {
      console.error('❌ Post ID verification failed:', error.message);
    }
  }

  validatePlatformPostId(platform, postId) {
    const patterns = {
      facebook: /^\d+_\d+$/, // Facebook post ID format
      instagram: /^[0-9]+_[0-9]+$/, // Instagram post ID format
      linkedin: /^urn:li:share:\d+$/, // LinkedIn share URN format
      x: /^\d+$/, // X/Twitter status ID format
      youtube: /^[A-Za-z0-9_-]{11}$/ // YouTube video ID format
    };
    
    return patterns[platform] ? patterns[platform].test(postId) : false;
  }

  async testRollbackFunctionality(sessionId) {
    console.log('🔄 Testing rollback functionality...');
    
    try {
      // Create a test post that should fail
      const failPost = await axios.post(`${BASE_URL}/api/posts`, {
        content: 'TEST ROLLBACK POST - This should fail intentionally',
        platform: 'facebook',
        status: 'approved',
        scheduledFor: new Date().toISOString()
      }, {
        headers: {
          'x-session-id': sessionId,
          'Content-Type': 'application/json'
        }
      });
      
      // Get quota before failed publish attempt
      const quotaBefore = await this.getQuotaStatus(sessionId);
      
      // Attempt to publish with intentional failure
      const response = await axios.post(`${BASE_URL}/api/publish-post`, {
        postId: failPost.data.id,
        platform: 'facebook',
        useRealApi: true,
        trackQuota: true,
        forceFailure: true // This should trigger rollback
      }, {
        headers: {
          'x-session-id': sessionId,
          'Content-Type': 'application/json'
        }
      });
      
      // Get quota after failed publish
      const quotaAfter = await this.getQuotaStatus(sessionId);
      
      // Verify quota was NOT deducted (rollback successful)
      if (quotaBefore.remainingPosts === quotaAfter.remainingPosts) {
        console.log('✅ Rollback successful - Quota preserved after failure');
        this.testResults.summary.rollbacksPerformed++;
      } else {
        console.log('❌ Rollback failed - Quota was deducted despite failure');
      }
      
    } catch (error) {
      console.error('❌ Rollback test failed:', error.message);
    }
  }

  generateFinalReport() {
    const report = {
      ...this.testResults,
      testCompleted: new Date().toISOString(),
      successRate: (this.testResults.summary.successfulPosts / this.testResults.summary.totalPosts) * 100,
      quotaAccuracy: (this.testResults.summary.quotaDeducted / this.testResults.summary.successfulPosts) * 100
    };
    
    const filename = `PLATFORM_POST_ID_TEST_REPORT_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    
    console.log('\n📋 PLATFORM POST ID MANAGEMENT TEST REPORT');
    console.log('=' .repeat(60));
    console.log(`✅ Total Posts: ${report.summary.totalPosts}`);
    console.log(`✅ Successful Posts: ${report.summary.successfulPosts}`);
    console.log(`❌ Failed Posts: ${report.summary.failedPosts}`);
    console.log(`💰 Quota Properly Deducted: ${report.summary.quotaDeducted}`);
    console.log(`🔄 Rollbacks Performed: ${report.summary.rollbacksPerformed}`);
    console.log(`📊 Success Rate: ${report.successRate.toFixed(2)}%`);
    console.log(`🎯 Quota Accuracy: ${report.quotaAccuracy.toFixed(2)}%`);
    console.log(`📁 Report saved: ${filename}`);
    console.log('=' .repeat(60));
    
    // Platform-specific results
    console.log('\n🌐 PLATFORM RESULTS:');
    for (const platform of this.testResults.platforms) {
      const result = this.testResults.results.find(r => r.platform === platform);
      if (result) {
        const status = result.success ? '✅' : '❌';
        const postId = result.platformPostId || 'N/A';
        console.log(`${status} ${platform.toUpperCase()}: ${postId}`);
      }
    }
  }
}

// Run the test
const test = new PlatformPostIdTest();
test.runComprehensiveTest().catch(console.error);