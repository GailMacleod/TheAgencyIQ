/**
 * Fix Facebook Page Connection in UI
 */

import crypto from 'crypto';

async function fixFacebookPageConnection() {
  const refreshToken = process.env.FACEBOOK_REFRESH_TOKEN;
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  try {
    // Get fresh user token
    const tokenResponse = await fetch(`https://graph.facebook.com/v23.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${refreshToken}`);
    const tokenData = await tokenResponse.json();
    
    if (tokenResponse.ok && tokenData.access_token) {
      const userToken = tokenData.access_token;
      const userProof = crypto.createHmac('sha256', appSecret).update(userToken).digest('hex');
      
      // Get user's pages
      const pagesResponse = await fetch(`https://graph.facebook.com/v23.0/me/accounts?access_token=${userToken}&appsecret_proof=${userProof}`);
      const pagesData = await pagesResponse.json();
      
      console.log('Facebook account analysis:');
      console.log('User token valid:', !!userToken);
      console.log('Pages found:', pagesData.data ? pagesData.data.length : 0);
      
      if (pagesData.data && pagesData.data.length > 0) {
        console.log('\nAvailable Facebook pages:');
        pagesData.data.forEach((page, index) => {
          console.log(`${index + 1}. ${page.name} (ID: ${page.id})`);
          console.log(`   Access Token: ${page.access_token ? 'Available' : 'Missing'}`);
        });
        
        // Use first page for connection
        const page = pagesData.data[0];
        const pageToken = page.access_token;
        const pageId = page.id;
        
        // Update environment with page details
        process.env.FACEBOOK_PAGE_ACCESS_TOKEN = pageToken;
        process.env.FACEBOOK_PAGE_ID = pageId;
        
        console.log(`\nConnected to Facebook page: ${page.name}`);
        console.log(`Page ID set to: ${pageId}`);
        console.log(`Page token updated in environment`);
        
        // Test page posting
        const pageProof = crypto.createHmac('sha256', appSecret).update(pageToken).digest('hex');
        const testResponse = await fetch(`https://graph.facebook.com/v23.0/${pageId}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: 'Facebook page connection test - TheAgencyIQ operational',
            access_token: pageToken,
            appsecret_proof: pageProof
          })
        });
        
        const testResult = await testResponse.json();
        
        if (testResponse.ok) {
          console.log('\nSUCCESS: Facebook page posting works');
          console.log('Test post ID:', testResult.id);
          return { 
            success: true, 
            pageId, 
            pageName: page.name, 
            postId: testResult.id 
          };
        } else {
          console.log('\nPage posting test failed:', testResult.error?.message);
        }
      } else {
        console.log('\nNo Facebook pages found for this user');
        console.log('This account needs page admin access or user_posts permission');
        return { 
          success: false, 
          issue: 'No pages available',
          solution: 'Need page admin access or user_posts permission'
        };
      }
    }
  } catch (error) {
    console.log('Error:', error.message);
  }
  
  return { success: false };
}

fixFacebookPageConnection();