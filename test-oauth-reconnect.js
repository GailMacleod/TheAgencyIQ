/**
 * OAuth Reconnection and Publishing Test
 * Tests token refresh system and actual platform publishing
 */

async function testOAuthReconnectionAndPublishing() {
  console.log('🔄 Starting OAuth reconnection and publishing test...');
  
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  try {
    // Step 1: Get current platform connections
    console.log('\n📊 Step 1: Getting current platform connections...');
    const connectionsResponse = await fetch(`${baseUrl}/api/platform-connections`, {
      credentials: 'include',
      headers: {
        'Cookie': 'connect.sid=s%3AaIoGwOCnhzQQJFRgCuwQCgDK6pCJlHVGCg%2F1m%2FP8.YUUmwFgaUmJhzQQJFRgCuwQCgDK6pCJlHVGCg%2F1m%2FP8'
      }
    });
    
    const connections = await connectionsResponse.json();
    console.log('Current connections:', connections.length);
    
    // Step 2: Test token refresh for each platform
    console.log('\n🔄 Step 2: Testing token refresh for each platform...');
    const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    const refreshResults = {};
    
    for (const platform of platforms) {
      console.log(`\nTesting ${platform} token refresh...`);
      
      const refreshResponse = await fetch(`${baseUrl}/api/oauth/refresh/${platform}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'connect.sid=s%3AaIoGwOCnhzQQJFRgCuwQCgDK6pCJlHVGCg%2F1m%2FP8.YUUmwFgaUmJhzQQJFRgCuwQCgDK6pCJlHVGCg%2F1m%2FP8'
        },
        credentials: 'include'
      });
      
      const refreshData = await refreshResponse.json();
      refreshResults[platform] = refreshData;
      
      console.log(`${platform} refresh result:`, {
        success: refreshData.success,
        needsReauth: refreshData.refreshResult?.needs_reauth,
        error: refreshData.refreshResult?.error
      });
      
      if (refreshData.refreshResult?.needs_reauth) {
        console.log(`⚠️  ${platform} requires re-authentication`);
      }
    }
    
    // Step 3: Get updated connections after refresh attempts
    console.log('\n📊 Step 3: Getting updated platform connections...');
    const updatedConnectionsResponse = await fetch(`${baseUrl}/api/platform-connections`, {
      credentials: 'include',
      headers: {
        'Cookie': 'connect.sid=s%3AaIoGwOCnhzQQJFRgCuwQCgDK6pCJlHVGCg%2F1m%2FP8.YUUmwFgaUmJhzQQJFRgCuwQCgDK6pCJlHVGCg%2F1m%2FP8'
      }
    });
    
    const updatedConnections = await updatedConnectionsResponse.json();
    console.log('Updated connections:', updatedConnections.length);
    
    // Check OAuth status for each platform
    console.log('\n✅ OAuth Status Check:');
    platforms.forEach(platform => {
      const connection = updatedConnections.find(c => c.platform === platform);
      if (connection) {
        console.log(`${platform}: isValid=${connection.oauthStatus?.isValid}, error=${connection.oauthStatus?.error}`);
      } else {
        console.log(`${platform}: No connection found`);
      }
    });
    
    // Step 4: Test direct publishing
    console.log('\n📝 Step 4: Testing direct publishing...');
    const publishResponse = await fetch(`${baseUrl}/api/direct-publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'connect.sid=s%3AaIoGwOCnhzQQJFRgCuwQCgDK6pCJlHVGCg%2F1m%2FP8.YUUmwFgaUmJhzQQJFRgCuwQCgDK6pCJlHVGCg%2F1m%2FP8'
      },
      credentials: 'include',
      body: JSON.stringify({
        action: 'test_publish_all',
        content: 'TheAgencyIQ Test Post - OAuth Token Refresh System Test',
        platforms: platforms,
        userId: '2'
      })
    });
    
    const publishData = await publishResponse.json();
    console.log('\n📊 Publishing Results:');
    console.log(JSON.stringify(publishData, null, 2));
    
    // Step 5: Check quota after publishing
    console.log('\n📊 Step 5: Checking quota after publishing...');
    const quotaResponse = await fetch(`${baseUrl}/api/user`, {
      credentials: 'include',
      headers: {
        'Cookie': 'connect.sid=s%3AaIoGwOCnhzQQJFRgCuwQCgDK6pCJlHVGCg%2F1m%2FP8.YUUmwFgaUmJhzQQJFRgCuwQCgDK6pCJlHVGCg%2F1m%2FP8'
      }
    });
    
    const quotaData = await quotaResponse.json();
    console.log('Quota status:', {
      remainingPosts: quotaData.remainingPosts,
      subscriptionPlan: quotaData.subscriptionPlan
    });
    
    // Summary
    console.log('\n📋 TEST SUMMARY:');
    console.log('================');
    console.log('Token Refresh Results:');
    Object.entries(refreshResults).forEach(([platform, result]) => {
      console.log(`  ${platform}: ${result.success ? '✅ Success' : '❌ Failed'} ${result.refreshResult?.needs_reauth ? '(needs re-auth)' : ''}`);
    });
    
    console.log('\nPublishing Results:');
    if (publishData.results) {
      Object.entries(publishData.results).forEach(([platform, result]) => {
        console.log(`  ${platform}: ${result.success ? '✅ Success' : '❌ Failed'} ${result.error || ''}`);
      });
    }
    
    console.log('\n🎉 OAuth reconnection and publishing test completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Run the test
testOAuthReconnectionAndPublishing().catch(console.error);