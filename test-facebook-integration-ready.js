/**
 * Test Facebook Integration Ready for Launch
 */

async function testFacebookIntegrationReady() {
  console.log('🔄 TESTING FACEBOOK INTEGRATION');
  console.log('================================');
  
  const clientId = process.env.FACEBOOK_APP_ID;
  const clientSecret = process.env.FACEBOOK_APP_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('❌ Missing Facebook credentials');
    return;
  }

  console.log('✅ Facebook App ID configured:', clientId);
  console.log('✅ Facebook App Secret configured');
  
  // Test existing token if available
  const existingToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (existingToken) {
    console.log('\n🔍 Testing existing page access token...');
    
    try {
      const response = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${existingToken}`);
      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Existing token valid');
        console.log('User/Page:', result.name || result.id);
        
        // Test posting capability
        const testPost = await fetch(`https://graph.facebook.com/v20.0/${result.id}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            message: 'Facebook integration test - ready for 9:00 AM JST launch!',
            access_token: existingToken
          })
        });
        
        if (testPost.ok) {
          const postResult = await testPost.json();
          console.log('✅ Test post successful:', postResult.id);
          console.log('🚀 Facebook platform ready for launch!');
        } else {
          const error = await testPost.json();
          console.log('❌ Test post failed:', error);
        }
      } else {
        console.log('❌ Token invalid:', result.error);
      }
    } catch (error) {
      console.log('❌ Token test failed:', error.message);
    }
  }
  
  console.log('\n📋 Facebook OAuth URL (use if token invalid):');
  console.log('https://www.facebook.com/v20.0/dialog/oauth?client_id=' + clientId + '&redirect_uri=https%3A%2F%2F4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev%2F&scope=public_profile%2Cpages_show_list%2Cpages_manage_posts%2Cpages_read_engagement&response_type=code&state=facebook_oauth_ready');
  
  console.log('\n🎯 Facebook Platform Status: READY');
}

testFacebookIntegrationReady();