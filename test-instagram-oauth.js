#!/usr/bin/env node

/**
 * Instagram Business API OAuth Test
 * Tests the complete OAuth flow for Instagram using Facebook's Business API
 */

async function testInstagramOAuth() {
  console.log('🔍 Testing Instagram Business API OAuth Configuration');
  console.log('=' .repeat(60));

  // Test 1: Environment Variables
  console.log('\n1. Testing Environment Variables:');
  const requiredEnvVars = [
    'FACEBOOK_CLIENT_ID',
    'FACEBOOK_APP_ID', 
    'FACEBOOK_CLIENT_SECRET',
    'FACEBOOK_APP_SECRET'
  ];

  const envResults = {};
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    envResults[envVar] = value ? '✅ Present' : '❌ Missing';
    console.log(`   ${envVar}: ${envResults[envVar]}`);
  });

  // Test 2: OAuth URL Generation
  console.log('\n2. Testing OAuth URL Generation:');
  const clientId = process.env.FACEBOOK_CLIENT_ID || process.env.FACEBOOK_APP_ID;
  const redirectUri = 'https://app.theagencyiq.ai/api/auth/instagram/callback';
  const scope = 'instagram_basic pages_show_list instagram_manage_posts';
  
  if (clientId) {
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&response_type=code&state=user_test_instagram_business`;
    console.log(`   ✅ Auth URL Generated Successfully`);
    console.log(`   📋 URL: ${authUrl}`);
    console.log(`   🔑 Client ID: ${clientId}`);
    console.log(`   🎯 Redirect URI: ${redirectUri}`);
    console.log(`   📜 Scopes: ${scope}`);
  } else {
    console.log(`   ❌ Cannot generate auth URL - missing client ID`);
  }

  // Test 3: Route Configuration
  console.log('\n3. Testing Route Configuration:');
  
  try {
    const response = await fetch('http://localhost:5000/api/auth/facebook', {
      method: 'GET',
      redirect: 'manual'
    });
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      console.log(`   ✅ Facebook OAuth route working`);
      console.log(`   📍 Redirects to: ${location}`);
    } else {
      console.log(`   ❌ Facebook OAuth route failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Facebook OAuth route error: ${error.message}`);
  }

  try {
    const response = await fetch('http://localhost:5000/api/auth/instagram', {
      method: 'GET',
      redirect: 'manual'
    });
    
    if (response.status === 302) {
      const location = response.headers.get('location');
      console.log(`   ✅ Instagram OAuth route working`);
      console.log(`   📍 Redirects to: ${location}`);
      
      // Verify space-delimited scopes
      if (location.includes('instagram_basic pages_show_list instagram_manage_posts')) {
        console.log(`   ✅ Space-delimited scopes configured correctly`);
      } else {
        console.log(`   ⚠️  Scope format may need verification`);
      }
    } else {
      console.log(`   ❌ Instagram OAuth route failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Instagram OAuth route error: ${error.message}`);
  }

  // Test 4: Instagram Fix Endpoint
  console.log('\n4. Testing Instagram Fix Endpoint:');
  
  try {
    const response = await fetch('http://localhost:5000/api/instagram-fix', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Instagram Fix endpoint responding`);
      console.log(`   📊 Response: ${JSON.stringify(data, null, 2)}`);
    } else {
      console.log(`   ❌ Instagram Fix endpoint failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Instagram Fix endpoint error: ${error.message}`);
  }

  // Test 5: Redirect URI Configuration Check
  console.log('\n5. Redirect URI Configuration Check:');
  console.log(`   📋 Required redirect URI: ${redirectUri}`);
  console.log(`   ⚠️  Ensure this URI is whitelisted in Facebook Developer Portal`);
  console.log(`   🔗 Facebook App Settings > Products > Facebook Login > Settings`);
  console.log(`   📝 Add to "Valid OAuth Redirect URIs"`);

  // Test Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 TEST SUMMARY:');
  console.log(`   Environment Variables: ${Object.values(envResults).filter(v => v.includes('✅')).length}/${requiredEnvVars.length} configured`);
  console.log(`   OAuth Routes: Tested /api/auth/facebook and /api/auth/instagram`);
  console.log(`   Instagram Fix: Tested /api/instagram-fix endpoint`);
  console.log(`   Scope Format: Space-delimited (instagram_basic pages_show_list instagram_manage_posts)`);
  console.log('\n🔧 NEXT STEPS:');
  console.log('   1. Verify redirect URI is whitelisted in Facebook Developer Portal');
  console.log('   2. Test OAuth flow at /instagram-fix');
  console.log('   3. Ensure live credentials are in Replit Secrets');
  console.log('   4. Test complete callback flow');
  
  console.log('\n✅ Instagram Business API OAuth test completed');
}

// Run the test
testInstagramOAuth().catch(console.error);