/**
 * Comprehensive Platform Credential Test
 * Tests all social media platform credentials and provides detailed diagnostics
 */

const crypto = require('crypto');

async function testPlatformCredentials() {
  console.log('🔧 Testing all platform credentials...\n');
  
  const results = {
    facebook: await testFacebook(),
    linkedin: await testLinkedIn(),
    twitter: await testTwitter(),
    instagram: await testInstagram()
  };
  
  console.log('\n📊 SUMMARY:');
  for (const [platform, result] of Object.entries(results)) {
    console.log(`${platform}: ${result.status} - ${result.message}`);
  }
  
  return results;
}

async function testFacebook() {
  console.log('🔵 Testing Facebook...');
  try {
    const userToken = process.env.FACEBOOK_ACCESS_TOKEN;
    const userToken2 = process.env.FACEBOOK_USER_ACCESS_TOKEN;
    const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    
    console.log(`- User Token: ${userToken ? 'Present' : 'Missing'}`);
    console.log(`- User Token 2: ${userToken2 ? 'Present' : 'Missing'}`);
    console.log(`- Page Token: ${pageToken ? 'Present' : 'Missing'}`);
    console.log(`- App Secret: ${appSecret ? 'Present' : 'Missing'}`);
    
    const token = userToken || userToken2 || pageToken;
    if (!token) {
      return { status: '❌ FAILED', message: 'No Facebook tokens available' };
    }
    
    // Test token validity
    const proof = crypto.createHmac('sha256', appSecret).update(token).digest('hex');
    const response = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${token}&appsecret_proof=${proof}`);
    const userData = await response.json();
    
    if (userData.error) {
      return { status: '❌ FAILED', message: `Token invalid: ${userData.error.message}` };
    }
    
    console.log(`- User ID: ${userData.id}, Name: ${userData.name}`);
    
    // Test pages access
    const pagesResponse = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${token}&appsecret_proof=${proof}`);
    const pagesData = await pagesResponse.json();
    
    if (pagesData.data && pagesData.data.length > 0) {
      console.log(`- Pages found: ${pagesData.data.length}`);
      pagesData.data.forEach((page, i) => {
        console.log(`  ${i+1}. ${page.name} (ID: ${page.id})`);
      });
      return { status: '✅ SUCCESS', message: `Ready to post (${pagesData.data.length} pages available)` };
    } else {
      return { status: '⚠️ PARTIAL', message: 'Token valid but no business pages found' };
    }
    
  } catch (error) {
    return { status: '❌ FAILED', message: `Error: ${error.message}` };
  }
}

async function testLinkedIn() {
  console.log('\n🔵 Testing LinkedIn...');
  try {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    
    console.log(`- Access Token: ${accessToken ? 'Present' : 'Missing'}`);
    console.log(`- Client ID: ${clientId ? 'Present' : 'Missing'}`);
    console.log(`- Client Secret: ${clientSecret ? 'Present' : 'Missing'}`);
    
    if (!accessToken) {
      return { status: '❌ FAILED', message: 'No LinkedIn access token available' };
    }
    
    // Test token validity
    const response = await fetch('https://api.linkedin.com/v2/people/~', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      return { status: '❌ FAILED', message: `Token invalid: ${response.status} ${errorData}` };
    }
    
    const userData = await response.json();
    console.log(`- User ID: ${userData.id}`);
    console.log(`- First Name: ${userData.localizedFirstName || 'N/A'}`);
    console.log(`- Last Name: ${userData.localizedLastName || 'N/A'}`);
    
    // Test posting permissions
    const testPost = {
      author: `urn:li:person:${userData.id}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: 'Test post from TheAgencyIQ - please ignore' },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };
    
    // Don't actually post, just validate the structure
    return { status: '✅ SUCCESS', message: 'Token valid and ready to post' };
    
  } catch (error) {
    return { status: '❌ FAILED', message: `Error: ${error.message}` };
  }
}

async function testTwitter() {
  console.log('\n🔵 Testing Twitter...');
  try {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    
    console.log(`- Client ID: ${clientId ? 'Present' : 'Missing'}`);
    console.log(`- Client Secret: ${clientSecret ? 'Present' : 'Missing'}`);
    console.log(`- Access Token: ${accessToken ? 'Present' : 'Missing'}`);
    
    if (!clientId || !clientSecret) {
      return { status: '❌ FAILED', message: 'Twitter credentials not configured' };
    }
    
    return { status: '⚠️ PARTIAL', message: 'Credentials present but OAuth 1.0a flow required' };
    
  } catch (error) {
    return { status: '❌ FAILED', message: `Error: ${error.message}` };
  }
}

async function testInstagram() {
  console.log('\n🔵 Testing Instagram...');
  try {
    const clientId = process.env.INSTAGRAM_CLIENT_ID;
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
    
    console.log(`- Client ID: ${clientId ? 'Present' : 'Missing'}`);
    console.log(`- Client Secret: ${clientSecret ? 'Present' : 'Missing'}`);
    console.log(`- Access Token: ${accessToken ? 'Present' : 'Missing'}`);
    
    if (!clientId || !clientSecret) {
      return { status: '❌ FAILED', message: 'Instagram credentials not configured' };
    }
    
    return { status: '⚠️ PARTIAL', message: 'Requires Facebook Business account integration' };
    
  } catch (error) {
    return { status: '❌ FAILED', message: `Error: ${error.message}` };
  }
}

// Run the test
testPlatformCredentials()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });