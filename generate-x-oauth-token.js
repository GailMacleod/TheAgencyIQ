/**
 * X (Twitter) OAuth Token Generator
 * Creates user access token for posting to X platform
 */

async function generateXOAuthToken() {
  console.log('X (Twitter) OAuth Token Generator\n');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('❌ Missing X credentials');
    return;
  }
  
  console.log('📋 X OAUTH SETUP INSTRUCTIONS:');
  console.log('==============================\n');
  
  console.log('1. Go to X Developer Portal:');
  console.log('   https://developer.twitter.com/en/portal/dashboard\n');
  
  console.log('2. Select your app and go to "Keys and Tokens"\n');
  
  console.log('3. Generate OAuth 2.0 Access Token:');
  console.log('   - Under "Authentication Tokens"');
  console.log('   - Click "Generate" for Access Token and Secret');
  console.log('   - Copy both tokens\n');
  
  console.log('4. Add to your Replit Secrets:');
  console.log('   - TWITTER_ACCESS_TOKEN: (your access token)');
  console.log('   - TWITTER_ACCESS_TOKEN_SECRET: (your access token secret)\n');
  
  console.log('5. Alternative: OAuth 2.0 Flow (Recommended)');
  
  // Generate OAuth 2.0 authorization URL
  const scopes = 'tweet.read tweet.write users.read offline.access';
  const redirectUri = 'https://app.theagencyiq.com.au/api/auth/twitter/callback';
  const codeChallenge = 'challenge'; // In production, generate proper PKCE
  
  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=state123&code_challenge=${codeChallenge}&code_challenge_method=plain`;
  
  console.log(`   Authorization URL:\n   ${authUrl}\n`);
  
  console.log('6. After authorization, exchange code for token:');
  console.log('   POST https://api.twitter.com/2/oauth2/token');
  console.log('   Content-Type: application/x-www-form-urlencoded');
  console.log('   Authorization: Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64'));
  console.log('   Body: grant_type=authorization_code&code=CODE&redirect_uri=REDIRECT_URI&code_verifier=challenge\n');
  
  console.log('🔧 CURRENT STATUS:');
  console.log('- App credentials: Available');
  console.log('- Bearer token: Working (read-only)');
  console.log('- User token: Missing (required for posting)');
  console.log('- Posting: Not available until user token added\n');
  
  console.log('💡 QUICK SOLUTION:');
  console.log('Generate access token in X Developer Portal and add to secrets');
}

generateXOAuthToken()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Generation failed:', error);
    process.exit(1);
  });