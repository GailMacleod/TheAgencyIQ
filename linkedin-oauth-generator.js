/**
 * LinkedIn OAuth Token Generator for TheAgencyIQ
 * Uses your app configuration: Client ID 86pwc38hsqem
 */

const CLIENT_ID = '86pwc38hsqem';
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET; // From your Replit secrets
const REDIRECT_URI = 'https://app.theagencyiq.ai/api/oauth/linkedin/callback';

console.log('🔗 LinkedIn OAuth Token Generator for TheAgencyIQ');
console.log('=====================================');

// Step 1: Generate authorization URL
const scopes = [
  'r_liteprofile',
  'r_emailaddress', 
  'w_member_social',
  'w_organization_social',
  'rw_organization_admin'
].join('%20');

const state = Math.random().toString(36).substring(2, 15);
const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${scopes}&state=${state}`;

console.log('\n🔁 STEP 1: Visit this URL to authorize TheAgencyIQ:');
console.log('================================================');
console.log(authUrl);
console.log('\n📋 Copy and paste this URL into your browser');
console.log('📋 After authorization, you\'ll be redirected with a code parameter');

// Step 2: Function to exchange code for token
async function exchangeCodeForToken(authCode) {
  if (!CLIENT_SECRET) {
    console.log('❌ LINKEDIN_CLIENT_SECRET not found in environment variables');
    console.log('📝 Add your LinkedIn Client Secret to Replit Secrets');
    return;
  }

  console.log('\n🔁 STEP 2: Exchanging authorization code for access token...');
  
  try {
    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authCode,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET
      })
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SUCCESS! LinkedIn access token generated:');
      console.log('============================================');
      console.log(`Access Token: ${result.access_token}`);
      console.log(`Expires in: ${result.expires_in} seconds (${Math.floor(result.expires_in / 86400)} days)`);
      console.log('\n📝 Add this to your Replit Secrets as:');
      console.log(`LINKEDIN_USER_ACCESS_TOKEN=${result.access_token}`);
      
      // Test the token
      console.log('\n🧪 Testing the token...');
      const testResponse = await fetch('https://api.linkedin.com/v2/me', {
        headers: {
          'Authorization': `Bearer ${result.access_token}`
        }
      });
      
      if (testResponse.ok) {
        const profile = await testResponse.json();
        console.log(`✅ Token valid! Authenticated as: ${profile.firstName?.localized?.en_US || 'User'} ${profile.lastName?.localized?.en_US || ''}`);
      } else {
        console.log('⚠️ Token generated but validation failed');
      }
      
    } else {
      console.log('❌ Token exchange failed:', result);
    }
  } catch (error) {
    console.log('❌ Error during token exchange:', error.message);
  }
}

// Check if code was provided as argument
const authCode = process.argv[2];
if (authCode) {
  exchangeCodeForToken(authCode);
} else {
  console.log('\n💡 After authorization, run:');
  console.log(`node linkedin-oauth-generator.js YOUR_AUTH_CODE`);
}

console.log('\n📖 Your authorized redirect URLs from LinkedIn app settings:');
console.log('• https://app.theagencyiq.ai/api/oauth/linkedin/callback');
console.log('• https://www.linkedin.com/developers/tools/oauth/redirect');