/**
 * Exchange X Authorization Code for Access Token
 */

const authCode = 'al9lM0RsZ1g4bmQxLXN2cmRUTm9vTERGV0ZxSkUzX2YtX0NlMmY4eWhqMk03OjE3NTA2NTU2MTAyNDU6MTowOmFjOjE';
const codeVerifier = 'U0QSjMqn3TU-kArzZ1NkQ8d1NHGe3_QiQdOg68EeAr0';

async function exchangeXToken() {
  console.log('🔄 EXCHANGING X AUTHORIZATION CODE');
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
    console.log('📡 Making token exchange request...');
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
      console.log('🎉 SUCCESS! X access token obtained');
      console.log('📝 Access Token:', result.access_token.substring(0, 30) + '...');
      console.log('🔄 Refresh Token:', result.refresh_token ? 'Yes' : 'No');
      console.log('⏰ Expires in:', result.expires_in, 'seconds');
      
      // Test posting capability
      console.log('\n🧪 TESTING TWEET POSTING...');
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'TheAgencyIQ X OAuth 2.0 integration successful! Ready for 9:00 AM JST launch 🚀'
        })
      });

      const tweetResult = await tweetResponse.json();
      
      if (tweetResponse.ok) {
        console.log('🎉 TWEET POSTED SUCCESSFULLY!');
        console.log('📝 Tweet ID:', tweetResult.data.id);
        console.log('🔗 Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
        console.log('\n✅ X PLATFORM INTEGRATION COMPLETE');
        console.log('✅ READY FOR LAUNCH');
        
        console.log('\n🔧 ADD TO REPLIT SECRETS:');
        console.log('X_USER_ACCESS_TOKEN =', result.access_token);
        if (result.refresh_token) {
          console.log('X_REFRESH_TOKEN =', result.refresh_token);
        }
      } else {
        console.log('❌ Tweet posting failed');
        console.log('📋 Error:', JSON.stringify(tweetResult, null, 2));
      }
      
      return result;
    } else {
      console.log('❌ Token exchange failed');
      console.log('📋 Status:', response.status);
      console.log('📋 Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

// Execute the token exchange
exchangeXToken();