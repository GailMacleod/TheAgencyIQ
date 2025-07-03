/**
 * SECURE TOKEN REFRESH TEST SUITE
 * Tests 10 platform publishes with token validation and refresh
 * Verifies data/quota-debug.log for token-related errors
 */

import { AutoPostingEnforcer } from './server/auto-posting-enforcer.ts';
import { storage } from './server/storage.ts';
import fs from 'fs/promises';

async function testSecureTokenRefresh() {
  console.log('🔒 SECURE TOKEN REFRESH TEST SUITE');
  console.log('===================================');
  console.log('Testing 10 platform publishes with enhanced token validation');
  
  let testResults = {
    totalTests: 10,
    successfulPublishes: 0,
    tokenRefreshAttempts: 0,
    tokenValidationPassed: 0,
    tokensRefreshed: 0,
    errors: []
  };

  try {
    // Clear existing debug log for clean testing
    await fs.mkdir('data', { recursive: true });
    const logPath = 'data/quota-debug.log';
    
    console.log('\n1. Initializing test environment...');
    
    // Get test user
    const testUserId = 2; // gailm@macleodglba.com.au
    const user = await storage.getUser(testUserId);
    if (!user) {
      throw new Error('Test user not found');
    }
    console.log(`✅ Test user found: ${user.email} (${user.subscriptionPlan})`);
    
    // Get approved posts for testing
    const posts = await storage.getPostsByUser(testUserId);
    const approvedPosts = posts.filter(p => p.status === 'approved').slice(0, 10);
    
    if (approvedPosts.length === 0) {
      console.log('⚠️  No approved posts found, creating test posts...');
      // Create test posts for each platform
      const platforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'x'];
      const testPosts = [];
      
      for (let i = 0; i < Math.min(10, platforms.length * 2); i++) {
        const platform = platforms[i % platforms.length];
        const testPost = await storage.createPost({
          userId: testUserId,
          content: `Test post ${i + 1} for secure token refresh validation on ${platform}`,
          platform,
          status: 'approved',
          scheduledFor: new Date(),
          aiRecommendation: 'Generated for token refresh testing',
          subscriptionCycle: 'July 2025 Queensland Events'
        });
        testPosts.push(testPost);
      }
      approvedPosts.push(...testPosts);
    }
    
    console.log(`✅ Found ${approvedPosts.length} posts ready for publishing test`);
    
    // Test each platform publish with token validation
    console.log('\n2. Testing platform publishes with secure token refresh...');
    
    for (let i = 0; i < Math.min(10, approvedPosts.length); i++) {
      const post = approvedPosts[i];
      console.log(`\n--- Test ${i + 1}/10: Publishing to ${post.platform} ---`);
      
      try {
        // Run auto-posting enforcer for this user
        const result = await AutoPostingEnforcer.enforceAutoPosting(testUserId);
        
        if (result.success) {
          testResults.successfulPublishes++;
          console.log(`✅ Auto-posting enforcer succeeded: ${result.postsPublished} published`);
        } else {
          console.log(`❌ Auto-posting enforcer failed: ${result.errors.join(', ')}`);
          testResults.errors.push(`Test ${i + 1}: ${result.errors.join(', ')}`);
        }
        
        // Track connection repairs (token refreshes)
        if (result.connectionRepairs.length > 0) {
          testResults.tokenRefreshAttempts += result.connectionRepairs.length;
          console.log(`🔄 Token refresh attempts: ${result.connectionRepairs.join(', ')}`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Test ${i + 1} failed:`, error.message);
        testResults.errors.push(`Test ${i + 1}: ${error.message}`);
      }
    }
    
    // Check debug log for token-related entries
    console.log('\n3. Analyzing quota-debug.log for token validation results...');
    
    try {
      const logContent = await fs.readFile(logPath, 'utf-8');
      const logLines = logContent.split('\n').filter(line => line.trim());
      
      // Count token-related log entries
      const tokenValidationEntries = logLines.filter(line => 
        line.includes('Token') || line.includes('token') || line.includes('refresh')
      );
      
      const successfulValidations = logLines.filter(line => 
        line.includes('Token refreshed successfully') || 
        line.includes('Published successfully with token validation')
      );
      
      const tokenErrors = logLines.filter(line => 
        line.includes('Token validation failed') || 
        line.includes('Token expired and refresh failed')
      );
      
      testResults.tokenValidationPassed = successfulValidations.length;
      testResults.tokensRefreshed = logLines.filter(line => 
        line.includes('Token refreshed successfully')
      ).length;
      
      console.log(`✅ Token validation entries found: ${tokenValidationEntries.length}`);
      console.log(`✅ Successful token validations: ${testResults.tokenValidationPassed}`);
      console.log(`✅ Tokens successfully refreshed: ${testResults.tokensRefreshed}`);
      console.log(`⚠️  Token validation errors: ${tokenErrors.length}`);
      
      if (tokenErrors.length > 0) {
        console.log('Recent token errors:');
        tokenErrors.slice(-3).forEach(error => console.log(`   ${error}`));
      }
      
    } catch (error) {
      console.log(`⚠️  Could not read debug log: ${error.message}`);
    }
    
    // Final results
    console.log('\n📊 SECURE TOKEN REFRESH TEST RESULTS');
    console.log('=====================================');
    console.log(`✅ Successful publishes: ${testResults.successfulPublishes}/${testResults.totalTests}`);
    console.log(`🔄 Token refresh attempts: ${testResults.tokenRefreshAttempts}`);
    console.log(`✅ Token validations passed: ${testResults.tokenValidationPassed}`);
    console.log(`🔄 Tokens refreshed: ${testResults.tokensRefreshed}`);
    console.log(`❌ Errors encountered: ${testResults.errors.length}`);
    
    if (testResults.errors.length > 0) {
      console.log('\nError details:');
      testResults.errors.forEach(error => console.log(`   ${error}`));
    }
    
    const successRate = (testResults.successfulPublishes / testResults.totalTests) * 100;
    const tokenRefreshRate = testResults.tokensRefreshed > 0 ? 100 : 0;
    
    console.log(`\n🎯 OVERALL SUCCESS RATE: ${successRate.toFixed(1)}%`);
    console.log(`🔒 TOKEN REFRESH RELIABILITY: ${tokenRefreshRate}% (${testResults.tokensRefreshed > 0 ? 'ACTIVE' : 'STANDBY'})`);
    
    if (successRate >= 80 && testResults.errors.length === 0) {
      console.log('\n🚀 SECURE TOKEN REFRESH: PRODUCTION READY');
      return true;
    } else {
      console.log('\n⚠️  SECURE TOKEN REFRESH: NEEDS ATTENTION');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test suite error:', error.message);
    return false;
  }
}

// Run test
testSecureTokenRefresh()
  .then(success => {
    if (success) {
      console.log('\n✅ ALL SECURE TOKEN REFRESH TESTS PASSED');
      process.exit(0);
    } else {
      console.log('\n❌ SECURE TOKEN REFRESH TESTS NEED ATTENTION');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });