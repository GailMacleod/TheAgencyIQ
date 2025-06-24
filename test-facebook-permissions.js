/**
 * Facebook Token Permissions Test
 * Validates page access token and required permissions for posting
 */

import crypto from 'crypto';

async function testFacebookPermissions() {
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  if (!pageToken || !appSecret) {
    console.error('Missing Facebook credentials');
    return;
  }
  
  // Generate appsecret_proof
  const proof = crypto.createHmac('sha256', appSecret).update(pageToken).digest('hex');
  
  console.log('Testing Facebook page token permissions...');
  
  try {
    // Test 1: Get user info (this is a user token, not page token)
    const userInfoUrl = `https://graph.facebook.com/v20.0/me?access_token=${pageToken}&appsecret_proof=${proof}&fields=id,name`;
    const userResponse = await fetch(userInfoUrl);
    const userData = await userResponse.json();
    
    if (userData.error) {
      console.error('User info error:', userData.error);
      return;
    }
    
    console.log('User info:', {
      id: userData.id,
      name: userData.name
    });
    
    // Test 2: Check token permissions
    const permissionsUrl = `https://graph.facebook.com/v20.0/me/permissions?access_token=${pageToken}&appsecret_proof=${proof}`;
    const permResponse = await fetch(permissionsUrl);
    const permData = await permResponse.json();
    
    if (permData.error) {
      console.error('Permissions error:', permData.error);
      return;
    }
    
    console.log('Token permissions:', permData.data);
    
    // Check for required permissions
    const requiredPerms = ['pages_manage_posts', 'pages_read_engagement'];
    const grantedPerms = permData.data.filter(p => p.status === 'granted').map(p => p.permission);
    
    console.log('Required permissions:', requiredPerms);
    console.log('Granted permissions:', grantedPerms);
    
    const hasRequiredPerms = requiredPerms.every(perm => grantedPerms.includes(perm));
    console.log('Has required permissions:', hasRequiredPerms);
    
    // Test 3: Get user's pages and try posting to managed page
    if (hasRequiredPerms) {
      console.log('Getting user pages...');
      const pagesUrl = `https://graph.facebook.com/v20.0/me/accounts?access_token=${pageToken}&appsecret_proof=${proof}`;
      const pagesResponse = await fetch(pagesUrl);
      const pagesData = await pagesResponse.json();
      
      if (pagesData.error) {
        console.error('Pages error:', pagesData.error);
        return;
      }
      
      console.log('User pages:', pagesData.data.map(p => ({ id: p.id, name: p.name })));
      
      if (pagesData.data.length > 0) {
        const page = pagesData.data[0]; // Use first page
        console.log(`Testing post creation on page: ${page.name} (${page.id})`);
        
        const postUrl = `https://graph.facebook.com/v20.0/${page.id}/feed`;
        const postResponse = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            message: 'Test post from TheAgencyIQ - verifying posting permissions',
            access_token: page.access_token, // Use page's access token
            appsecret_proof: crypto.createHmac('sha256', appSecret).update(page.access_token).digest('hex')
          }).toString()
        });
        
        const postResult = await postResponse.json();
        
        if (postResult.error) {
          console.error('Page post creation error:', postResult.error);
        } else {
          console.log('Page post created successfully:', postResult.id);
          
          // Delete the test post
          const deleteUrl = `https://graph.facebook.com/v20.0/${postResult.id}?access_token=${page.access_token}&appsecret_proof=${crypto.createHmac('sha256', appSecret).update(page.access_token).digest('hex')}`;
          await fetch(deleteUrl, { method: 'DELETE' });
          console.log('Test post deleted');
        }
      } else {
        console.log('No pages found - user needs to manage a Facebook page to post');
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testFacebookPermissions();