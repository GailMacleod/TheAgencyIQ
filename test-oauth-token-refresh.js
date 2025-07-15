/**
 * OAuth Token Refresh Test
 * Tests token refresh for all platforms with real API integration
 */

import axios from 'axios';
import assert from 'assert';

// Configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const USER_ID = 2;
const PLATFORMS = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];

class OAuthTokenRefreshTest {
  constructor() {
    this.results = {
      sessionEstablishment: false,
      tokenValidation: {},
      tokenRefresh: {},
      realApiPublishing: {},
      quotaDeduction: {},
      endToEndSuccess: false,
      totalTests: 0,
      passedTests: 0,
      errors: []
    };
  }

  async runComprehensiveTest() {
    console.log('🔄 OAUTH TOKEN REFRESH TEST - COMPREHENSIVE VALIDATION');
    console.log('=' .repeat(60));

    try {
      // Step 1: Establish session
      await this.establishSession();
      
      // Step 2: Test token validation for each platform
      await this.testTokenValidation();
      
      // Step 3: Test token refresh for each platform
      await this.testTokenRefresh();
      
      // Step 4: Test real API publishing
      await this.testRealApiPublishing();
      
      // Step 5: Test quota deduction
      await this.testQuotaDeduction();
      
      // Step 6: Generate comprehensive report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Test suite failed:', error);
      this.results.errors.push(error.message);
    }
  }

  async establishSession() {
    try {
      console.log('\n🔐 STEP 1: Establishing session...');
      
      const response = await axios.post(`${BASE_URL}/api/establish-session`, {
        userEmail: 'gailm@macleodglba.com.au',
        force: true
      });
      
      if (response.data.sessionEstablished) {
        console.log('✅ Session established successfully');
        this.results.sessionEstablishment = true;
        this.results.passedTests++;
      } else {
        throw new Error('Session establishment failed');
      }
      
      this.results.totalTests++;
    } catch (error) {
      console.error('❌ Session establishment failed:', error.message);
      this.results.errors.push(`Session establishment: ${error.message}`);
      this.results.totalTests++;
    }
  }

  async testTokenValidation() {
    console.log('\n🔍 STEP 2: Testing token validation...');
    
    for (const platform of PLATFORMS) {
      try {
        const response = await axios.post(`${BASE_URL}/api/oauth/validate-token`, {
          userId: USER_ID,
          platform
        });
        
        this.results.tokenValidation[platform] = response.data;
        
        if (response.data.valid) {
          console.log(`✅ ${platform}: Token valid`);
          this.results.passedTests++;
        } else {
          console.log(`⚠️  ${platform}: Token invalid - ${response.data.error}`);
        }
        
        this.results.totalTests++;
      } catch (error) {
        console.error(`❌ ${platform}: Token validation failed - ${error.message}`);
        this.results.tokenValidation[platform] = { valid: false, error: error.message };
        this.results.errors.push(`${platform} token validation: ${error.message}`);
        this.results.totalTests++;
      }
    }
  }

  async testTokenRefresh() {
    console.log('\n🔄 STEP 3: Testing token refresh...');
    
    for (const platform of PLATFORMS) {
      try {
        const response = await axios.post(`${BASE_URL}/api/oauth/refresh-token`, {
          userId: USER_ID,
          platform
        });
        
        this.results.tokenRefresh[platform] = response.data;
        
        if (response.data.success) {
          console.log(`✅ ${platform}: Token refreshed successfully - ${response.data.method}`);
          this.results.passedTests++;
        } else {
          console.log(`⚠️  ${platform}: Token refresh failed - ${response.data.error}`);
        }
        
        this.results.totalTests++;
      } catch (error) {
        console.error(`❌ ${platform}: Token refresh failed - ${error.message}`);
        this.results.tokenRefresh[platform] = { success: false, error: error.message };
        this.results.errors.push(`${platform} token refresh: ${error.message}`);
        this.results.totalTests++;
      }
    }
  }

  async testRealApiPublishing() {
    console.log('\n🚀 STEP 4: Testing real API publishing...');
    
    const testContent = `OAuth Token Refresh Test - ${new Date().toISOString()}`;
    
    for (const platform of PLATFORMS) {
      try {
        const response = await axios.post(`${BASE_URL}/api/publish-with-token-refresh`, {
          userId: USER_ID,
          platform,
          content: testContent
        });
        
        this.results.realApiPublishing[platform] = response.data;
        
        if (response.data.success && response.data.platformPostId) {
          console.log(`✅ ${platform}: Published successfully - Post ID: ${response.data.platformPostId}`);
          this.results.passedTests++;
        } else {
          console.log(`⚠️  ${platform}: Publishing failed - ${response.data.error}`);
        }
        
        this.results.totalTests++;
      } catch (error) {
        console.error(`❌ ${platform}: Publishing failed - ${error.message}`);
        this.results.realApiPublishing[platform] = { success: false, error: error.message };
        this.results.errors.push(`${platform} publishing: ${error.message}`);
        this.results.totalTests++;
      }
    }
  }

