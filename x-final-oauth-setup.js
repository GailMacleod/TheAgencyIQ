/**
 * X Platform Final OAuth Setup - Generate Fresh Authorization
 */

import crypto from 'crypto';

async function generateFinalXOAuth() {
  console.log('🔄 GENERATING FINAL X OAUTH AUTHORIZATION');
  console.log('=========================================');
  
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('❌ Missing X OAuth credentials');
    return;
  }

  // Generate fresh PKCE parameters
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = 'x_final_' + crypto.randomBytes(8).toString('hex');

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

  console.log('✅ Fresh authorization parameters generated');
  console.log('Authorization URL:');
  console.log(authUrl);
  console.log('Code Verifier:', codeVerifier);
  console.log('State:', state);

  return {
    authUrl,
    codeVerifier,
    state
  };
}

async function exchangeForFinalToken(authCode, codeVerifier) {
  console.log('🔄 FINAL TOKEN EXCHANGE');
  console.log('=======================');

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
      console.log('✅ SUCCESS! X access token obtained');
      console.log('Access Token:', result.access_token);
      console.log('Expires in:', result.expires_in, 'seconds');
      
      // Test posting immediately
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'TheAgencyIQ X platform FINAL TEST - Integration complete for 9:00 AM JST launch!'
        })
      });

      const tweetResult = await tweetResponse.json();
      
      if (tweetResponse.ok) {
        console.log('✅ TWEET POSTED SUCCESSFULLY');
        console.log('Tweet ID:', tweetResult.data.id);
        console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
        console.log('✅ X PLATFORM READY FOR LAUNCH');
      } else {
        console.log('❌ Tweet posting failed:', JSON.stringify(tweetResult, null, 2));
      }
      
      console.log('🔧 Save to Replit Secrets:');
      console.log('X_USER_ACCESS_TOKEN =', result.access_token);
      
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
const authFlow = await generateFinalXOAuth();
if (authFlow) {
  global.exchangeFinalToken = (authCode) => {
    return exchangeForFinalToken(authCode, authFlow.codeVerifier);
  };
}