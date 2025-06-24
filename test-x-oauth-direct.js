/**
 * Direct X OAuth 1.0a Test
 * Tests X posting with proper OAuth 1.0a signature generation
 */

import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

async function testXOAuthDirect() {
  console.log('🔄 Testing X OAuth 1.0a Direct Authentication...\n');

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  console.log('Credentials Check:');
  console.log(`- Client ID: ${clientId ? 'SET' : 'MISSING'}`);
  console.log(`- Client Secret: ${clientSecret ? 'SET' : 'MISSING'}`);
  console.log(`- Access Token: ${accessToken ? 'SET' : 'MISSING'}`);
  console.log(`- Access Token Secret: ${accessTokenSecret ? 'SET' : 'MISSING'}\n`);

  if (!clientId || !clientSecret || !accessToken || !accessTokenSecret) {
    console.log('❌ Missing X credentials');
    return;
  }

  try {
    // Initialize OAuth 1.0a
    const oauth = new OAuth({
      consumer: { key: clientId, secret: clientSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });

    const token = { key: accessToken, secret: accessTokenSecret };
    const requestData = { text: 'Test from TheAgencyIQ - X OAuth 1.0a working! 🚀 #DELETE' };
    const url = 'https://api.twitter.com/2/tweets';

    console.log('🔐 Generating OAuth 1.0a signature...');

    const authHeader = oauth.toHeader(oauth.authorize({
      url,
      method: 'POST'
    }, token));

    console.log('📤 Sending test post to X...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ X POSTING SUCCESSFUL!');
      console.log(`Post ID: ${result.data?.id}`);
      console.log(`Tweet: ${requestData.text}`);
      console.log('\n🎯 X platform is now OPERATIONAL for launch!');
    } else {
      console.log('❌ X posting failed:');
      console.log(`Status: ${response.status}`);
      console.log(`Error: ${result.detail || result.title || JSON.stringify(result)}`);
    }

  } catch (error) {
    console.log('❌ X OAuth error:', error.message);
  }
}

// Test Facebook posting as well
async function testFacebookDirect() {
  console.log('\n🔄 Testing Facebook Direct Posting...\n');

  const pageAccessToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!pageAccessToken || !appSecret) {
    console.log('❌ Missing Facebook credentials');
    return;
  }

  try {
    const message = 'Test from TheAgencyIQ - Facebook posting working! 🚀 #DELETE';
    const appsecret_proof = crypto.createHmac('sha256', appSecret).update(pageAccessToken).digest('hex');

    const response = await fetch('https://graph.facebook.com/v21.0/me/feed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message,
        access_token: pageAccessToken,
        appsecret_proof
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ FACEBOOK POSTING SUCCESSFUL!');
      console.log(`Post ID: ${result.id}`);
      console.log(`Message: ${message}`);
      console.log('\n🎯 Facebook platform is now OPERATIONAL for launch!');
    } else {
      console.log('❌ Facebook posting failed:');
      console.log(`Status: ${response.status}`);
      console.log(`Error: ${result.error?.message || JSON.stringify(result)}`);
    }

  } catch (error) {
    console.log('❌ Facebook error:', error.message);
  }
}

async function runTests() {
  console.log('🚀 PLATFORM AUTHENTICATION TEST - LAUNCH READINESS CHECK\n');
  console.log('Testing both X and Facebook platforms simultaneously...\n');
  
  await testXOAuthDirect();
  await testFacebookDirect();
  
  console.log('\n📊 Launch Status Summary:');
  console.log('- Check above results for platform operational status');
  console.log('- Fix any failed platforms before 9:00 AM JST launch');
}

runTests().catch(console.error);