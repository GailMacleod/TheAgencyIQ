/**
 * Facebook OAuth Fresh - New Authorization Code
 */

async function generateFreshFacebookOAuth() {
  console.log('🔄 GENERATING FRESH FACEBOOK OAUTH URL');
  console.log('=====================================');
  
  const clientId = process.env.FACEBOOK_APP_ID;
  const redirectUri = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/';
  const scope = 'public_profile,pages_show_list,pages_manage_posts,pages_read_engagement';
  const state = 'facebook_fresh_' + Date.now();

  const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;

  console.log('✅ Fresh Facebook OAuth URL generated');
  console.log('');
  console.log('🔗 New Authorization URL:');
  console.log(authUrl);
  console.log('');
  console.log('📝 What to do:');
  console.log('1. Visit the URL above');
  console.log('2. Click "Continue" to authorize TheAgencyIQ');
  console.log('3. Grant permissions for page management and posting');
  console.log('4. You will be redirected back automatically');
  console.log('5. The system will complete the integration');

  return authUrl;
}

generateFreshFacebookOAuth();