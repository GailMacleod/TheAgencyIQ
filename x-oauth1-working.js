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
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Generate signature
  return crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64');
}

async function testXPosting() {
  console.log('🔄 TESTING X OAUTH 1.0A POSTING');
  console.log('===============================');

  const consumerKey = process.env.X_0AUTH_CLIENT_ID;
  const consumerSecret = process.env.X_0AUTH_CLIENT_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !tokenSecret) {
    console.log('❌ Missing OAuth 1.0a credentials');
    console.log('Need: X_0AUTH_CLIENT_ID, X_0AUTH_CLIENT_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET');
    return;
  }

  const tweetText = 'TheAgencyIQ X platform OAuth 1.0a SUCCESS! Ready for 9:00 AM JST launch! 🚀';
  const url = 'https://api.twitter.com/1.1/statuses/update.json';
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = crypto.randomBytes(16).toString('hex');

  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_token: accessToken,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_nonce: nonce,
    oauth_version: '1.0',
    status: tweetText
  };

  const signature = generateOAuthSignature('POST', url, oauthParams, consumerSecret, tokenSecret);
  oauthParams.oauth_signature = signature;

  // Create authorization header
  const authHeader = 'OAuth ' + Object.keys(oauthParams)
    .filter(key => key.startsWith('oauth_'))
    .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: `status=${encodeURIComponent(tweetText)}`
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ TWEET POSTED SUCCESSFULLY!');
      console.log('Tweet ID:', result.id_str);
      console.log('Tweet URL: https://twitter.com/i/web/status/' + result.id_str);
      console.log('✅ X PLATFORM OAUTH 1.0A WORKING');
      console.log('✅ READY FOR 9:00 AM JST LAUNCH');
      return true;
    } else {
      console.log('❌ Tweet posting failed:', JSON.stringify(result, null, 2));
      return false;
    }
  } catch (error) {
    console.log('💥 Network error:', error.message);
    return false;
  }
}

testXPosting();