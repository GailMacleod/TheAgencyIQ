/**
 * DEBUG: Generate Fresh OAuth URLs for All Platforms
 * Addresses expired token crisis identified in system analysis
 */

import crypto from 'crypto';

async function generateFreshOAuthUrls() {
  console.log('🔧 GENERATING FRESH OAUTH URLS FOR ALL PLATFORMS');
  console.log('=================================================');
  
  // Generate secure state parameters
  const facebookState = crypto.randomBytes(16).toString('hex') + '_facebook';
  const linkedinState = crypto.randomBytes(16).toString('hex') + '_linkedin';
  const xState = crypto.randomBytes(16).toString('hex') + '_x';
  const youtubeState = crypto.randomBytes(16).toString('hex') + '_youtube';
  
  console.log('\n🔵 FACEBOOK OAUTH URL:');
  console.log('=====================');
  const facebookUrl = `https://www.facebook.com/v21.0/dialog/oauth?` +
    `client_id=${process.env.FACEBOOK_APP_ID}&` +
    `redirect_uri=${encodeURIComponent('https://theagencyiq.replit.app/')}&` +
    `scope=pages_manage_posts,pages_read_engagement,pages_manage_metadata,pages_show_list,instagram_basic,instagram_content_publish&` +
    `response_type=code&` +
    `state=${facebookState}`;
  console.log(facebookUrl);
  
  console.log('\n🔵 LINKEDIN OAUTH URL:');
  console.log('=====================');
  const linkedinUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
    `response_type=code&` +
    `client_id=${process.env.LINKEDIN_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent('https://theagencyiq.replit.app/')}&` +
    `state=${linkedinState}&` +
    `scope=w_member_social,r_liteprofile,r_emailaddress`;
  console.log(linkedinUrl);
  
  console.log('\n🔵 X PLATFORM OAUTH URL:');
  console.log('========================');
  // Generate PKCE parameters for X OAuth 2.0
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  
  const xUrl = `https://twitter.com/i/oauth2/authorize?` +
    `response_type=code&` +
    `client_id=${process.env.X_0AUTH_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent('https://theagencyiq.replit.app/')}&` +
    `scope=tweet.read%20tweet.write%20users.read%20offline.access&` +
    `state=${xState}&` +
    `code_challenge=${codeChallenge}&` +
    `code_challenge_method=S256`;
  console.log(xUrl);
  console.log(`Code Verifier: ${codeVerifier}`);
  
  console.log('\n🔵 YOUTUBE OAUTH URL:');
  console.log('====================');
  const youtubeUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `response_type=code&` +
    `client_id=${process.env.YOUTUBE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent('https://theagencyiq.replit.app/')}&` +
    `scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube')}&` +
    `state=${youtubeState}&` +
    `access_type=offline&` +
    `prompt=consent`;
  console.log(youtubeUrl);
  
  console.log('\n📋 AUTHORIZATION INSTRUCTIONS:');
  console.log('==============================');
  console.log('1. Click each URL above to authorize the platform');
  console.log('2. Complete the OAuth flow for each platform');
  console.log('3. The system will automatically process the authorization codes');
  console.log('4. Verify connections in the dashboard after completion');
  
  console.log('\n⚠️  CRITICAL NOTES:');
  console.log('===================');
  console.log('- All current tokens have expired and need renewal');
  console.log('- Facebook token expired on June 22, 2025');
  console.log('- LinkedIn token was revoked by user');
  console.log('- X credentials need proper configuration');
  console.log('- Instagram requires Facebook Business account integration');
  
  console.log('\n🎯 EXPECTED OUTCOME:');
  console.log('====================');
  console.log('After completing all OAuth flows:');
  console.log('✅ All 5 platforms will have fresh, valid tokens');
  console.log('✅ Immediate posting will resume functionality');
  console.log('✅ Auto-posting enforcer will work correctly');
  console.log('✅ All 52 posts will be available for publishing');
  
  return {
    facebook: facebookUrl,
    linkedin: linkedinUrl,
    x: xUrl,
    youtube: youtubeUrl,
    states: { facebookState, linkedinState, xState, youtubeState },
    xCodeVerifier: codeVerifier
  };
}

// Execute the function
generateFreshOAuthUrls().catch(console.error);