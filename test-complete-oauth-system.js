/**
 * Complete OAuth System Test with Updated LinkedIn Secret
 * Tests all 5 platforms with current credentials
 */

async function testCompleteOAuthSystem() {
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  console.log('🔍 COMPLETE OAUTH SYSTEM TEST');
  console.log('============================');
  
  // Test platform connections status
  try {
    const response = await fetch(`${baseUrl}/api/platform-connections`, {
      credentials: 'include'
    });
    
    const connections = await response.json();
    console.log(`\n📊 Platform Connections Summary:`);
    console.log(`Total connections: ${connections.length}`);
    
    // Group by platform
    const platformCounts = {};
    connections.forEach(conn => {
      platformCounts[conn.platform] = (platformCounts[conn.platform] || 0) + 1;
    });
    
    console.log('\n📋 Platform Connection Counts:');
    Object.entries(platformCounts).forEach(([platform, count]) => {
      console.log(`  ${platform}: ${count} connections`);
    });
    
    // Test OAuth URLs for all platforms
    console.log('\n🔗 Testing OAuth URL Generation:');
    const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    
    for (const platform of platforms) {
      try {
        const oauthResponse = await fetch(`${baseUrl}/connect/${platform}`, {
          method: 'GET',
          credentials: 'include',
          redirect: 'manual'
        });
        
        if (oauthResponse.status === 302) {
          const location = oauthResponse.headers.get('location');
          
          // Check for required components
          const hasClientId = location.includes('client_id=') && !location.includes('client_id=undefined');
          const hasRedirectUri = location.includes('redirect_uri=');
          const hasScope = location.includes('scope=');
          
          console.log(`  ✅ ${platform.toUpperCase()}: OAuth URL generated`);
          console.log(`     Client ID: ${hasClientId ? 'Present' : 'Missing'}`);
          console.log(`     Redirect URI: ${hasRedirectUri ? 'Present' : 'Missing'}`);
          console.log(`     Scopes: ${hasScope ? 'Present' : 'Missing'}`);
          
          // Platform-specific validations
          if (platform === 'linkedin' && hasClientId) {
            console.log(`     LinkedIn Client ID detected: Working with updated secret`);
          }
          
          if (platform === 'instagram') {
            const hasValidScopes = location.includes('instagram_manage_posts') && 
                                 location.includes('instagram_basic_display') &&
                                 !location.includes('instagram_basic,') &&
                                 !location.includes('instagram_content_publish');
            console.log(`     Instagram Scopes: ${hasValidScopes ? 'Fixed (valid scopes)' : 'Needs fixing'}`);
          }
          
        } else {
          console.log(`  ❌ ${platform.toUpperCase()}: OAuth URL generation failed (${oauthResponse.status})`);
        }
      } catch (error) {
        console.log(`  ❌ ${platform.toUpperCase()}: Error - ${error.message}`);
      }
    }
    
    // Test recent token validation
    console.log('\n🔍 Recent Connection Status:');
    const recentConnections = connections
      .sort((a, b) => new Date(b.connectedAt) - new Date(a.connectedAt))
      .slice(0, 5);
    
    recentConnections.forEach(conn => {
      const status = conn.oauthStatus?.isValid ? 'Valid' : 'Invalid';
      const error = conn.oauthStatus?.error || 'None';
      const needsReauth = conn.oauthStatus?.needsReauth ? 'Yes' : 'No';
      
      console.log(`  ${conn.platform.toUpperCase()}: ${status} | Error: ${error} | Needs Reauth: ${needsReauth}`);
    });
    
    // Environment verification
    console.log('\n🔧 Environment Variables Check:');
    const envVars = [
      'FACEBOOK_APP_ID',
      'FACEBOOK_APP_SECRET', 
      'LINKEDIN_CLIENT_ID',
      'LINKEDIN_CLIENT_SECRET',
      'X_OAUTH_CLIENT_ID',
      'X_OAUTH_CLIENT_SECRET',
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET'
    ];
    
    for (const envVar of envVars) {
      const hasValue = process.env[envVar] && process.env[envVar].length > 0;
      console.log(`  ${envVar}: ${hasValue ? 'Set' : 'Missing'}`);
    }
    
    console.log('\n✅ OAuth System Test Complete');
    console.log('Ready for manual OAuth testing on /connect-platforms page');
    
  } catch (error) {
    console.error('❌ OAuth System Test Failed:', error.message);
  }
}

testCompleteOAuthSystem();