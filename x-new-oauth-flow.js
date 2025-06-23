/**
 * X OAuth 2.0 Flow with New Credentials
 */

import crypto from 'crypto';

async function generateNewXAuthFlow() {
  console.log('🔄 GENERATING NEW X OAUTH 2.0 FLOW');
  console.log('==================================');
  
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  
  console.log('Client ID:', clientId ? 'Present' : 'Missing');
  console.log('Client Secret:', clientSecret ? 'Present' : 'Missing');
  
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

  console.log('✅ New authorization URL generated');
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

async function exchangeTokenWithNewCredentials(authCode, codeVerifier) {
  console.log('\n🔄 TOKEN EXCHANGE WITH NEW CREDENTIALS');
  console.log('=====================================');

  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;

  const tokenParams = new URLSearchParams();
  tokenParams.append('grant_type', 'authorization_code');
  tokenParams.append('client_id', clientId);
  tokenParams.append('code', authCode);
  tokenParams.append('redirect_uri', 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/');
  tokenParams.append('code_verifier', codeVerifier);

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
      console.log('🎉 SUCCESS! Access token obtained with new credentials');
      console.log('Access Token:', result.access_token);
      console.log('Expires in:', result.expires_in, 'seconds');
      
      // Test tweet posting
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'TheAgencyIQ X integration SUCCESS with new credentials! Ready for launch! 🚀'
        })
      });

      const tweetResult = await tweetResponse.json();
      
      if (tweetResponse.ok) {
        console.log('🎉 TWEET POSTED SUCCESSFULLY!');
        console.log('Tweet ID:', tweetResult.data.id);
        console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
        console.log('\n✅ X PLATFORM INTEGRATION COMPLETE');
        console.log('✅ READY FOR 9:00 AM JST LAUNCH');
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

// Generate the new authorization flow
generateNewXAuthFlow().then(result => {
  if (result) {
    console.log('\n🎯 NEXT STEPS:');
    console.log('1. Visit the authorization URL above');
    console.log('2. Complete authorization with X');
    console.log('3. Provide the authorization code');
    console.log('4. Complete token exchange');
    
    global.exchangeNewToken = (authCode) => {
      return exchangeTokenWithNewCredentials(authCode, result.codeVerifier);
    };
  }
});

export { generateNewXAuthFlow, exchangeTokenWithNewCredentials };