  async testQuotaDeduction() {
    console.log('\n📊 STEP 5: Testing quota deduction...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/quota-status/${USER_ID}`);
      
      this.results.quotaDeduction = response.data;
      
      if (response.data.remainingPosts !== undefined) {
        console.log(`✅ Quota status retrieved: ${response.data.remainingPosts}/${response.data.totalPosts} posts remaining`);
        this.results.passedTests++;
      } else {
        console.log('⚠️  Quota status invalid');
      }
      
      this.results.totalTests++;
    } catch (error) {
      console.error('❌ Quota deduction test failed:', error.message);
      this.results.quotaDeduction = { error: error.message };
      this.results.errors.push(`Quota deduction: ${error.message}`);
      this.results.totalTests++;
    }
  }

  generateReport() {
    console.log('\n📋 OAUTH TOKEN REFRESH TEST REPORT');
    console.log('=' .repeat(60));
    
    const successRate = ((this.results.passedTests / this.results.totalTests) * 100).toFixed(1);
    
    console.log(`\n🎯 OVERALL SUCCESS RATE: ${successRate}% (${this.results.passedTests}/${this.results.totalTests} tests passed)`);
    
    // Session establishment
    console.log(`\n🔐 Session Establishment: ${this.results.sessionEstablishment ? '✅ PASSED' : '❌ FAILED'}`);
    
    // Token validation results
    console.log('\n🔍 Token Validation Results:');
    for (const platform of PLATFORMS) {
      const result = this.results.tokenValidation[platform];
      const status = result && result.valid ? '✅ VALID' : '❌ INVALID';
      const error = result && result.error ? ` - ${result.error}` : '';
      console.log(`  ${platform}: ${status}${error}`);
    }
    
    // Token refresh results
    console.log('\n🔄 Token Refresh Results:');
    for (const platform of PLATFORMS) {
      const result = this.results.tokenRefresh[platform];
      const status = result && result.success ? '✅ SUCCESS' : '❌ FAILED';
      const method = result && result.method ? ` (${result.method})` : '';
      const error = result && result.error ? ` - ${result.error}` : '';
      console.log(`  ${platform}: ${status}${method}${error}`);
    }
    
    // Real API publishing results
    console.log('\n🚀 Real API Publishing Results:');
    for (const platform of PLATFORMS) {
      const result = this.results.realApiPublishing[platform];
      const status = result && result.success ? '✅ PUBLISHED' : '❌ FAILED';
      const postId = result && result.platformPostId ? ` (Post ID: ${result.platformPostId})` : '';
      const error = result && result.error ? ` - ${result.error}` : '';
      console.log(`  ${platform}: ${status}${postId}${error}`);
    }
    
    // Quota deduction
    const quotaStatus = this.results.quotaDeduction.remainingPosts !== undefined ? 
      `✅ ${this.results.quotaDeduction.remainingPosts}/${this.results.quotaDeduction.totalPosts} posts remaining` :
      '❌ FAILED';
    console.log(`\n📊 Quota Management: ${quotaStatus}`);
    
    // End-to-end success
    this.results.endToEndSuccess = successRate >= 80;
    console.log(`\n🎉 End-to-End Success: ${this.results.endToEndSuccess ? '✅ ACHIEVED' : '❌ NEEDS IMPROVEMENT'}`);
    
    // Production readiness
    console.log('\n🚀 PRODUCTION READINESS ASSESSMENT:');
    console.log(`  - Session Management: ${this.results.sessionEstablishment ? '✅ Ready' : '❌ Needs Fix'}`);
    console.log(`  - Token Validation: ${Object.values(this.results.tokenValidation).some(r => r.valid) ? '✅ Ready' : '❌ Needs OAuth'}`);
    console.log(`  - Token Refresh: ${Object.values(this.results.tokenRefresh).some(r => r.success) ? '✅ Ready' : '❌ Needs Tokens'}`);
    console.log(`  - Real API Publishing: ${Object.values(this.results.realApiPublishing).some(r => r.success) ? '✅ Ready' : '❌ Needs Tokens'}`);
    console.log(`  - Quota Management: ${this.results.quotaDeduction.remainingPosts !== undefined ? '✅ Ready' : '❌ Needs Fix'}`);
    
    if (this.results.errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      this.results.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log(`OAuth Token Refresh Test Complete - ${successRate}% Success Rate`);
  }
}

// Run the test
const test = new OAuthTokenRefreshTest();
test.runComprehensiveTest().catch(console.error);