/**
 * Fix Facebook Posting with Current Tokens
 */

import crypto from 'crypto';

async function fixFacebookPostingNow() {
  const refreshToken = process.env.FACEBOOK_REFRESH_TOKEN;
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  console.log('Getting fresh Facebook page token...');
  
  try {
    // Exchange refresh token for access token
    const tokenResponse = await fetch(`https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${refreshToken}`);
    const tokenData = await tokenResponse.json();
    
    if (tokenResponse.ok && tokenData.access_token) {
      const userToken = tokenData.access_token;
      const userAppsecretProof = crypto.createHmac('sha256', appSecret).update(userToken).digest('hex');
      
      // Get pages
      const pagesResponse = await fetch(`https://graph.facebook.com/v23.0/me/accounts?access_token=${userToken}&appsecret_proof=${userAppsecretProof}`);
      const pagesData = await pagesResponse.json();
      
      if (pagesResponse.ok && pagesData.data && pagesData.data.length > 0) {
        const pageToken = pagesData.data[0].access_token;
        const pageName = pagesData.data[0].name;
        const pageAppsecretProof = crypto.createHmac('sha256', appSecret).update(pageToken).digest('hex');
        
        console.log('Got page token for:', pageName);
        
        // Update environment
        process.env.FACEBOOK_PAGE_ACCESS_TOKEN = pageToken;
        
        // Test post
        const testResponse = await fetch(`https://graph.facebook.com/v23.0/me/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Facebook posting fixed - TheAgencyIQ operational!',
            access_token: pageToken,
            appsecret_proof: pageAppsecretProof
          })
        });
        
        const testData = await testResponse.json();
        if (testResponse.ok) {
          console.log('✅ FACEBOOK POSTING FIXED!');
          console.log('Post ID:', testData.id);
          console.log('New token active in environment');
          return true;
        } else {
          console.log('❌ Test post failed:', testData.error?.message);
        }
      }
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
  
  return false;
}

fixFacebookPostingNow();