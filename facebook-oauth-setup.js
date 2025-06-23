/**
 * Facebook OAuth Setup with Correct Redirect URL
 */

async function generateFacebookAuthUrl() {
  console.log('🔄 GENERATING FACEBOOK OAUTH URL');
  console.log('================================');
  
  const clientId = process.env.FACEBOOK_APP_ID;
  const redirectUri = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/';
  
  if (!clientId) {
    console.log('❌ Missing FACEBOOK_APP_ID');
    return;
  }

  // Required permissions for posting to Facebook
  const scope = 'public_profile,pages_show_list,pages_manage_posts,pages_read_engagement,publish_to_groups';
  const state = 'facebook_oauth_' + Date.now();

  const authParams = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scope,
    response_type: 'code',
    state: state
  });

  const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?${authParams}`;

  console.log('✅ Facebook OAuth URL generated');
  console.log('');
  console.log('🔗 Authorization URL:');
  console.log(authUrl);
  console.log('');
  console.log('📝 Configuration:');
  console.log('Client ID:', clientId);
  console.log('Redirect URI:', redirectUri);
  console.log('Scope:', scope);
  console.log('State:', state);
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. Visit the authorization URL above');
  console.log('2. Grant permissions to your Facebook app');
  console.log('3. You will be redirected back with an authorization code');
  console.log('4. Use the code to complete token exchange');

  return {
    authUrl,
    redirectUri,
    scope,
    state
  };
}

generateFacebookAuthUrl();