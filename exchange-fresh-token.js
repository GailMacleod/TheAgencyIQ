/**
 * Exchange Fresh Authorization Code for Access Token
 */

const authCode = 'aWVVT1Fwb3BCMU15TEFweUEwcEI0S3k5WW9mcVJDdHdqR2RDV21RczBJcnVjOjE3NTA2NjE0NjM1OTE6MTowOmFjOjE';
const codeVerifier = 'AAvolsGDep85RgnyVCott9gmGbgc8C-EDheL9mqb38s';

async function exchangeFreshToken() {
  console.log('🔄 EXCHANGING FRESH AUTHORIZATION CODE');
  console.log('====================================');
  console.log('Authorization Code:', authCode);
  console.log('Code Verifier:', codeVerifier);
  
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  
  const tokenParams = new URLSearchParams();
  tokenParams.append('grant_type', 'authorization_code');
  tokenParams.append('client_id', clientId);
  tokenParams.append('code', authCode);
  tokenParams.append('redirect_uri', 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/');
  tokenParams.append('code_verifier', codeVerifier);

  try {
    console.log('📡 Sending token exchange request...');
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams
    });

    const result = await response.json();
    console.log('Response Status:', response.status);

    if (response.ok) {
      console.log('🎉 SUCCESS! X OAuth 2.0 token obtained');
      console.log('Access Token:', result.access_token);
      console.log('Token Type:', result.token_type);
      console.log('Expires in:', result.expires_in, 'seconds');
      
      if (result.refresh_token) {
        console.log('Refresh Token:', result.refresh_token);
      }

      // Test the access token immediately
      console.log('\n🧪 Testing X posting with fresh token...');
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'TheAgencyIQ X OAuth 2.0 BREAKTHROUGH! Fresh credentials working perfectly - ready for 9:00 AM JST launch! 🚀'
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
      return null;
    }
  } catch (error) {
    console.log('💥 Network error:', error.message);
    return null;
  }
}

exchangeFreshToken();