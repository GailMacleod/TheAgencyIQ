/**
 * FINAL LAUNCH READINESS TEST - 9:00 AM JST PREPARATION
 * Comprehensive test of all social media platforms
 */

import crypto from 'crypto';

async function testXPlatform() {
  console.log('🔄 Testing X Platform Authentication\n');

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  
  console.log('X Credentials Status:');
  console.log(`- Client ID: ${clientId ? 'SET' : 'MISSING'}`);
  console.log(`- Client Secret: ${clientSecret ? 'SET' : 'MISSING'}`);
  console.log(`- Access Token: ${accessToken ? 'SET' : 'MISSING'}`);
  
  if (!clientId || !clientSecret || !accessToken) {
    return { operational: false, error: 'Missing X credentials' };
  }

  console.log(`- Token Format: ${accessToken.substring(0, 15)}...`);
  console.log(`- Token Type: ${accessToken.includes('-') ? 'User Context' : 'App-Only'}`);

  try {
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        text: 'LAUNCH TEST - X Platform Operational! DELETE THIS POST #TheAgencyIQ' 
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ X PLATFORM OPERATIONAL');
      console.log(`Post ID: ${result.data?.id}`);
      return { operational: true, postId: result.data?.id };
    } else {
      console.log('❌ X PLATFORM FAILED');
      console.log(`Error: ${result.detail || result.title}`);
      console.log(`Status: ${response.status}`);
      
      if (result.title === 'Unsupported Authentication') {
        return { 
          operational: false, 
          error: 'App-Only token detected. Needs User Context token regeneration.',
          fix: 'Regenerate X access token with User Context permissions from X Developer Portal'
        };
      }
      
      return { operational: false, error: result.detail || result.title };
    }
  } catch (error) {
    console.log('❌ X PLATFORM ERROR');
    console.log(`Network Error: ${error.message}`);
    return { operational: false, error: `Network error: ${error.message}` };
  }
}

async function testFacebookPlatform() {
  console.log('\n🔄 Testing Facebook Platform Authentication\n');

  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const appId = process.env.FACEBOOK_APP_ID;
  
  console.log('Facebook Credentials Status:');
  console.log(`- App ID: ${appId ? 'SET' : 'MISSING'}`);
  console.log(`- App Secret: ${appSecret ? 'SET' : 'MISSING'}`);
  console.log(`- Page Token: ${pageToken ? 'SET' : 'MISSING'}`);
  
  if (!pageToken || !appSecret || !appId) {
    return { operational: false, error: 'Missing Facebook credentials' };
  }

  try {
    // Test page access first
    const pageResponse = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${pageToken}`);
    const pageInfo = await pageResponse.json();
    
    if (pageInfo.error) {
      console.log('❌ FACEBOOK PAGE ACCESS FAILED');
      console.log(`Error: ${pageInfo.error.message}`);
      return { 
        operational: false, 
        error: pageInfo.error.message,
        fix: 'Generate new Page Access Token with admin permissions from Graph API Explorer'
      };
    }
    
    console.log(`✅ Page Access: ${pageInfo.name}`);
    console.log(`Page ID: ${pageInfo.id}`);

    // Test posting capability
    const appsecret_proof = crypto.createHmac('sha256', appSecret).update(pageToken).digest('hex');
    
    const postResponse = await fetch('https://graph.facebook.com/v21.0/me/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'LAUNCH TEST - Facebook Platform Operational! DELETE THIS POST #TheAgencyIQ',
        access_token: pageToken,
        appsecret_proof
      })
    });

    const postResult = await postResponse.json();

    if (postResponse.ok) {
      console.log('✅ FACEBOOK PLATFORM OPERATIONAL');
      console.log(`Post ID: ${postResult.id}`);
      return { operational: true, postId: postResult.id };
    } else {
      console.log('❌ FACEBOOK POSTING FAILED');
      console.log(`Error: ${postResult.error?.message}`);
      
      if (postResult.error?.message?.includes('pages_manage_posts')) {
        return { 
          operational: false, 
          error: 'Page token missing admin permissions',
          fix: 'Generate Page Access Token with pages_manage_posts and pages_read_engagement permissions'
        };
      }
      
      return { operational: false, error: postResult.error?.message };
    }
  } catch (error) {
    console.log('❌ FACEBOOK PLATFORM ERROR');
    console.log(`Network Error: ${error.message}`);
    return { operational: false, error: `Network error: ${error.message}` };
  }
}

async function testLinkedInPlatform() {
  console.log('\n🔄 Testing LinkedIn Platform Authentication\n');

  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  
  console.log('LinkedIn Credentials Status:');
  console.log(`- Access Token: ${accessToken ? 'SET' : 'MISSING'}`);
  
  if (!accessToken) {
    return { operational: false, error: 'Missing LinkedIn access token' };
  }

  try {
    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        author: `urn:li:person:${accessToken.split('-')[0]}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: 'LAUNCH TEST - LinkedIn Platform Operational! DELETE THIS POST #TheAgencyIQ'
            },
            shareMediaCategory: 'NONE'
          }
        }
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ LINKEDIN PLATFORM OPERATIONAL');
      console.log(`Post ID: ${result.id}`);
      return { operational: true, postId: result.id };
    } else {
      console.log('❌ LINKEDIN PLATFORM FAILED');
      console.log(`Error: ${result.message || 'Unknown error'}`);
      console.log(`Status: ${response.status}`);
      return { operational: false, error: result.message || 'API error' };
    }
  } catch (error) {
    console.log('❌ LINKEDIN PLATFORM ERROR');
    console.log(`Network Error: ${error.message}`);
    return { operational: false, error: `Network error: ${error.message}` };
  }
}

