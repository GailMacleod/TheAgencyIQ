/**
 * X OAuth 1.0a Direct Implementation
 * Uses existing credentials without portal configuration changes
 */

import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

const clientId = process.env.X_0AUTH_CLIENT_ID;
const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;

console.log('🔥 X OAUTH 1.0a DIRECT SETUP');
console.log('============================');
console.log('✅ Client ID:', clientId?.substring(0, 10) + '...');
console.log('✅ Client Secret:', clientSecret?.substring(0, 10) + '...');

// Create OAuth 1.0a instance
const oauth = OAuth({
  consumer: {
    key: clientId,
    secret: clientSecret,
  },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto
      .createHmac('sha1', key)
      .update(base_string)
      .digest('base64');
  },
});

async function getRequestToken() {
  const requestData = {
    url: 'https://api.twitter.com/oauth/request_token',
    method: 'POST',
    data: {
      oauth_callback: 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/oauth/callback'
    }
  };

  const authHeader = oauth.toHeader(oauth.authorize(requestData));

  try {
    const response = await fetch(requestData.url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader.Authorization,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(requestData.data)
    });

    const responseText = await response.text();
    console.log('\n📋 REQUEST TOKEN RESPONSE:');
    console.log('Status:', response.status);
    console.log('Response:', responseText);

    if (response.ok) {
      const params = new URLSearchParams(responseText);
      const requestToken = params.get('oauth_token');
      const requestTokenSecret = params.get('oauth_token_secret');
      
      if (requestToken) {
        const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${requestToken}`;
        
        console.log('\n🎉 SUCCESS! OAuth 1.0a Request Token Generated');
        console.log('\n🔗 AUTHORIZATION URL:');
        console.log(authUrl);
        console.log('\n📝 SAVE THESE VALUES:');
        console.log('Request Token:', requestToken);
        console.log('Request Token Secret:', requestTokenSecret);
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Visit the authorization URL above');
        console.log('2. Authorize the application');
        console.log('3. Note the oauth_verifier from the callback');
        console.log('4. Provide the verifier to complete the flow');
        
        return { requestToken, requestTokenSecret, authUrl };
      }
    }
    
    console.log('❌ Failed to get request token');
    return null;
  } catch (error) {
    console.log('💥 Error:', error.message);
    return null;
  }
}

// Generate request token and authorization URL
getRequestToken();

export { oauth, getRequestToken };