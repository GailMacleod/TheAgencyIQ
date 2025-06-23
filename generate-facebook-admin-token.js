/**
 * Facebook Admin Token Generator
 * Creates a proper page access token with admin permissions for posting
 */

console.log('Facebook Admin Token Generator\n');
console.log('Your Facebook page: Gail Macleod (ID: 4127481330818969)');
console.log('Current token expires: June 23, 2025\n');

const clientId = process.env.FACEBOOK_APP_ID;
const clientSecret = process.env.FACEBOOK_APP_SECRET;

if (!clientId || !clientSecret) {
  console.log('❌ Missing Facebook app credentials');
  process.exit(1);
}

console.log('📋 FACEBOOK ADMIN TOKEN SETUP INSTRUCTIONS:');
console.log('===========================================\n');

console.log('1. Go to Facebook Developers Console:');
console.log('   https://developers.facebook.com/apps/\n');

console.log('2. Select your app and go to "App Review" > "Permissions and Features"\n');

console.log('3. Request these permissions (if not already approved):');
console.log('   ✓ pages_manage_posts');
console.log('   ✓ pages_read_engagement');
console.log('   ✓ publish_to_groups (optional)\n');

console.log('4. Generate new token with admin permissions:');
const authUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${clientId}&redirect_uri=https://developers.facebook.com/tools/explorer/&scope=pages_manage_posts,pages_read_engagement,pages_show_list,manage_pages&response_type=code`;

console.log(`   Authorization URL:\n   ${authUrl}\n`);

console.log('5. After authorization, you\'ll get a code. Use it here:');
console.log('   https://developers.facebook.com/tools/explorer/\n');

console.log('6. In Graph API Explorer:');
console.log('   - Select your app');
console.log('   - Add permissions: pages_manage_posts, pages_read_engagement');
console.log('   - Click "Generate Access Token"');
console.log('   - Copy the new token to FACEBOOK_PAGE_ACCESS_TOKEN\n');

console.log('7. Test the new token:');
console.log('   - Go to Graph API Explorer');
console.log('   - Request: me/accounts');
console.log('   - Should show your "Gail Macleod" page with access_token\n');

console.log('8. Copy the page-specific token (not the user token) to your secrets\n');

console.log('🔧 CURRENT STATUS:');
console.log('- Page ID: 4127481330818969');  
console.log('- Page Name: Gail Macleod');
console.log('- Issue: Token lacks admin permissions for posting');
console.log('- Solution: Generate new token with pages_manage_posts permission');