/**
 * Complete X OAuth 2.0 Flow - Exchange Code for Access Token
 */

async function completeXOAuthFlow() {
  console.log('🔄 COMPLETING X OAUTH 2.0 FLOW');
  console.log('===============================');
  
  const clientId = 'cW5vZXdCQjZwSmVsM24wYVpCV3Y6MTpjaQ';
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  const redirectUri = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/';
  const codeVerifier = 'yOc6KNQNWNg21ncCGX9qeozGvnpRC6to6VSHT1Nuxz8';

  console.log('📋 Using parameters:');
  console.log('Client ID:', clientId);
  console.log('Redirect URI:', redirectUri);
  console.log('Code Verifier:', codeVerifier);

  // Step 1: Generate fresh authorization URL
  console.log('\n🔗 STEP 1: Generate Authorization URL');
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: 'x_oauth_state_' + Date.now(),
    code_challenge: await generateCodeChallenge(codeVerifier),
    code_challenge_method: 'S256'
  });

  const authUrl = `https://twitter.com/i/oauth2/authorize?${authParams}`;
  console.log('Authorization URL:', authUrl);

  console.log('\n📋 STEP 2: Exchange Authorization Code');
  console.log('After authorization, use this function with the code:');
  console.log('exchangeCodeForAccessToken(authorizationCode)');

  return { authUrl, codeVerifier };
}

async function generateCodeChallenge(verifier) {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

async function exchangeCodeForAccessToken(authorizationCode) {
  console.log('\n🔄 EXCHANGING CODE FOR ACCESS TOKEN');
  console.log('===================================');
  
  const clientId = 'cW5vZXdCQjZwSmVsM24wYVpCV3Y6MTpjaQ';
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  const redirectUri = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/';
  const codeVerifier = 'yOc6KNQNWNg21ncCGX9qeozGvnpRC6to6VSHT1Nuxz8';

  const tokenData = {
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier
  };

  const formData = new URLSearchParams(tokenData);

  try {
    console.log('📡 Making token exchange request...');
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData
    });

    const result = await response.json();
    console.log('Response status:', response.status);

    if (response.ok) {
      console.log('🎉 SUCCESS! Access token obtained');
      console.log('Access Token (first 30 chars):', result.access_token.substring(0, 30) + '...');
      console.log('Token Type:', result.token_type);
      console.log('Expires in:', result.expires_in, 'seconds');
      console.log('Refresh Token available:', !!result.refresh_token);

      // Test the access token by posting a tweet
      console.log('\n🧪 TESTING ACCESS TOKEN...');
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'TheAgencyIQ X OAuth 2.0 integration complete! Ready for launch 🚀'
        })
      });

      const tweetResult = await tweetResponse.json();

      if (tweetResponse.ok) {
        console.log('🎉 TWEET POSTED SUCCESSFULLY!');
        console.log('Tweet ID:', tweetResult.data.id);
        console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
        console.log('\n✅ X PLATFORM INTEGRATION COMPLETE');
      } else {
        console.log('❌ Tweet posting failed');
        console.log('Error:', JSON.stringify(tweetResult, null, 2));
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
      return null;
    }
  } catch (error) {
    console.log('💥 Network error:', error.message);
    return null;
  }
}

// Generate authorization URL
completeXOAuthFlow().then(result => {
  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Visit the authorization URL above');
  console.log('2. Complete authorization');
  console.log('3. Get the authorization code from callback');
  console.log('4. Call exchangeCodeForAccessToken(code) with the code');
});

// Export for use
global.exchangeCodeForAccessToken = exchangeCodeForAccessToken;