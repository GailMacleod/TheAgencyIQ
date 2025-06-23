/**
 * Fixed X OAuth 2.0 Authorization URL Generator
 * Uses a working redirect URI
 */

import crypto from 'crypto';

async function generateFixedXAuth() {
  console.log('🔗 GENERATING FIXED X OAUTH 2.0 URL');
  console.log('===================================');
  
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('❌ Missing X OAuth credentials');
    return;
  }

  // Generate PKCE parameters
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = crypto.randomBytes(16).toString('hex');

  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/',
    scope: 'tweet.read tweet.write users.read offline.access',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  const authUrl = `https://twitter.com/i/oauth2/authorize?${authParams}`;

  console.log('🔑 Client ID:', clientId.substring(0, 15) + '...');
  console.log('🔗 Authorization URL:');
  console.log(authUrl);
  console.log('\n📝 Save this code verifier:');
  console.log(codeVerifier);
  
  return {
    authUrl,
    codeVerifier,
    state
  };
}

async function exchangeCodeForUserToken(authCode, codeVerifier) {
  console.log('\n🔄 EXCHANGING CODE FOR USER TOKEN');
  console.log('=================================');
  
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;

  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code: authCode,
    redirect_uri: 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/',
    code_verifier: codeVerifier
  });

  try {
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ SUCCESS! User access token obtained');
      console.log('📝 Token type:', result.token_type);
      console.log('📝 Access token (first 20 chars):', result.access_token.substring(0, 20) + '...');
      console.log('🔄 Refresh token available:', !!result.refresh_token);
      console.log('⏰ Expires in:', result.expires_in, 'seconds');
      
      // Test posting with the token
      console.log('\n🧪 TESTING TWEET POSTING...');
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'TheAgencyIQ X integration test - posting works! 🚀'
        })
      });

      const tweetResult = await tweetResponse.json();
      
      if (tweetResponse.ok) {
        console.log('🎉 TWEET POSTED SUCCESSFULLY!');
        console.log('📝 Tweet ID:', tweetResult.data.id);
        console.log('🔗 Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
        
        console.log('\n✅ X PLATFORM INTEGRATION COMPLETE');
        console.log('🔧 Add to Replit Secrets:');
        console.log('X_USER_ACCESS_TOKEN =', result.access_token);
        if (result.refresh_token) {
          console.log('X_REFRESH_TOKEN =', result.refresh_token);
        }
      } else {
        console.log('❌ Tweet posting failed:', JSON.stringify(tweetResult, null, 2));
      }
      
      return result;
    } else {
      console.log('❌ Token exchange failed');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
      console.log('📋 Status:', response.status);
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

// Generate the auth URL immediately
generateFixedXAuth().then(result => {
  if (result) {
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Visit the authorization URL above');
    console.log('2. Authorize the app');
    console.log('3. Copy the authorization code from the callback');
    console.log('4. Use exchangeCodeForUserToken() with the code and verifier');
  }
});

export { generateFixedXAuth, exchangeCodeForUserToken };