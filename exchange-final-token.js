/**
 * Final X Token Exchange - Using the Authorization Code
 */

const authCode = 'SVBhcS1HUmgyNzA4UVBBVE96eW5vTGs4TVpUSVhIeTVBR3o3cFpGVVJtcENhOjE3NTA2NTYxNzU0NjM6MToxOmFjOjE';

async function exchangeFinalToken() {
  console.log('🔄 FINAL X TOKEN EXCHANGE');
  console.log('========================');
  
  const clientId = 'cW5vZXdCQjZwSmVsM24wYVpCV3Y6MTpjaQ';
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  
  const requestBody = new URLSearchParams();
  requestBody.append('grant_type', 'authorization_code');
  requestBody.append('code', authCode);
  requestBody.append('redirect_uri', 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/');
  requestBody.append('client_id', clientId);
  requestBody.append('code_verifier', 'yOc6KNQNWNg21ncCGX9qeozGvnpRC6to6VSHT1Nuxz8');

  console.log('📡 POST request to: https://api.twitter.com/2/oauth2/token');
  console.log('Content-Type: application/x-www-form-urlencoded');
  console.log('Authorization: Basic [encoded credentials]');

  try {
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
      console.log('🎉 SUCCESS! Access token obtained');
      console.log('Access Token:', result.access_token);
      console.log('Refresh Token:', result.refresh_token || 'Not provided');
      console.log('Expires in:', result.expires_in, 'seconds');
      console.log('Token Type:', result.token_type);

      // Test posting a tweet immediately
      console.log('\n🧪 TESTING TWEET POSTING...');
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'TheAgencyIQ X OAuth 2.0 integration SUCCESS! Ready for 9:00 AM JST launch! 🚀'
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
        console.log('❌ Tweet posting failed');
        console.log('Tweet Error:', JSON.stringify(tweetResult, null, 2));
      }

      console.log('\n🔧 SAVE THESE TOKENS TO REPLIT SECRETS:');
      console.log('X_USER_ACCESS_TOKEN =', result.access_token);
      if (result.refresh_token) {
        console.log('X_REFRESH_TOKEN =', result.refresh_token);
      }

      return result;
    } else {
      console.log('❌ Token exchange failed');
      console.log('Error Response:', JSON.stringify(result, null, 2));
      return null;
    }
  } catch (error) {
    console.log('💥 Network error:', error.message);
    return null;
  }
}

// Execute the token exchange
exchangeFinalToken();