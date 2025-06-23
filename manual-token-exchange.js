/**
 * Manual Token Exchange Function
 * Use this to exchange your authorization code
 */

const codeVerifier = 'GjX9WJk3w8DsjHqSw1Bmuqegdr-wMxXMtt31rFyVN-c';

async function exchangeTokenManual(authCode) {
  console.log('🔄 MANUAL TOKEN EXCHANGE');
  console.log('========================');
  console.log('Auth Code:', authCode);
  
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
    console.log('Response Status:', response.status);

    if (response.ok) {
      console.log('🎉 SUCCESS! Access token obtained');
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
          text: 'TheAgencyIQ X OAuth 2.0 SUCCESS! Platform ready for 9:00 AM JST launch! 🚀'
        })
      });

      const tweetResult = await tweetResponse.json();
      
      if (tweetResponse.ok) {
        console.log('🎉 TWEET POSTED SUCCESSFULLY!');
        console.log('Tweet ID:', tweetResult.data.id);
        console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
        console.log('\n✅ X PLATFORM INTEGRATION COMPLETE - READY FOR LAUNCH');
      } else {
        console.log('❌ Tweet posting failed:', JSON.stringify(tweetResult, null, 2));
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

global.exchangeTokenManual = exchangeTokenManual;
console.log('✅ Function ready: exchangeTokenManual("YOUR_AUTH_CODE")');