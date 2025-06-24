/**
 * Final Launch Status Check - 9:00 AM JST Readiness
 */

async function finalLaunchStatus() {
  console.log('🚀 FINAL LAUNCH STATUS CHECK');
  console.log('============================');
  console.log('Target Launch: 9:00 AM JST June 23, 2025');
  console.log('');
  
  const platforms = {
    x: { name: 'X Platform', status: 'UNKNOWN', details: '' },
    facebook: { name: 'Facebook', status: 'UNKNOWN', details: '' },
    linkedin: { name: 'LinkedIn', status: 'UNKNOWN', details: '' },
    instagram: { name: 'Instagram', status: 'UNKNOWN', details: '' }
  };

  // Test X Platform
  console.log('1. Testing X Platform...');
  try {
    const xToken = process.env.X_OAUTH2_ACCESS_TOKEN;
    if (xToken) {
      const response = await fetch('https://api.twitter.com/2/users/me', {
        headers: { 'Authorization': `Bearer ${xToken}` }
      });
      
      if (response.ok) {
        const user = await response.json();
        platforms.x.status = 'READY';
        platforms.x.details = `Connected as @${user.data.username}`;
      } else {
        platforms.x.status = 'TOKEN_EXPIRED';
        platforms.x.details = 'OAuth token needs renewal';
      }
    } else {
      platforms.x.status = 'NOT_CONFIGURED';
      platforms.x.details = 'Missing access token';
    }
  } catch (error) {
    platforms.x.status = 'ERROR';
    platforms.x.details = error.message;
  }

  // Test Facebook
  console.log('2. Testing Facebook...');
  try {
    const fbToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
    if (fbToken) {
      const response = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${fbToken}`);
      
      if (response.ok) {
        const user = await response.json();
        platforms.facebook.status = 'READY';
        platforms.facebook.details = `Connected as ${user.name}`;
      } else {
        const error = await response.json();
        platforms.facebook.status = 'TOKEN_EXPIRED';
        platforms.facebook.details = 'Token expired - needs OAuth renewal';
      }
    } else {
      platforms.facebook.status = 'NOT_CONFIGURED';
      platforms.facebook.details = 'Missing page access token';
    }
  } catch (error) {
    platforms.facebook.status = 'ERROR';
    platforms.facebook.details = error.message;
  }

  // Test LinkedIn
  console.log('3. Testing LinkedIn...');
  try {
    const linkedinToken = process.env.LINKEDIN_ACCESS_TOKEN;
    if (linkedinToken) {
      const response = await fetch('https://api.linkedin.com/v2/me', {
        headers: { 'Authorization': `Bearer ${linkedinToken}` }
      });
      
      if (response.ok) {
        const user = await response.json();
        platforms.linkedin.status = 'READY';
        platforms.linkedin.details = `Connected as ${user.firstName?.localized?.en_US || 'LinkedIn User'}`;
      } else {
        platforms.linkedin.status = 'TOKEN_EXPIRED';
        platforms.linkedin.details = 'Token needs renewal';
      }
    } else {
      platforms.linkedin.status = 'NOT_CONFIGURED';
      platforms.linkedin.details = 'Missing access token';
    }
  } catch (error) {
    platforms.linkedin.status = 'ERROR';
    platforms.linkedin.details = error.message;
  }

  // Test Instagram
  console.log('4. Testing Instagram...');
  try {
    const instagramToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN; // Instagram uses Facebook tokens
    if (instagramToken) {
      // Check for Instagram business account connection
      const response = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${instagramToken}`);
      
      if (response.ok) {
        const pages = await response.json();
        let hasInstagram = false;
        
        for (const page of pages.data || []) {
          const igResponse = await fetch(
            `https://graph.facebook.com/v20.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
          );
          if (igResponse.ok) {
            const igData = await igResponse.json();
            if (igData.instagram_business_account) {
              hasInstagram = true;
              break;
            }
          }
        }
        
        platforms.instagram.status = hasInstagram ? 'READY' : 'NEEDS_SETUP';
        platforms.instagram.details = hasInstagram ? 'Business account connected' : 'Business account setup required';
      } else {
        platforms.instagram.status = 'TOKEN_EXPIRED';
        platforms.instagram.details = 'Facebook token expired';
      }
    } else {
      platforms.instagram.status = 'NOT_CONFIGURED';
      platforms.instagram.details = 'Missing Facebook token';
    }
  } catch (error) {
    platforms.instagram.status = 'ERROR';
    platforms.instagram.details = error.message;
  }

  // Generate status report
  console.log('\n📊 PLATFORM STATUS REPORT');
  console.log('==========================');
  
  let readyCount = 0;
  const totalPlatforms = Object.keys(platforms).length;
  
  for (const [key, platform] of Object.entries(platforms)) {
    const statusIcon = platform.status === 'READY' ? '✅' : 
                      platform.status === 'TOKEN_EXPIRED' ? '🔄' :
                      platform.status === 'NEEDS_SETUP' ? '⚠️' : '❌';
    
    console.log(`${statusIcon} ${platform.name}: ${platform.status}`);
    console.log(`   ${platform.details}`);
    
    if (platform.status === 'READY') readyCount++;
  }
  
  console.log('\n🎯 LAUNCH READINESS SUMMARY');
  console.log('===========================');
  console.log(`Ready Platforms: ${readyCount}/${totalPlatforms}`);
  console.log(`Launch Status: ${readyCount >= 2 ? 'GO' : 'HOLD'}`);
  
  if (readyCount >= 2) {
    console.log('✅ Minimum platform requirements met for launch');
    console.log('🚀 System ready for 9:00 AM JST deployment');
  } else {
    console.log('❌ Additional platform setup required');
    console.log('🔧 Complete OAuth setup for critical platforms');
  }
  
  return { platforms, readyCount, totalPlatforms, launchReady: readyCount >= 2 };
}

finalLaunchStatus();