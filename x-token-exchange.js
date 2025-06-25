/**
 * X Token Exchange - Final Step
 */

async function exchangeXToken(authCode) {
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const codeVerifier = 'IeRS1wKj2U0IG3bm92i8v1W5hF-ThLs3';
  
  console.log('Exchanging X authorization code for access token...');
  
  try {
    const response = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/x',
        code_verifier: codeVerifier
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('X OAuth SUCCESS!');
      console.log('===============');
      console.log(`Access Token: ${result.access_token}`);
      if (result.refresh_token) {
        console.log(`Refresh Token: ${result.refresh_token}`);
      }
      console.log('');
      console.log('UPDATE REPLIT SECRETS:');
      console.log(`X_ACCESS_TOKEN=${result.access_token}`);
      if (result.refresh_token) {
        console.log(`X_REFRESH_TOKEN=${result.refresh_token}`);
      }
      
      // Test posting
      const testResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: `X integration complete - TheAgencyIQ operational! ${new Date().toISOString()}`
        })
      });
      
      if (testResponse.ok) {
        const post = await testResponse.json();
        console.log(`Test post successful: ${post.data.id}`);
        console.log('X PLATFORM FULLY OPERATIONAL');
      }
      
    } else {
      console.log('Token exchange failed:', result);
    }
    
  } catch (error) {
    console.log('Exchange error:', error.message);
  }
}

const authCode = process.argv[2];
if (!authCode) {
  console.log('Usage: node x-token-exchange.js YOUR_AUTH_CODE');
} else {
  exchangeXToken(authCode);
}