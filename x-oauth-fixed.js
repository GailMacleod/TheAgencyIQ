/**
 * Fixed X OAuth 2.0 Authorization URL Generator
 * Uses a working redirect URI
 */

import crypto from 'crypto';

async function generateFixedXAuth() {
  console.log('🔥 FIXED X OAUTH 2.0 AUTHORIZATION');
  console.log('=================================');

  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.log('❌ Missing X OAuth 2.0 credentials');
    return;
  }

  console.log('✅ Client ID:', clientId.substring(0, 10) + '...');
  console.log('✅ Client Secret:', clientSecret.substring(0, 10) + '...');

  // Generate PKCE parameters
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  // Use the actual Replit domain
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/',
    scope: 'tweet.read tweet.write users.read offline.access',
    state: crypto.randomBytes(16).toString('hex'),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  const authUrl = `https://twitter.com/i/oauth2/authorize?${authParams}`;

  console.log('\n🔗 CORRECTED AUTHORIZATION URL:');
  console.log(authUrl);
  console.log('\n📋 INSTRUCTIONS:');
  console.log('1. Visit the URL above in your browser');
  console.log('2. Authorize the application');
  console.log('3. Copy the "code" parameter from the URL after redirect');
  console.log('4. Provide the code for token exchange');

  console.log('\n📝 PKCE Code Verifier (save this):');
  console.log(codeVerifier);

  return {
    authUrl,
    codeVerifier
  };
}

async function exchangeCodeForUserToken(authCode, codeVerifier) {
  console.log('\n🔄 EXCHANGING CODE FOR USER ACCESS TOKEN');
  
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

    if (response.ok) {
      console.log('🎉 SUCCESS! User access token generated');
      console.log('📝 Access Token:', result.access_token.substring(0, 20) + '...');
      console.log('🔄 Refresh Token:', result.refresh_token ? result.refresh_token.substring(0, 20) + '...' : 'None');
      console.log('⏰ Expires in:', result.expires_in, 'seconds');
      
      console.log('\n🔧 ADD TO REPLIT SECRETS:');
      console.log('X_USER_ACCESS_TOKEN =', result.access_token);
      if (result.refresh_token) {
        console.log('X_REFRESH_TOKEN =', result.refresh_token);
      }
      
      return result;
    } else {
      console.log('❌ Token exchange failed');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

// Generate the fixed authorization URL
generateFixedXAuth();

export { generateFixedXAuth, exchangeCodeForUserToken };