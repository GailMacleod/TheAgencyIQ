/**
 * X OAuth 2.0 Final Setup - Complete Integration
 */

import crypto from 'crypto';

async function generateFinalXAuth() {
  console.log('🔥 X OAUTH 2.0 FINAL SETUP');
  console.log('==========================');
  
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('❌ Missing X OAuth credentials');
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

  console.log('✅ Fresh authorization URL generated');
  console.log('🔗 Authorization URL:');
  console.log(authUrl);
  console.log('\n📝 Code Verifier (save this):');
  console.log(codeVerifier);
  console.log('\n📝 State:');
  console.log(state);

  return {
    authUrl,
    codeVerifier,
    state,
    clientId,
    clientSecret
  };
}

async function exchangeForAccessToken(authCode, codeVerifier, clientId, clientSecret) {
  console.log('\n🔄 EXCHANGING FOR ACCESS TOKEN');
  console.log('==============================');

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
      console.log('🎉 SUCCESS! Access token obtained');
      console.log('Access Token:', result.access_token.substring(0, 30) + '...');
      console.log('Expires in:', result.expires_in, 'seconds');
      
      // Test tweet posting
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'TheAgencyIQ X integration complete! Platform ready for launch 🚀'
        })
      });

      const tweetResult = await tweetResponse.json();
      
      if (tweetResponse.ok) {
        console.log('🎉 TWEET POSTED SUCCESSFULLY!');
        console.log('Tweet ID:', tweetResult.data.id);
        console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
        console.log('\n✅ X PLATFORM INTEGRATION COMPLETE');
      } else {
        console.log('❌ Tweet posting failed:', JSON.stringify(tweetResult, null, 2));
      }
      
      console.log('\n🔧 ADD TO REPLIT SECRETS:');
      console.log('X_USER_ACCESS_TOKEN =', result.access_token);
      if (result.refresh_token) {
        console.log('X_REFRESH_TOKEN =', result.refresh_token);
      }
      
      return result;
    } else {
      console.log('❌ Token exchange failed');
      console.log('Error:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

// Generate fresh auth setup
generateFinalXAuth().then(result => {
  if (result) {
    console.log('\n🎯 INSTRUCTIONS:');
    console.log('1. Visit the authorization URL above');
    console.log('2. Complete authorization');
    console.log('3. Get the authorization code from callback');
    console.log('4. Run the exchange function with the code');
    
    // Store parameters globally for manual exchange
    global.xAuthParams = result;
    global.exchangeXToken = (authCode) => {
      return exchangeForAccessToken(authCode, result.codeVerifier, result.clientId, result.clientSecret);
    };
  }
});

export { generateFinalXAuth, exchangeForAccessToken };