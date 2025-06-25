/**
 * Facebook Token Refresh Test - Using Official Facebook API v23.0
 * Tests the complete token exchange flow per Facebook documentation
 */

async function testFacebookTokenRefresh() {
  console.log('🔄 Testing Facebook Token Refresh System...');
  
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const refreshToken = process.env.FACEBOOK_REFRESH_TOKEN;
  
  console.log(`App ID: ${appId ? 'configured' : 'missing'}`);
  console.log(`App Secret: ${appSecret ? 'configured' : 'missing'}`);
  console.log(`Refresh Token: ${refreshToken ? 'configured' : 'missing'}`);
  
  if (!appId || !appSecret || !refreshToken) {
    console.log('❌ Missing required Facebook credentials');
    return;
  }
  
  try {
    // Step 1: Exchange short-lived token for long-lived user token
    console.log('\n📱 Step 1: Exchanging for long-lived user token...');
    const longLivedUrl = `https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${refreshToken}`;
    
    const longLivedResponse = await fetch(longLivedUrl);
    const longLivedResult = await longLivedResponse.json();
    
    console.log('Long-lived token response:', longLivedResult);
    
    if (!longLivedResponse.ok) {
      console.log('❌ Long-lived token exchange failed:', longLivedResult.error);
      
      // Try with current expired token to see what happens
      console.log('\n🔍 Testing with current expired token...');
      const currentToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (currentToken) {
        const testResponse = await fetch(`https://graph.facebook.com/me?access_token=${currentToken}`);
        const testResult = await testResponse.json();
        console.log('Current token test result:', testResult);
      }
      return;
    }
    
    // Step 2: Get Page access tokens with appsecret_proof
    console.log('\n📄 Step 2: Fetching page access tokens with app secret proof...');
    
    // Generate appsecret_proof as required by Facebook
    const crypto = require('crypto');
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(longLivedResult.access_token);
    const appsecretProof = hmac.digest('hex');
    
    const pagesUrl = `https://graph.facebook.com/v23.0/me/accounts?access_token=${longLivedResult.access_token}&appsecret_proof=${appsecretProof}`;
    
    const pagesResponse = await fetch(pagesUrl);
    const pagesResult = await pagesResponse.json();
    
    console.log('Pages response:', pagesResult);
    
    if (pagesResult.data && pagesResult.data.length > 0) {
      const page = pagesResult.data[0];
      console.log(`✅ Found page: ${page.name} (ID: ${page.id})`);
      console.log(`✅ Page access token: ${page.access_token.substring(0, 20)}...`);
      
      // Step 3: Test posting with new token
      console.log('\n🧪 Step 3: Testing posting capability...');
      const testPostResponse = await fetch(`https://graph.facebook.com/v23.0/${page.id}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          message: `Token refresh test - ${new Date().toISOString()}`,
          access_token: page.access_token
        })
      });
      
      const testPostResult = await testPostResponse.json();
      console.log('Test post result:', testPostResult);
      
      if (testPostResponse.ok) {
        console.log('✅ Facebook token refresh and posting successful!');
        console.log(`New page access token: ${page.access_token}`);
        console.log(`Page name: ${page.name}`);
        console.log(`Token should be saved as FACEBOOK_PAGE_ACCESS_TOKEN`);
      } else {
        console.log('❌ Test post failed:', testPostResult.error);
      }
    } else {
      console.log('❌ No pages found for this account');
    }
    
  } catch (error) {
    console.error('💥 Token refresh test error:', error.message);
  }
}

// Run the test
testFacebookTokenRefresh().catch(console.error);