async function testInstagramPlatform() {
  console.log('\n🔄 Testing Instagram Platform Authentication\n');

  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  
  console.log('Instagram Credentials Status:');
  console.log(`- Page Token: ${pageToken ? 'SET' : 'MISSING'}`);
  
  if (!pageToken) {
    return { operational: false, error: 'Missing Instagram page token' };
  }

  try {
    // Get Instagram Business Account ID
    const pageResponse = await fetch(`https://graph.facebook.com/v21.0/me?fields=instagram_business_account&access_token=${pageToken}`);
    const pageInfo = await pageResponse.json();
    
    if (!pageInfo.instagram_business_account) {
      console.log('❌ INSTAGRAM BUSINESS ACCOUNT NOT CONNECTED');
      return { 
        operational: false, 
        error: 'Instagram Business Account not connected to Facebook Page',
        fix: 'Connect Instagram Business Account to Facebook Page in Facebook Business Settings'
      };
    }

    const igAccountId = pageInfo.instagram_business_account.id;
    console.log(`✅ Instagram Business Account: ${igAccountId}`);

    // Test media creation
    const mediaResponse = await fetch(`https://graph.facebook.com/v21.0/${igAccountId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caption: 'LAUNCH TEST - Instagram Platform Operational! DELETE THIS POST #TheAgencyIQ',
        image_url: 'https://via.placeholder.com/400x400/0066cc/ffffff?text=TheAgencyIQ+Test',
        access_token: pageToken
      })
    });

    const mediaResult = await mediaResponse.json();

    if (mediaResponse.ok) {
      console.log('✅ INSTAGRAM PLATFORM OPERATIONAL');
      console.log(`Media ID: ${mediaResult.id}`);
      return { operational: true, mediaId: mediaResult.id };
    } else {
      console.log('❌ INSTAGRAM PLATFORM FAILED');
      console.log(`Error: ${mediaResult.error?.message}`);
      return { operational: false, error: mediaResult.error?.message };
    }
  } catch (error) {
    console.log('❌ INSTAGRAM PLATFORM ERROR');
    console.log(`Network Error: ${error.message}`);
    return { operational: false, error: `Network error: ${error.message}` };
  }
}

async function generateLaunchReport() {
  console.log('🚀 THEAGENCYIQ LAUNCH READINESS ASSESSMENT');
  console.log('Target Launch: 9:00 AM JST - June 23, 2025\n');
  console.log('='.repeat(60));

  const results = {
    x: await testXPlatform(),
    facebook: await testFacebookPlatform(),
    linkedin: await testLinkedInPlatform(),
    instagram: await testInstagramPlatform()
  };

  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL LAUNCH READINESS REPORT');
  console.log('='.repeat(60));

  let operationalCount = 0;
  const totalPlatforms = Object.keys(results).length;

  for (const [platform, result] of Object.entries(results)) {
    const status = result.operational ? '✅ OPERATIONAL' : '❌ NEEDS FIXING';
    console.log(`${platform.toUpperCase()}: ${status}`);
    
    if (result.operational) {
      operationalCount++;
      if (result.postId) console.log(`  └─ Posted: ${result.postId}`);
      if (result.mediaId) console.log(`  └─ Media: ${result.mediaId}`);
    } else {
      console.log(`  └─ Error: ${result.error}`);
      if (result.fix) console.log(`  └─ Fix: ${result.fix}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`PLATFORMS OPERATIONAL: ${operationalCount}/${totalPlatforms}`);
  
  if (operationalCount === totalPlatforms) {
    console.log('🎯 ALL PLATFORMS READY - LAUNCH APPROVED FOR 9:00 AM JST!');
  } else {
    console.log('⚠️  LAUNCH BLOCKED - FIX REQUIRED PLATFORMS BEFORE 9:00 AM JST');
    console.log('\nURGENT ACTIONS REQUIRED:');
    
    for (const [platform, result] of Object.entries(results)) {
      if (!result.operational && result.fix) {
        console.log(`• ${platform.toUpperCase()}: ${result.fix}`);
      }
    }
  }
  
  console.log('='.repeat(60));
  console.log(`Report generated: ${new Date().toISOString()}`);
  
  return results;
}

generateLaunchReport().catch(console.error);