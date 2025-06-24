/**
 * Manual Token Exchange Function
 * Use this to exchange your authorization code
 */

async function exchangeTokenManual(authCode) {
  console.log('🔄 MANUAL TOKEN EXCHANGE');
  console.log('========================');
  console.log('Authorization Code:', authCode);
  
  // Using the ORIGINAL code verifier from the first flow
  const codeVerifier = 'AAvolsGDep85RgnyVCott9gmGbgc8C-EDheL9mqb38s';
  
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
    console.log('✅ SUCCESS! Access token obtained');
    console.log('Access Token:', result.access_token);
    
    // Test posting
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${result.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'TheAgencyIQ X platform SUCCESS! Ready for 9:00 AM JST launch!'
      })
    });

    const tweetResult = await tweetResponse.json();
    
    if (tweetResponse.ok) {
      console.log('✅ TWEET POSTED');
      console.log('Tweet ID:', tweetResult.data.id);
      console.log('✅ X PLATFORM OPERATIONAL');
    } else {
      console.log('Tweet Error:', JSON.stringify(tweetResult, null, 2));
    }
    
    return result;
  } else {
    console.log('❌ Failed:', JSON.stringify(result, null, 2));
    return null;
  }
}

// Exchange the authorization code
exchangeTokenManual('aWVVT1Fwb3BCMU15TEFweUEwcEI0S3k5WW9mcVJDdHdqR2RDV21RczBJcnVjOjE3NTA2NjE0NjM1OTE6MTowOmFjOjE');