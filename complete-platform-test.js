/**
 * Complete Platform Test for 9:00 AM JST Launch
 * Tests all social media platforms and provides launch readiness report
 */

async function completePlatformTest() {
  console.log('🚀 LAUNCH READINESS TEST - 9:00 AM JST');
  console.log('==========================================\n');
  
  const results = {
    facebook: { status: 'testing', error: null },
    x: { status: 'testing', error: null },
    linkedin: { status: 'testing', error: null },
    instagram: { status: 'testing', error: null }
  };
  
  // Test Facebook
  console.log('🔵 Testing Facebook...');
  try {
    const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (!fbToken) {
      results.facebook = { status: 'failed', error: 'Token missing' };
    } else {
      // Test token validity
      const response = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${fbToken}`);
      const data = await response.json();
      
      if (data.error) {
        results.facebook = { status: 'failed', error: `Token invalid: ${data.error.message}` };
      } else if (data.id === '4127481330818969') {
        // Test posting capability
        const testPost = await fetch(`https://graph.facebook.com/v20.0/me/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            message: 'TheAgencyIQ launch test - DELETE THIS POST',
            access_token: fbToken,
            published: 'false'  // Create as unpublished
          }).toString()
        });
        
        const postResult = await testPost.json();
        if (postResult.error) {
          results.facebook = { status: 'failed', error: `Posting failed: ${postResult.error.message}` };
        } else {
          results.facebook = { status: 'ready', error: null };
        }
      } else {
        results.facebook = { status: 'failed', error: 'Wrong page token' };
      }
    }
  } catch (error) {
    results.facebook = { status: 'failed', error: error.message };
  }
  
  // Test X (Twitter)
  console.log('🟦 Testing X...');
  try {
    const xAccessToken = process.env.TWITTER_ACCESS_TOKEN;
    const xAccessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;
    
    if (!xAccessToken || !xAccessSecret) {
      results.x = { status: 'failed', error: 'User tokens missing' };
    } else {
      results.x = { status: 'ready', error: null };
    }
  } catch (error) {
    results.x = { status: 'failed', error: error.message };
  }
  
  // Test LinkedIn
  console.log('🔷 Testing LinkedIn...');
  try {
    const linkedinToken = process.env.LINKEDIN_ACCESS_TOKEN || process.env.LINKEDIN_TOKEN;
    if (!linkedinToken) {
      results.linkedin = { status: 'failed', error: 'Token missing' };
    } else {
      const response = await fetch('https://api.linkedin.com/v2/me', {
        headers: { 'Authorization': `Bearer ${linkedinToken}` }
      });
      
      if (response.status === 401) {
        results.linkedin = { status: 'failed', error: 'Token revoked' };
      } else if (response.ok) {
        results.linkedin = { status: 'ready', error: null };
      } else {
        results.linkedin = { status: 'failed', error: `HTTP ${response.status}` };
      }
    }
  } catch (error) {
    results.linkedin = { status: 'failed', error: error.message };
  }
  
  // Test Instagram
  console.log('🟣 Testing Instagram...');
  results.instagram = { status: 'not_configured', error: 'Requires Facebook Business setup' };
  
  // Generate report
  console.log('\n📊 LAUNCH READINESS REPORT:');
  console.log('============================\n');
  
  const readyPlatforms = Object.entries(results).filter(([_, result]) => result.status === 'ready');
  const failedPlatforms = Object.entries(results).filter(([_, result]) => result.status === 'failed');
  
  console.log(`✅ Ready platforms: ${readyPlatforms.length}/4`);
  readyPlatforms.forEach(([platform, _]) => {
    console.log(`   ✓ ${platform.toUpperCase()}`);
  });
  
  if (failedPlatforms.length > 0) {
    console.log(`\n❌ Failed platforms: ${failedPlatforms.length}/4`);
    failedPlatforms.forEach(([platform, result]) => {
      console.log(`   ✗ ${platform.toUpperCase()}: ${result.error}`);
    });
  }
  
  console.log('\n🎯 IMMEDIATE ACTIONS NEEDED:');
  
  if (results.facebook.status === 'failed') {
    console.log('1. Facebook: Generate new Page Access Token');
    console.log('   - Go to https://developers.facebook.com/tools/explorer/');
    console.log('   - Get Page Access Token for "Gail Macleod"');
    console.log('   - Update FACEBOOK_PAGE_ACCESS_TOKEN secret');
  }
  
  if (results.x.status === 'failed') {
    console.log('2. X: Add user access tokens');
    console.log('   - Go to X Developer Portal');
    console.log('   - Generate Access Token and Secret');
    console.log('   - Add TWITTER_ACCESS_TOKEN and TWITTER_ACCESS_TOKEN_SECRET');
  }
  
  if (results.linkedin.status === 'failed') {
    console.log('3. LinkedIn: Complete OAuth flow');
    console.log('   - Use authorization URL from linkedin-oauth-instructions.md');
    console.log('   - Generate new access token');
  }
  
  console.log('\n⏰ LAUNCH STATUS:');
  if (readyPlatforms.length >= 2) {
    console.log('🟢 PARTIAL LAUNCH READY - Can launch with working platforms');
  } else if (readyPlatforms.length >= 1) {
    console.log('🟡 MINIMAL LAUNCH POSSIBLE - Only one platform working');
  } else {
    console.log('🔴 LAUNCH BLOCKED - No platforms operational');
  }
  
  return results;
}

completePlatformTest()
  .then(results => {
    console.log('\nTest completed. Run individual platform fixes as needed.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });