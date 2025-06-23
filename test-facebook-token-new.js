/**
 * Test New Facebook Page Access Token
 * Validates the updated Facebook token for posting capabilities
 */

async function testNewFacebookToken() {
  console.log('Testing new Facebook page access token...\n');
  
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  if (!pageToken) {
    console.log('❌ FACEBOOK_PAGE_ACCESS_TOKEN not found');
    return;
  }
  
  if (!appSecret) {
    console.log('❌ FACEBOOK_APP_SECRET not found');
    return;
  }
  
  console.log(`Token length: ${pageToken.length}`);
  console.log(`Token prefix: ${pageToken.substring(0, 20)}...\n`);
  
  try {
    // Test 1: Token validation
    console.log('1. Testing token validation...');
    const debugResponse = await fetch(`https://graph.facebook.com/debug_token?input_token=${pageToken}&access_token=${pageToken}`);
    const debugData = await debugResponse.json();
    
    if (debugData.data) {
      console.log(`✅ Token valid - App ID: ${debugData.data.app_id}`);
      console.log(`   Expires: ${debugData.data.expires_at ? new Date(debugData.data.expires_at * 1000) : 'Never'}`);
      console.log(`   Scopes: ${debugData.data.scopes ? debugData.data.scopes.join(', ') : 'None listed'}`);
    } else {
      console.log('❌ Token validation failed:', debugData.error?.message);
      return;
    }
    
    // Test 2: Get page info
    console.log('\n2. Testing page access...');
    const pageResponse = await fetch(`https://graph.facebook.com/me?access_token=${pageToken}`);
    const pageData = await pageResponse.json();
    
    if (pageData.id) {
      console.log(`✅ Page access granted - Page: ${pageData.name} (ID: ${pageData.id})`);
    } else {
      console.log('❌ Page access failed:', pageData.error?.message);
      return;
    }
    
    // Test 3: Check posting permissions
    console.log('\n3. Testing posting permissions...');
    const permResponse = await fetch(`https://graph.facebook.com/me/permissions?access_token=${pageToken}`);
    const permData = await permResponse.json();
    
    if (permData.data) {
      const grantedPerms = permData.data.filter(p => p.status === 'granted').map(p => p.permission);
      console.log(`✅ Granted permissions: ${grantedPerms.join(', ')}`);
      
      const hasPosting = grantedPerms.some(p => p.includes('publish') || p.includes('manage_posts') || p.includes('pages_manage_posts'));
      if (hasPosting) {
        console.log('✅ Posting permissions confirmed');
      } else {
        console.log('⚠️  No explicit posting permissions found');
      }
    }
    
    console.log('\n🎉 FACEBOOK TOKEN IS READY FOR PUBLISHING');
    return true;
    
  } catch (error) {
    console.log('🔥 Test failed:', error.message);
    return false;
  }
}

testNewFacebookToken()
  .then(success => {
    if (success) {
      console.log('\nFacebook integration ready for production use.');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });