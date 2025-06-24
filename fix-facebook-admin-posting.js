/**
 * Facebook Admin Posting Fix
 * Generates proper page access token with full admin permissions
 */

async function fixFacebookAdminPosting() {
  console.log('Facebook Admin Posting Fix\n');
  
  const clientId = process.env.FACEBOOK_APP_ID;
  const clientSecret = process.env.FACEBOOK_APP_SECRET;
  const currentToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  
  if (!clientId || !clientSecret || !currentToken) {
    console.log('❌ Missing Facebook credentials');
    return;
  }
  
  console.log('🔍 CURRENT TOKEN ANALYSIS:');
  
  // Test current token permissions
  try {
    const permissionsResponse = await fetch(`https://graph.facebook.com/v20.0/me/permissions?access_token=${currentToken}`);
    const permissionsData = await permissionsResponse.json();
    
    console.log('Current permissions:', permissionsData.data?.map(p => `${p.permission}: ${p.status}`).join(', '));
    
    // Test token info
    const tokenInfoResponse = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name,category&access_token=${currentToken}`);
    const tokenInfo = await tokenInfoResponse.json();
    
    console.log(`Token represents: ${tokenInfo.name} (ID: ${tokenInfo.id})`);
    
    if (tokenInfo.category) {
      console.log(`Page category: ${tokenInfo.category}`);
    }
    
  } catch (error) {
    console.log('Token analysis failed:', error.message);
  }
  
  console.log('\n🎯 SOLUTION STEPS:\n');
  
  console.log('1. The current token has correct permissions but posting fails');
  console.log('   This indicates a scope or admin role issue\n');
  
  console.log('2. Generate new Page Access Token:');
  console.log('   https://developers.facebook.com/tools/explorer/\n');
  
  console.log('3. Steps in Graph API Explorer:');
  console.log('   a) Select your app from dropdown');
  console.log('   b) Click "Get Token" > "Get Page Access Token"');
  console.log('   c) Select "Gail Macleod" page');
  console.log('   d) Ensure these permissions are checked:');
  console.log('      ✓ pages_manage_posts');
  console.log('      ✓ pages_read_engagement');
  console.log('      ✓ pages_show_list');
  console.log('   e) Click "Generate Access Token"\n');
  
  console.log('4. Test the new token immediately:');
  console.log(`   curl -X POST "https://graph.facebook.com/v20.0/4127481330818969/feed" \\`);
  console.log(`     -d "message=Test from TheAgencyIQ" \\`);
  console.log(`     -d "access_token=NEW_TOKEN_HERE"\n`);
  
  console.log('5. If successful, update FACEBOOK_PAGE_ACCESS_TOKEN in Replit Secrets\n');
  
  console.log('💡 ALTERNATIVE APPROACH:');
  console.log('If Graph API Explorer fails, try:');
  console.log('1. Facebook Business Manager > Settings > System Users');
  console.log('2. Create system user with admin privileges');
  console.log('3. Assign Gail Macleod page to system user');
  console.log('4. Generate access token from system user\n');
  
  console.log('🚨 CRITICAL: The token must be a PAGE token, not a USER token');
  console.log('Page tokens have different permissions and can post directly');
}

fixFacebookAdminPosting()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fix failed:', error);
    process.exit(1);
  });