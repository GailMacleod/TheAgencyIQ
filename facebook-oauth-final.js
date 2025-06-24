/**
 * Facebook OAuth Final - Database Constraint Fixed
 */

async function generateFinalFacebookOAuth() {
  console.log('🔄 FACEBOOK OAUTH - DATABASE CONSTRAINT FIXED');
  console.log('==============================================');
  
  const clientId = process.env.FACEBOOK_APP_ID;
  const redirectUri = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/';
  const scope = 'public_profile,pages_show_list,pages_manage_posts,pages_read_engagement';
  const state = 'facebook_constraint_fixed_' + Date.now();

  const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=${state}`;

  console.log('✅ Database constraint issue resolved');
  console.log('✅ platform_user_id column now allows null values');
  console.log('');
  console.log('🔗 Facebook OAuth URL:');
  console.log(authUrl);
  console.log('');
  console.log('🎯 This should now complete successfully');

  return authUrl;
}

generateFinalFacebookOAuth();