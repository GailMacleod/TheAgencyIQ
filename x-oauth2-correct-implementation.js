/**
 * X OAuth 2.0 Correct Implementation
 * Based on official X API v2 authentication mapping
 * POST /2/tweets requires OAuth 2.0 Authorization Code with PKCE
 */

import crypto from 'crypto';

async function generateCorrectXAuth() {
  console.log('🔄 GENERATING CORRECT X OAUTH 2.0 FLOW');
  console.log('======================================');
  
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  
  if (!clientId) {
    console.log('❌ Missing X_0AUTH_CLIENT_ID');
    return;
  }

  // Generate fresh PKCE parameters
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

  console.log('✅ OAuth 2.0 parameters generated');
  console.log('\n🔗 Authorization URL:');
  console.log(authUrl);
  console.log('\n📝 Save these values:');
  console.log('Code Verifier:', codeVerifier);
  console.log('State:', state);
  console.log('\n🎯 Next: Visit URL, authorize, then use the authorization code with exchangeCodeForToken()');

  // Store globally for token exchange
  global.xOAuth2Config = {
    codeVerifier,
    state,
    clientId: clientId
  };

  return {
    authUrl,
    codeVerifier,
    state
  };
}

async function exchangeCodeForToken(authCode, codeVerifier) {
  console.log('🔄 EXCHANGING AUTHORIZATION CODE FOR TOKEN');
  console.log('==========================================');

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
    console.log('Token Exchange Status:', response.status);

    if (response.ok) {
      console.log('✅ SUCCESS! OAuth 2.0 access token obtained');
      console.log('Access Token:', result.access_token.substring(0, 20) + '...');
      console.log('Token Type:', result.token_type);
      console.log('Expires in:', result.expires_in, 'seconds');
      
      // Test posting with OAuth 2.0
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'TheAgencyIQ OAuth 2.0 SUCCESS! X platform ready for 9:00 AM JST launch!'
        })
      });

      const tweetResult = await tweetResponse.json();
      
      if (tweetResponse.ok) {
        console.log('✅ TWEET POSTED SUCCESSFULLY');
        console.log('Tweet ID:', tweetResult.data.id);
        console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
        console.log('✅ X PLATFORM OAUTH 2.0 OPERATIONAL');
      } else {
        console.log('❌ Tweet posting failed:', JSON.stringify(tweetResult, null, 2));
      }
      
      console.log('\n🔧 Add to Replit Secrets:');
      console.log('X_OAUTH2_ACCESS_TOKEN =', result.access_token);
      
      return result;
    } else {
      console.log('❌ Token exchange failed:', JSON.stringify(result, null, 2));
      return null;
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
    return null;
  }
}

// Generate the authorization flow
generateCorrectXAuth();