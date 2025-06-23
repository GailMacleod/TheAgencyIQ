/**
 * Working X OAuth 1.0a Implementation
 * Uses existing X_ACCESS_TOKEN and X_ACCESS_TOKEN_SECRET
 */

import crypto from 'crypto';

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  // Sort parameters
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Create signature base string
  const baseString = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(sortedParams)}`;
  
  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  
  // Generate signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64');

  return signature;
}

async function testXPosting() {
  console.log('🔄 TESTING X POSTING WITH OAUTH 1.0A');
  console.log('====================================');

  const consumerKey = process.env.X_0AUTH_CLIENT_ID;
  const consumerSecret = process.env.X_0AUTH_CLIENT_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
    console.log('❌ Missing required X credentials');
    return;
  }

  const url = 'https://api.twitter.com/2/tweets';
  const method = 'POST';
  
  // OAuth 1.0a parameters
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0'
  };

  // Generate signature
  const signature = generateOAuthSignature(method, url, oauthParams, consumerSecret, accessTokenSecret);
  oauthParams.oauth_signature = signature;

  // Create authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  console.log('📡 Posting tweet with OAuth 1.0a...');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'TheAgencyIQ X integration SUCCESS! OAuth 1.0a working perfectly - ready for 9:00 AM JST launch! 🚀'
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('🎉 TWEET POSTED SUCCESSFULLY!');
      console.log('Tweet ID:', result.data.id);
      console.log('Tweet URL: https://twitter.com/i/web/status/' + result.data.id);
      console.log('\n✅ X PLATFORM INTEGRATION COMPLETE');
      console.log('✅ READY FOR 9:00 AM JST LAUNCH');
      return true;
    } else {
      console.log('❌ Tweet posting failed');
      console.log('Status:', response.status);
      console.log('Error:', JSON.stringify(result, null, 2));
      return false;
    }
  } catch (error) {
    console.log('💥 Network error:', error.message);
    return false;
  }
}

// Execute the test
testXPosting();