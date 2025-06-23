/**
 * Comprehensive Platform Authentication Test
 * Tests all social media platforms with current credentials
 */

import crypto from 'crypto';

async function testAllPlatforms() {
  console.log('🔍 Testing all platform credentials...\n');
  
  const results = {
    facebook: await testFacebook(),
    linkedin: await testLinkedIn(),
    instagram: await testInstagram(),
    twitter: await testTwitter()
  };
  
  console.log('\n📊 SUMMARY:');
  Object.entries(results).forEach(([platform, result]) => {
    console.log(`${platform}: ${result.status} - ${result.message}`);
  });
  
  return results;
}

async function testFacebook() {
  console.log('🔵 Testing Facebook...');
  
  const userToken = process.env.FACEBOOK_USER_ACCESS_TOKEN;
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  if (!userToken || !appSecret) {
    return { status: 'FAILED', message: 'Missing credentials' };
  }
  
  try {
    const proof = crypto.createHmac('sha256', appSecret).update(userToken).digest('hex');
    
    const response = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${userToken}&appsecret_proof=${proof}`);
    const data = await response.json();
    
    if (data.error) {
      return { status: 'FAILED', message: data.error.message };
    }
    
    if (data.data && data.data.length > 0) {
      return { status: 'READY', message: `Found ${data.data.length} page(s) for posting` };
    }
    
    return { status: 'PARTIAL', message: 'Valid token but no business pages found' };
  } catch (error) {
    return { status: 'ERROR', message: error.message };
  }
}

async function testLinkedIn() {
  console.log('🔗 Testing LinkedIn...');
  
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  
  if (!accessToken) {
    return { status: 'FAILED', message: 'No access token' };
  }
  
  try {
    // Test basic UGC posting capability
    const testPost = {
      author: 'urn:li:person:me',
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: 'TEST: LinkedIn API validation - DELETE IMMEDIATELY' },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS'
      }
    };
    
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(testPost)
    });
    
    const result = await response.json();
    
    if (response.ok && result.id) {
      return { status: 'READY', message: `Posted successfully: ${result.id}` };
    }
    
    return { status: 'FAILED', message: result.message || `HTTP ${response.status}` };
  } catch (error) {
    return { status: 'ERROR', message: error.message };
  }
}

async function testInstagram() {
  console.log('📸 Testing Instagram...');
  
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return { status: 'FAILED', message: 'Missing credentials' };
  }
  
  return { status: 'NEEDS_SETUP', message: 'Requires Facebook Business integration' };
}

async function testTwitter() {
  console.log('🐦 Testing Twitter...');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    return { status: 'FAILED', message: 'Missing credentials' };
  }
  
  return { status: 'NEEDS_SETUP', message: 'Requires OAuth 1.0a user tokens' };
}

testAllPlatforms()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });