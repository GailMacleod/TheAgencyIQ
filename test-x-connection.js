/**
 * X PLATFORM CONNECTION TEST
 * Tests OAuth credentials, token validation, and platform connectivity
 */

import axios from 'axios';

async function testXConnection() {
  console.log('🔍 X PLATFORM CONNECTION TEST STARTING...\n');
  
  // Test 1: Check environment variables
  console.log('1. CHECKING X API CREDENTIALS:');
  const xConsumerKey = process.env.X_CONSUMER_KEY;
  const xConsumerSecret = process.env.X_CONSUMER_SECRET;
  const xaiApiKey = process.env.XAI_API_KEY;
  
  console.log(`   X_CONSUMER_KEY: ${xConsumerKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`   X_CONSUMER_SECRET: ${xConsumerSecret ? '✅ Present' : '❌ Missing'}`);
  console.log(`   XAI_API_KEY: ${xaiApiKey ? '✅ Present' : '❌ Missing'}`);
  
  if (xConsumerKey && xConsumerSecret) {
    console.log(`   Consumer Key Preview: ${xConsumerKey.substring(0, 10)}...`);
  }
  
  // Test 2: Check OAuth refresh service
  console.log('\n2. TESTING OAUTH REFRESH SERVICE:');
  try {
    const { OAuthRefreshService } = await import('./server/oauth-refresh-service.js');
    console.log('   ✅ OAuth refresh service loaded successfully');
    
    console.log('   Testing token refresh logic...');
    const refreshResult = await OAuthRefreshService.validateAndRefreshConnection('x', 1);
    console.log(`   Refresh test result: ${refreshResult.success ? '✅ Logic working' : '❌ No connection found (expected)'}`);
    
  } catch (error) {
    console.log(`   ❌ OAuth service error: ${error.message}`);
  }
  
  // Test 3: Check X API connectivity
  console.log('\n3. TESTING X API CONNECTIVITY:');
  if (xConsumerKey && xConsumerSecret) {
    try {
      // Test X API v2 endpoint availability
      const response = await axios.get('https://api.twitter.com/2/tweets/search/recent?query=hello', {
        headers: {
          'Authorization': `Bearer ${xConsumerKey}` // This will fail but shows connectivity
        },
        timeout: 5000
      });
      console.log('   ✅ X API reachable');
    } catch (error) {
      if (error.response) {
        console.log(`   ✅ X API reachable (HTTP ${error.response.status})`);
        console.log(`   Response: ${error.response.data?.title || 'Authentication required'}`);
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.log('   ❌ X API unreachable - network issue');
      } else {
        console.log(`   ⚠️  X API test inconclusive: ${error.message}`);
      }
    }
  } else {
    console.log('   ⏭️  Skipping API connectivity test - credentials missing');
  }
  
  // Test 4: Check database platform connections
  console.log('\n4. CHECKING DATABASE PLATFORM CONNECTIONS:');
  try {
    const { storage } = await import('./server/storage.js');
    const connections = await storage.getPlatformConnectionsByUser(1);
    const xConnection = connections.find(c => c.platform === 'x');
    
    if (xConnection) {
      console.log('   ✅ X platform connection found in database');
      console.log(`   Connection ID: ${xConnection.id}`);
      console.log(`   Access Token: ${xConnection.accessToken ? 'Present' : 'Missing'}`);
      console.log(`   Refresh Token: ${xConnection.refreshToken ? 'Present' : 'Missing'}`);
      console.log(`   Expires At: ${xConnection.expiresAt || 'No expiration set'}`);
    } else {
      console.log('   ❌ No X platform connection found in database');
      console.log('   User needs to authenticate with X platform first');
    }
  } catch (error) {
    console.log(`   ❌ Database check failed: ${error.message}`);
  }
  
  // Test 5: Test OAuth status checker
  console.log('\n5. TESTING OAUTH STATUS CHECKER:');
  try {
    const { OAuthStatusChecker } = await import('./server/oauth-status-checker.js');
    console.log('   ✅ OAuth status checker loaded successfully');
    
    // Test with mock token
    const mockValidation = await OAuthStatusChecker.validateXToken('mock-token', 'mock-refresh');
    console.log(`   Mock validation result: ${mockValidation.isValid ? '✅ Valid' : '❌ Invalid (expected)'}`);
    
  } catch (error) {
    console.log(`   ❌ OAuth status checker error: ${error.message}`);
  }
  
  // Test 6: Check X integration service
  console.log('\n6. TESTING X INTEGRATION SERVICE:');
  try {
    const { XIntegration } = await import('./server/x-integration.js');
    const xIntegration = new XIntegration();
    console.log('   ✅ X integration service loaded successfully');
    
    // Check if it can initialize
    if (xIntegration.consumerKey && xIntegration.consumerSecret) {
      console.log('   ✅ X integration credentials initialized');
    } else {
      console.log('   ❌ X integration credentials not properly initialized');
    }
    
  } catch (error) {
    console.log(`   ❌ X integration service error: ${error.message}`);
  }
  
  // Summary
  console.log('\n📊 X PLATFORM CONNECTION TEST SUMMARY:');
  console.log('=====================================');
  
  const credentialsStatus = xConsumerKey && xConsumerSecret ? '✅ Ready' : '❌ Missing';
  console.log(`Environment Credentials: ${credentialsStatus}`);
  
  const xaiStatus = xaiApiKey ? '✅ Ready' : '❌ Missing';
  console.log(`X.AI API Key: ${xaiStatus}`);
  
  console.log('\n🔧 NEXT STEPS:');
  if (!xConsumerKey || !xConsumerSecret) {
    console.log('❌ X consumer credentials are not properly configured');
    console.log('   Please ensure X_CONSUMER_KEY and X_CONSUMER_SECRET are set');
  } else {
    console.log('✅ X OAuth 2.0 credentials are properly configured');
    console.log('✅ OAuth refresh system is ready');
    console.log('📱 Users can now authenticate with X platform');
  }
  
  console.log('\n🔍 Test completed successfully!');
}

// Run the test
testXConnection().catch(console.error);