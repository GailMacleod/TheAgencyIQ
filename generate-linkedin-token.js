/**
 * LinkedIn Token Generator - Manual Method
 * Creates the authorization URL and provides token exchange instructions
 */

function generateLinkedInToken() {
  console.log('🔗 LINKEDIN ACCESS TOKEN GENERATOR');
  console.log('================================\n');
  
  // LinkedIn OAuth configuration
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = 'https://app.theagencyiq.ai/api/oauth/linkedin/callback';
  const scopes = 'r_liteprofile w_member_social';
  
  if (!clientId || !clientSecret) {
    console.log('❌ Missing LinkedIn credentials in environment');
    console.log('Need: LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET');
    return;
  }
  
  console.log('CLIENT CONFIGURATION:');
  console.log(`Client ID: ${clientId}`);
  console.log(`Redirect URI: ${redirectUri}`);
  console.log(`Required Scopes: ${scopes}\n`);
  
  // Generate authorization URL
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', 'token_generation');
  
  console.log('STEP 1: AUTHORIZATION');
  console.log('====================');
  console.log('Visit this URL to authorize the app:');
  console.log(authUrl.toString());
  console.log('');
  
  console.log('STEP 2: GET AUTHORIZATION CODE');
  console.log('===============================');
  console.log('After authorization, you\'ll be redirected to:');
  console.log(`${redirectUri}?code=AUTHORIZATION_CODE&state=token_generation`);
  console.log('Copy the AUTHORIZATION_CODE from the URL');
  console.log('');
  
  console.log('STEP 3: EXCHANGE FOR ACCESS TOKEN');
  console.log('==================================');
  console.log('Run this curl command with your authorization code:');
  console.log('');
  console.log(`curl -X POST 'https://www.linkedin.com/oauth/v2/accessToken' \\`);
  console.log(`     -H 'Content-Type: application/x-www-form-urlencoded' \\`);
  console.log(`     -d 'grant_type=authorization_code' \\`);
  console.log(`     -d 'code=YOUR_AUTHORIZATION_CODE' \\`);
  console.log(`     -d 'redirect_uri=${redirectUri}' \\`);
  console.log(`     -d 'client_id=${clientId}' \\`);
  console.log(`     -d 'client_secret=${clientSecret}'`);
  console.log('');
  
  console.log('STEP 4: ADD TO SECRETS');
  console.log('=======================');
  console.log('Copy the access_token from the response and add it to Replit Secrets as:');
  console.log('Key: LINKEDIN_ACCESS_TOKEN');
  console.log('Value: AQV... (your access token)');
  console.log('');
  
  console.log('STEP 5: TEST TOKEN');
  console.log('==================');
  console.log('Test the token works:');
  console.log('curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" https://api.linkedin.com/v2/me');
  
  return {
    authUrl: authUrl.toString(),
    clientId,
    redirectUri,
    scopes
  };
}

// Run the generator
const config = generateLinkedInToken();

// Export for server use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateLinkedInToken };
}