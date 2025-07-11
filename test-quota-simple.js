#!/usr/bin/env node

/**
 * SIMPLE SUBSCRIPTION QUOTA TEST
 * Tests quota management via API endpoints
 */

const http = require('http');
const BASE_URL = 'http://localhost:5000';

class QuotaTest {
  constructor() {
    this.testResults = [];
  }

  async makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 5000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=s%3Aaiq_mcyawyk1_465y7kg6r8.%2FuUlQKFgSUpfHMjTQAoMdQKqM0YLQlOKTAEPRfMHcKE'
        }
      };

      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, data: parsed });
          } catch (e) {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });

      req.on('error', reject);

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async runTests() {
    console.log('🧪 Starting Simple Quota Testing...');
    console.log('===================================');

    try {
      // Test 1: Check current user quota
      await this.testCurrentUserQuota();

      // Test 2: Generate AI schedule multiple times
      await this.testScheduleGeneration();

      // Test 3: Check for duplicate drafts
      await this.testDraftDuplication();

      // Test 4: Simulate tier testing
      await this.testTierLimits();

      // Generate report
      this.generateReport();

    } catch (error) {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    }
  }

  async testCurrentUserQuota() {
    console.log('\n📊 Testing current user quota...');
    
    try {
      const response = await this.makeRequest('/api/user');
      
      if (response.status === 200) {
        const user = response.data;
        console.log(`  ✅ User: ${user.email}`);
        console.log(`  📦 Plan: ${user.subscriptionPlan}`);
        console.log(`  📊 Remaining: ${user.remainingPosts}/${user.totalPosts}`);
        
        this.testResults.push({
          test: 'current_user_quota',
          status: 'PASS',
          data: { 
            plan: user.subscriptionPlan, 
            remaining: user.remainingPosts, 
            total: user.totalPosts 
          }
        });
      } else {
        console.log('  ❌ Failed to fetch user data');
        this.testResults.push({
          test: 'current_user_quota',
          status: 'FAIL',
          error: 'Failed to fetch user data'
        });
      }
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.push({
        test: 'current_user_quota',
        status: 'ERROR',
        error: error.message
      });
    }
  }

  async testScheduleGeneration() {
    console.log('\n🤖 Testing schedule generation...');
    
    try {
      // Generate schedule first time
      console.log('  🔄 Generating schedule (first time)...');
      const response1 = await this.makeRequest('/api/generate-ai-schedule', 'POST', {
        brandPurpose: 'Test Queensland business automation',
        platforms: ['facebook', 'instagram', 'linkedin']
      });

      if (response1.status === 200) {
        console.log(`  ✅ First generation: ${response1.data.posts?.length || 0} posts`);
        
        // Generate schedule second time
        console.log('  🔄 Generating schedule (second time)...');
        const response2 = await this.makeRequest('/api/generate-ai-schedule', 'POST', {
          brandPurpose: 'Test Queensland business automation',
          platforms: ['facebook', 'instagram', 'linkedin']
        });

        if (response2.status === 200) {
          console.log(`  ✅ Second generation: ${response2.data.posts?.length || 0} posts`);
          
          this.testResults.push({
            test: 'schedule_generation',
            status: 'PASS',
            data: {
              first_generation: response1.data.posts?.length || 0,
              second_generation: response2.data.posts?.length || 0
            }
          });
        } else {
          console.log('  ❌ Second generation failed');
          this.testResults.push({
            test: 'schedule_generation',
            status: 'FAIL',
            error: 'Second generation failed'
          });
        }
      } else {
        console.log('  ❌ First generation failed');
        this.testResults.push({
          test: 'schedule_generation',
          status: 'FAIL',
          error: 'First generation failed'
        });
      }
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.push({
        test: 'schedule_generation',
        status: 'ERROR',
        error: error.message
      });
    }
  }

  async testDraftDuplication() {
    console.log('\n🔍 Testing draft duplication...');
    
    try {
      // Get posts before
      const beforeResponse = await this.makeRequest('/api/posts');
      const beforeDrafts = beforeResponse.data?.filter(p => p.status === 'draft') || [];
      
      console.log(`  📊 Drafts before: ${beforeDrafts.length}`);

      // Navigate simulation: generate again
      const response = await this.makeRequest('/api/generate-ai-schedule', 'POST', {
        brandPurpose: 'Test Queensland business automation',
        platforms: ['facebook', 'instagram', 'linkedin']
      });

      // Get posts after
      const afterResponse = await this.makeRequest('/api/posts');
      const afterDrafts = afterResponse.data?.filter(p => p.status === 'draft') || [];
      
      console.log(`  📊 Drafts after: ${afterDrafts.length}`);

      if (beforeDrafts.length === afterDrafts.length) {
        console.log('  ✅ No draft duplication detected');
        this.testResults.push({
          test: 'draft_duplication',
          status: 'PASS',
          data: { before: beforeDrafts.length, after: afterDrafts.length }
        });
      } else {
        console.log('  ❌ Draft duplication detected');
        this.testResults.push({
          test: 'draft_duplication',
          status: 'FAIL',
          data: { before: beforeDrafts.length, after: afterDrafts.length }
        });
      }
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.push({
        test: 'draft_duplication',
        status: 'ERROR',
        error: error.message
      });
    }
  }

  async testTierLimits() {
    console.log('\n🎯 Testing tier limits...');
    
    try {
      // Get current user
      const userResponse = await this.makeRequest('/api/user');
      const user = userResponse.data;
      
      console.log(`  📦 Current plan: ${user.subscriptionPlan} (${user.totalPosts} posts)`);
      
      // Test different tier expectations
      const tierLimits = {
        starter: 12,
        growth: 27,
        professional: 52
      };

      const expectedLimit = tierLimits[user.subscriptionPlan];
      
      if (user.totalPosts === expectedLimit) {
        console.log(`  ✅ Tier limit correct: ${user.totalPosts} posts`);
        this.testResults.push({
          test: 'tier_limits',
          status: 'PASS',
          data: { plan: user.subscriptionPlan, expected: expectedLimit, actual: user.totalPosts }
        });
      } else {
        console.log(`  ❌ Tier limit incorrect: expected ${expectedLimit}, got ${user.totalPosts}`);
        this.testResults.push({
          test: 'tier_limits',
          status: 'FAIL',
          data: { plan: user.subscriptionPlan, expected: expectedLimit, actual: user.totalPosts }
        });
      }
    } catch (error) {
      console.error('  ❌ Error:', error.message);
      this.testResults.push({
        test: 'tier_limits',
        status: 'ERROR',
        error: error.message
      });
    }
  }

  generateReport() {
    console.log('\n📊 QUOTA TEST REPORT');
    console.log('====================');

    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;

    console.log(`📈 Summary:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  🔥 Errors: ${errors}`);
    console.log(`  📊 Total: ${this.testResults.length}`);

    console.log('\n📋 Results:');
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '🔥';
      console.log(`  ${index + 1}. ${status} ${result.test}`);
      if (result.data) {
        console.log(`     Data: ${JSON.stringify(result.data)}`);
      }
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });

    const fs = require('fs');
    const report = {
      timestamp: new Date().toISOString(),
      summary: { passed, failed, errors, total: this.testResults.length },
      results: this.testResults
    };

    fs.writeFileSync('QUOTA_TEST_REPORT.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Report saved to: QUOTA_TEST_REPORT.json');
  }
}

// Execute tests
const test = new QuotaTest();
test.runTests()
  .then(() => {
    console.log('\n🎉 Quota testing completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Quota testing failed:', error);
    process.exit(1);
  });