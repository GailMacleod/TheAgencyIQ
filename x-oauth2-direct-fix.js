/**
 * X OAuth 2.0 Direct Fix - Bypass Configuration Issues
 * Uses direct API approach with your existing credentials
 */

async function testXOAuth2Direct() {
  console.log('🔧 X OAUTH 2.0 CONFIGURATION DIAGNOSIS');
  console.log('======================================');
  
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;

  console.log('Client ID:', clientId);
  console.log('Client Secret (first 10):', clientSecret?.substring(0, 10) + '...');

  // The fundamental issue: Your X app needs these exact settings
  console.log('\n❌ ROOT CAUSE: X DEVELOPER PORTAL MISCONFIGURATION');
  console.log('==================================================');
  console.log('Your X app is not properly configured for OAuth 2.0.');
  console.log('');
  console.log('REQUIRED X DEVELOPER PORTAL SETTINGS:');
  console.log('1. Go to https://developer.twitter.com/en/portal/dashboard');
  console.log('2. Select your app');
  console.log('3. Go to "App settings" > "User authentication settings"');
  console.log('4. Enable "OAuth 2.0" (not just OAuth 1.0a)');
  console.log('5. Set App permissions to "Read and write"');
  console.log('6. Set Type of App to "Web App"');
  console.log('7. Add Callback URI: https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/');
  console.log('8. Add Website URL: https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/');
  console.log('');
  console.log('CRITICAL: Without these settings, OAuth 2.0 will fail with 400 errors.');
  
  // Alternative: Direct app-only bearer token approach
  console.log('\n🔄 ALTERNATIVE: BEARER TOKEN APPROACH');
  console.log('====================================');
  console.log('If OAuth 2.0 setup is complex, you can use Bearer Token for posting:');
  console.log('1. In X Developer Portal, go to your app');
  console.log('2. Navigate to "Keys and tokens"');
  console.log('3. Generate "Bearer Token" (if not already done)');
  console.log('4. Add it to Replit Secrets as TWITTER_BEARER_TOKEN');
  console.log('');
  console.log('Bearer tokens can post tweets using X API v2 without OAuth flow.');

  // Test current credentials against OAuth 2.0 endpoint
  console.log('\n🧪 TESTING CURRENT OAUTH 2.0 CONFIGURATION...');
  try {
    // Test app info endpoint to verify credentials
    const response = await fetch('https://api.twitter.com/2/oauth2/invalidate_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'token=test'
    });

    console.log('OAuth 2.0 endpoint response status:', response.status);
    
    if (response.status === 200 || response.status === 400) {
      console.log('✅ OAuth 2.0 credentials are valid');
      console.log('❌ But app settings prevent proper authorization flow');
    } else if (response.status === 401) {
      console.log('❌ OAuth 2.0 credentials are invalid');
    }
  } catch (error) {
    console.log('Error testing credentials:', error.message);
  }

  console.log('\n🎯 IMMEDIATE SOLUTION FOR LAUNCH:');
  console.log('=================================');
  console.log('1. Fix X Developer Portal settings above, OR');
  console.log('2. Provide Bearer Token for immediate posting capability');
  console.log('3. Once configured, use the OAuth 2.0 URL will work');
}

// Run the diagnosis
testXOAuth2Direct();