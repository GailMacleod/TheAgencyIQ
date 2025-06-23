/**
 * X OAuth 2.0 Correct Implementation
 * Based on official X API v2 authentication mapping
 * POST /2/tweets requires OAuth 2.0 Authorization Code with PKCE
 */

import crypto from 'crypto';

async function generateCorrectXAuth() {
  console.log('🔥 X OAUTH 2.0 CORRECT IMPLEMENTATION');
  console.log('====================================');
  console.log('📋 Based on X API v2 authentication mapping');
  console.log('📋 POST /2/tweets requires: OAuth 2.0 Authorization Code with PKCE');
  console.log('📋 Required scopes: tweet.read, tweet.write, users.read');

  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('❌ Missing X OAuth 2.0 credentials');
    return;
  }

  console.log('✅ Client ID:', clientId.substring(0, 10) + '...');
  console.log('✅ Client Secret:', clientSecret.substring(0, 10) + '...');

  // Generate PKCE parameters (REQUIRED for X API v2 posting)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // Use EXACT scopes required by X API v2 for tweet posting
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/',
    scope: 'tweet.read tweet.write users.read offline.access',
    state: crypto.randomBytes(16).toString('hex'),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  const authUrl = `https://twitter.com/i/oauth2/authorize?${authParams}`;

  console.log('\n🔗 CORRECT X AUTHORIZATION URL:');
  console.log(authUrl);
  
  console.log('\n📋 X DEVELOPER PORTAL REQUIREMENTS:');
  console.log('==========================================');
  console.log('1. App Type: Web App');
  console.log('2. OAuth 2.0: ENABLED');
  console.log('3. App permissions: Read and Write');
  console.log('4. Callback URI: https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/');
  console.log('5. Website URL: https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/');
  
  console.log('\n📝 PKCE Code Verifier (save this):');
  console.log(codeVerifier);
  
  console.log('\n🔧 CRITICAL: Your X app MUST have OAuth 2.0 enabled and configured');
  console.log('If the URL still gives 400 error, the app is not properly configured for OAuth 2.0');

  return {
    authUrl,
    codeVerifier
  };
}

async function exchangeCodeForToken(authCode, codeVerifier) {
  console.log('\n🔄 EXCHANGING CODE FOR ACCESS TOKEN');
  console.log('===================================');
  
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
      console.log('🎉 SUCCESS! X user access token generated');
      console.log('📝 Access Token:', result.access_token.substring(0, 20) + '...');
      console.log('🔄 Refresh Token:', result.refresh_token ? result.refresh_token.substring(0, 20) + '...' : 'None');
      console.log('⏰ Expires in:', result.expires_in, 'seconds');
      
      console.log('\n🔧 ADD TO REPLIT SECRETS:');
      console.log('X_USER_ACCESS_TOKEN =', result.access_token);
      if (result.refresh_token) {
        console.log('X_REFRESH_TOKEN =', result.refresh_token);
      }
      
      // Test posting capability
      console.log('\n🧪 TESTING TWEET POSTING...');
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Test tweet from TheAgencyIQ - X integration successful! 🚀'
        })
      });

      const tweetResult = await tweetResponse.json();
      
      if (tweetResponse.ok) {
        console.log('🎉 TWEET POSTED SUCCESSFULLY!');
        console.log('📝 Tweet ID:', tweetResult.data.id);
        console.log('🔗 Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
        console.log('\n✅ X PLATFORM INTEGRATION COMPLETE');
      } else {
        console.log('❌ Tweet posting failed:', JSON.stringify(tweetResult, null, 2));
      }
      
      return result;
    } else {
      console.log('❌ Token exchange failed');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

// Generate the authorization URL
generateCorrectXAuth();

export { generateCorrectXAuth, exchangeCodeForToken };