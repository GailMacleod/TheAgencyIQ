/**
 * Direct X OAuth 2.0 Token Exchange
 * Direct API call to exchange authorization code for access token
 */

async function directTokenExchange() {
  console.log('🔄 DIRECT X TOKEN EXCHANGE');
  console.log('=========================');
  
  const clientId = 'cW5vZXdCQjZwSmVsM24wYVpCV3Y6MTpjaQ';
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  const redirectUri = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/';
  const codeVerifier = 'yOc6KNQNWNg21ncCGX9qeozGvnpRC6to6VSHT1Nuxz8';

  // Need fresh authorization code - generate auth URL first
  console.log('📋 Step 1: Get fresh authorization code from this URL:');
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read offline.access',
    state: 'direct_exchange_' + Date.now(),
    code_challenge: await generateCodeChallenge(codeVerifier),
    code_challenge_method: 'S256'
  });

  const authUrl = `https://twitter.com/i/oauth2/authorize?${authParams}`;
  console.log(authUrl);
  console.log('\n📋 Step 2: After authorization, provide the code to complete exchange');

  return { authUrl, codeVerifier };
}

async function generateCodeChallenge(verifier) {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

async function exchangeAuthCode(authorizationCode) {
  console.log('\n🔄 EXCHANGING AUTHORIZATION CODE');
  console.log('================================');
  
  const clientId = 'cW5vZXdCQjZwSmVsM24wYVpCV3Y6MTpjaQ';
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  
  const requestBody = new URLSearchParams();
  requestBody.append('grant_type', 'authorization_code');
  requestBody.append('code', authorizationCode);
  requestBody.append('redirect_uri', 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/');
  requestBody.append('client_id', clientId);
  requestBody.append('code_verifier', 'yOc6KNQNWNg21ncCGX9qeozGvnpRC6to6VSHT1Nuxz8');

  try {
    console.log('📡 Sending POST request to token endpoint...');
    console.log('URL: https://api.twitter.com/2/oauth2/token');
    console.log('Method: POST');
    console.log('Content-Type: application/x-www-form-urlencoded');
    
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: requestBody
    });

    const result = await response.json();
    console.log('Response Status:', response.status);

    if (response.ok) {
      console.log('✅ SUCCESS! Access token obtained');
      console.log('Access Token:', result.access_token);
      console.log('Refresh Token:', result.refresh_token || 'Not provided');
      console.log('Expires in:', result.expires_in, 'seconds');
      console.log('Token Type:', result.token_type);

      // Test the access token by posting a tweet
      console.log('\n🧪 TESTING ACCESS TOKEN - POSTING TWEET...');
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'TheAgencyIQ X OAuth 2.0 integration complete! Ready for 9:00 AM JST launch 🚀'
        })
      });

      const tweetResult = await tweetResponse.json();

      if (tweetResponse.ok) {
        console.log('🎉 TWEET POSTED SUCCESSFULLY!');
        console.log('Tweet ID:', tweetResult.data.id);
        console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
        console.log('\n✅ X PLATFORM INTEGRATION COMPLETE');
        console.log('✅ READY FOR LAUNCH');
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
directTokenExchange().then(result => {
  console.log('\n🎯 USAGE:');
  console.log('1. Visit the authorization URL above');
  console.log('2. Get the authorization code from callback');
  console.log('3. Run: exchangeAuthCode("YOUR_AUTHORIZATION_CODE")');
});

// Export for manual use
global.exchangeAuthCode = exchangeAuthCode;