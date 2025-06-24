/**
 * Platform Token Generation and Testing
 * Generates proper tokens for X OAuth 2.0 and Facebook Page posting
 */

import crypto from 'crypto';

async function generateXOAuth2Token() {
  console.log('🔄 X OAuth 2.0 User Context Token Generation\n');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('❌ Missing X app credentials');
    return;
  }

  console.log('📋 X OAuth 2.0 Setup Instructions:');
  console.log('1. Go to https://developer.twitter.com/en/portal/dashboard');
  console.log('2. Select your app');
  console.log('3. Go to "Keys and tokens" tab');
  console.log('4. Under "Authentication Tokens" section');
  console.log('5. Click "Generate" for Access Token and Secret');
  console.log('6. Make sure "Read and Write" permissions are enabled');
  console.log('7. Copy the new Access Token (starts with your user ID)');
  console.log('8. Add it to Replit Secrets as X_ACCESS_TOKEN\n');

  // Test current token format
  const currentToken = process.env.X_ACCESS_TOKEN;
  if (currentToken) {
    console.log(`Current token format: ${currentToken.substring(0, 10)}...`);
    if (currentToken.includes('-')) {
      console.log('✅ Token appears to be User Context format');
    } else {
      console.log('❌ Token appears to be App-only format - needs regeneration');
    }
  }
}

async function generateFacebookPageToken() {
  console.log('\n🔄 Facebook Page Access Token Generation\n');
  
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  if (!appId || !appSecret) {
    console.log('❌ Missing Facebook app credentials');
    return;
  }

  console.log('📋 Facebook Page Token Setup Instructions:');
  console.log('1. Go to https://developers.facebook.com/tools/explorer/');
  console.log('2. Select your app from dropdown');
  console.log('3. Click "Get Token" → "Get Page Access Token"');
  console.log('4. Select your page');
  console.log('5. Grant these permissions:');
  console.log('   - pages_manage_posts');
  console.log('   - pages_read_engagement');
  console.log('   - publish_to_groups (if posting to groups)');
  console.log('6. Click "Generate Access Token"');
  console.log('7. Copy the token and add to Replit Secrets as FACEBOOK_PAGE_ACCESS_TOKEN\n');

  // Generate app access token for validation
  try {
    const response = await fetch(`https://graph.facebook.com/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`);
    const result = await response.json();
    
    if (result.access_token) {
      console.log('✅ App Access Token generated for validation');
      
      // Test current page token
      const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
      if (pageToken) {
        const tokenInfo = await fetch(`https://graph.facebook.com/me?access_token=${pageToken}`);
        const info = await tokenInfo.json();
        
        if (info.error) {
          console.log('❌ Current page token invalid:', info.error.message);
        } else {
          console.log(`✅ Current page token valid for: ${info.name}`);
        }
      }
    }
  } catch (error) {
    console.log('❌ Facebook validation error:', error.message);
  }
}

async function testPlatformPosting() {
  console.log('\n🔄 Testing Platform Posting with Current Tokens\n');

  // Test X posting
  console.log('Testing X...');
  const xToken = process.env.X_ACCESS_TOKEN;
  if (xToken && xToken.includes('-')) {
    try {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${xToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ text: 'Test from TheAgencyIQ - X working! DELETE THIS' })
      });

      const result = await response.json();
      if (response.ok) {
        console.log('✅ X posting successful!');
      } else {
        console.log('❌ X posting failed:', result.detail || result.title);
      }
    } catch (error) {
      console.log('❌ X error:', error.message);
    }
  } else {
    console.log('❌ X token not in User Context format');
  }

  // Test Facebook posting
  console.log('\nTesting Facebook...');
  const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const fbSecret = process.env.FACEBOOK_APP_SECRET;
  
  if (fbToken && fbSecret) {
    try {
      const appsecret_proof = crypto.createHmac('sha256', fbSecret).update(fbToken).digest('hex');
      
      const response = await fetch('https://graph.facebook.com/v21.0/me/feed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test from TheAgencyIQ - Facebook working! DELETE THIS',
          access_token: fbToken,
          appsecret_proof
        })
      });

      const result = await response.json();
      if (response.ok) {
        console.log('✅ Facebook posting successful!');
      } else {
        console.log('❌ Facebook posting failed:', result.error?.message);
      }
    } catch (error) {
      console.log('❌ Facebook error:', error.message);
    }
  } else {
    console.log('❌ Facebook credentials missing');
  }
}

async function main() {
  console.log('🚀 PLATFORM TOKEN FIX - LAUNCH PREPARATION\n');
  
  await generateXOAuth2Token();
  await generateFacebookPageToken();
  await testPlatformPosting();
  
  console.log('\n📊 Next Steps:');
  console.log('1. Follow the token generation instructions above');
  console.log('2. Update your Replit Secrets with new tokens');
  console.log('3. Run this script again to verify');
  console.log('4. Test posting through the main app');
}

main().catch(console.error);