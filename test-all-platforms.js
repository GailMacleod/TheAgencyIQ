/**
 * Comprehensive Platform Authentication Test
 * Tests all social media platforms with current credentials
 */

import crypto from 'crypto';

async function testAllPlatforms() {
  console.log('Testing all platform authentications...\n');

  // Test Facebook
  console.log('=== FACEBOOK TEST ===');
  await testFacebook();
  
  // Test LinkedIn
  console.log('\n=== LINKEDIN TEST ===');
  await testLinkedIn();
  
  // Test Instagram
  console.log('\n=== INSTAGRAM TEST ===');
  await testInstagram();
  
  // Test Twitter
  console.log('\n=== TWITTER TEST ===');
  await testTwitter();
}

async function testFacebook() {
  const userToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  if (!userToken || !appSecret) {
    console.log('❌ Facebook credentials missing');
    return;
  }
  
  try {
    const proof = crypto.createHmac('sha256', appSecret).update(userToken).digest('hex');
    
    // Get user info
    const userResponse = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${userToken}&appsecret_proof=${proof}&fields=id,name`);
    const userData = await userResponse.json();
    
    if (userData.error) {
      console.log('❌ Facebook user auth failed:', userData.error.message);
      return;
    }
    
    console.log('✅ Facebook user authenticated:', userData.name);
    
    // Check for pages
    const pagesResponse = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${userToken}&appsecret_proof=${proof}`);
    const pagesData = await pagesResponse.json();
    
    if (pagesData.error) {
      console.log('❌ Facebook pages check failed:', pagesData.error.message);
      return;
    }
    
    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('⚠️  Facebook: No business pages found');
      console.log('   📋 Setup required: Create a Facebook business page');
      console.log('   🔗 Create page: https://www.facebook.com/pages/create');
    } else {
      console.log('✅ Facebook pages found:', pagesData.data.length);
      pagesData.data.forEach((page, i) => {
        console.log(`   ${i + 1}. ${page.name} (${page.id})`);
      });
    }
    
  } catch (error) {
    console.log('❌ Facebook test error:', error.message);
  }
}

async function testLinkedIn() {
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  
  if (!clientSecret) {
    console.log('❌ LinkedIn credentials missing');
    return;
  }
  
  // LinkedIn requires OAuth flow - test basic API availability
  try {
    const response = await fetch('https://api.linkedin.com/v2/people/~', {
      headers: {
        'Authorization': `Bearer ${clientSecret}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.status === 401) {
      console.log('⚠️  LinkedIn: Invalid token (OAuth required)');
      console.log('   📋 Setup required: Complete OAuth flow for user token');
    } else if (response.status === 403) {
      console.log('⚠️  LinkedIn: API access restricted');
      console.log('   📋 Setup required: Verify app permissions');
    } else {
      console.log('✅ LinkedIn API accessible');
    }
    
  } catch (error) {
    console.log('❌ LinkedIn test error:', error.message);
  }
}

async function testInstagram() {
  const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET;
  
  if (!clientSecret) {
    console.log('❌ Instagram credentials missing');
    return;
  }
  
  // Instagram requires Facebook Business API - test connection
  try {
    const response = await fetch(`https://graph.instagram.com/v20.0/me?access_token=${clientSecret}`);
    const data = await response.json();
    
    if (data.error) {
      if (data.error.code === 190) {
        console.log('⚠️  Instagram: Invalid access token');
        console.log('   📋 Setup required: Generate Instagram Business token via Facebook');
      } else {
        console.log('⚠️  Instagram:', data.error.message);
      }
    } else {
      console.log('✅ Instagram authenticated:', data.username || data.id);
    }
    
  } catch (error) {
    console.log('❌ Instagram test error:', error.message);
  }
}

async function testTwitter() {
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  
  if (!clientSecret) {
    console.log('❌ Twitter credentials missing');
    return;
  }
  
  // Twitter requires OAuth 2.0 Bearer token - test API access
  try {
    const response = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${clientSecret}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.errors) {
      console.log('⚠️  Twitter:', data.errors[0].detail);
      console.log('   📋 Setup required: Generate valid Bearer token');
    } else if (data.data) {
      console.log('✅ Twitter authenticated:', data.data.username);
    } else {
      console.log('⚠️  Twitter: Unexpected response format');
    }
    
  } catch (error) {
    console.log('❌ Twitter test error:', error.message);
  }
}

testAllPlatforms();