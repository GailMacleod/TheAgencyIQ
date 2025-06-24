/**
 * Immediate Token Exchange - Using Fresh Code
 */

const authCode = 'aWVVT1Fwb3BCMU15TEFweUEwcEI0S3k5WW9mcVJDdHdqR2RDV21RczBJcnVjOjE3NTA2NjE0NjM1OTE6MTowOmFjOjE';
const codeVerifier = '-mCzc3210nkQ9a6y09GpKrYKqmdU9G-M_Ksjc8bCrI4';

async function immediateTokenExchange() {
  console.log('🔄 IMMEDIATE TOKEN EXCHANGE');
  console.log('===========================');
  
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code: authCode,
    redirect_uri: 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/',
    code_verifier: codeVerifier
  });

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
    console.log('✅ SUCCESS! X access token obtained');
    console.log('Access Token:', result.access_token);
    
    // Test posting immediately
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${result.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'TheAgencyIQ X platform WORKING! Integration complete for 9:00 AM JST launch! 🚀'
      })
    });

    const tweetResult = await tweetResponse.json();
    
    if (tweetResponse.ok) {
      console.log('✅ TWEET POSTED SUCCESSFULLY');
      console.log('Tweet ID:', tweetResult.data.id);
      console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
      console.log('✅ X PLATFORM READY FOR LAUNCH');
    } else {
      console.log('Tweet Error:', JSON.stringify(tweetResult, null, 2));
    }
    
    console.log('Save to Replit Secrets: X_USER_ACCESS_TOKEN =', result.access_token);
    return result;
  } else {
    console.log('❌ Failed:', JSON.stringify(result, null, 2));
    return null;
  }
}

immediateTokenExchange();