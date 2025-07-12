/**
 * Test Direct Publish Fix - Verify publish_all action works correctly
 * Tests the new /api/direct-publish endpoint with publish_all action
 */

import axios from 'axios';

class DirectPublishTest {
  constructor() {
    this.baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
    this.cookies = '';
  }

  async establishSession() {
    try {
      console.log('🔐 Establishing session...');
      const response = await axios.post(`${this.baseURL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      }, {
        withCredentials: true
      });

      if (response.headers['set-cookie']) {
        this.cookies = response.headers['set-cookie'].join('; ');
        console.log('✅ Session established successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ Session establishment failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testDirectPublishEndpoint() {
    try {
      console.log('📝 Testing /api/direct-publish endpoint with publish_all action...');
      
      const response = await axios.post(`${this.baseURL}/api/direct-publish`, {
        action: 'publish_all'
      }, {
        headers: {
          'Cookie': this.cookies,
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });

      console.log('✅ Direct publish response:', response.data);
      
      if (response.data.success) {
        console.log(`🎉 SUCCESS: ${response.data.successCount}/${response.data.totalPosts} posts published`);
        return true;
      } else {
        console.log(`⚠️ PARTIAL SUCCESS: ${response.data.message}`);
        return false;
      }
    } catch (error) {
      console.error('❌ Direct publish failed:', error.response?.data || error.message);
      return false;
    }
  }

  async testQuotaStatus() {
    try {
      console.log('📊 Checking quota status...');
      
      const response = await axios.get(`${this.baseURL}/api/user-status`, {
        headers: {
          'Cookie': this.cookies
        },
        withCredentials: true
      });

      console.log('✅ Quota status:', {
        plan: response.data.subscriptionPlan,
        remaining: response.data.remainingPosts,
        total: response.data.totalPosts
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ Quota check failed:', error.response?.data || error.message);
      return null;
    }
  }

  async testApprovedPosts() {
    try {
      console.log('📋 Checking approved posts...');
      
      const response = await axios.get(`${this.baseURL}/api/posts`, {
        headers: {
          'Cookie': this.cookies
        },
        withCredentials: true
      });

      const posts = response.data;
      const approvedPosts = posts.filter(post => post.status === 'approved');
      
      console.log(`✅ Found ${approvedPosts.length} approved posts out of ${posts.length} total posts`);
      
      if (approvedPosts.length > 0) {
        console.log('📝 Approved posts:');
        approvedPosts.forEach(post => {
          console.log(`  - Post ${post.id}: ${post.platform} - "${post.content.substring(0, 50)}..."`);
        });
      }
      
      return approvedPosts;
    } catch (error) {
      console.error('❌ Posts check failed:', error.response?.data || error.message);
      return [];
    }
  }

  async runTest() {
    console.log('🧪 Starting Direct Publish Fix Test...\n');
    
    const sessionSuccess = await this.establishSession();
    if (!sessionSuccess) {
      console.log('❌ TEST FAILED: Could not establish session');
      return;
    }

    const quotaStatus = await this.testQuotaStatus();
    if (!quotaStatus) {
      console.log('❌ TEST FAILED: Could not check quota status');
      return;
    }

    const approvedPosts = await this.testApprovedPosts();
    if (approvedPosts.length === 0) {
      console.log('⚠️ TEST SKIPPED: No approved posts found to publish');
      return;
    }

    if (quotaStatus.remainingPosts < approvedPosts.length) {
      console.log(`⚠️ TEST SKIPPED: Insufficient quota (need ${approvedPosts.length}, have ${quotaStatus.remainingPosts})`);
      return;
    }

    const publishSuccess = await this.testDirectPublishEndpoint();
    
    console.log('\n📊 TEST RESULTS:');
    console.log(`✅ Session establishment: ${sessionSuccess ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Quota status check: ${quotaStatus ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Approved posts found: ${approvedPosts.length > 0 ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Direct publish execution: ${publishSuccess ? 'PASSED' : 'FAILED'}`);
    
    if (sessionSuccess && quotaStatus && approvedPosts.length > 0 && publishSuccess) {
      console.log('\n🎉 OVERALL TEST RESULT: PASSED - Direct publish fix is working correctly!');
    } else {
      console.log('\n❌ OVERALL TEST RESULT: FAILED - Direct publish fix needs attention');
    }
  }
}

const test = new DirectPublishTest();
test.runTest().catch(console.error);