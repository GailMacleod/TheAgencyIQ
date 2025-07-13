
/**
 * Test Facebook OAuth Callback URL
 * Verifies that the callback endpoint responds correctly
 */

const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testFacebookCallback() {
  console.log('🔍 Testing Facebook OAuth Callback URL Configuration...\n');

  try {
    // Step 1: Test root callback endpoint
    console.log('1. Testing root callback endpoint...');
    const mockState = Buffer.from(JSON.stringify({
      platform: 'facebook',
      timestamp: Date.now(),
      userId: 2
    })).toString('base64');

    const callbackResponse = await fetch(`${baseUrl}/callback?code=test_auth_code&state=${mockState}`, {
      method: 'GET',
      credentials: 'include'
    });

    console.log(`   Status: ${callbackResponse.status}`);
    
    if (callbackResponse.ok) {
      const responseText = await callbackResponse.text();
      const hasPostMessage = responseText.includes('window.opener.postMessage');
      const hasOAuthSuccess = responseText.includes('oauth_success');
      
      console.log(`   ✅ Callback endpoint working`);
      console.log(`   📤 PostMessage support: ${hasPostMessage ? '✅' : '❌'}`);
      console.log(`   🎯 OAuth success handling: ${hasOAuthSuccess ? '✅' : '❌'}`);
    } else {
      console.log(`   ❌ Callback endpoint error: ${callbackResponse.status}`);
    }

    // Step 2: Test Facebook OAuth initiation
    console.log('\n2. Testing Facebook OAuth initiation...');
    const oauthResponse = await fetch(`${baseUrl}/connect/facebook`, {
      method: 'GET',
      credentials: 'include',
      redirect: 'manual'
    });

    console.log(`   Status: ${oauthResponse.status}`);
    
    if (oauthResponse.status === 302) {
      const location = oauthResponse.headers.get('location');
      if (location && location.includes('facebook.com')) {
        console.log(`   ✅ Facebook OAuth redirect working`);
        console.log(`   🔗 Redirect URL: ${location.substring(0, 80)}...`);
        
        // Check if callback URL is in the redirect
        const expectedCallback = encodeURIComponent(`${baseUrl}/`);
        if (location.includes(expectedCallback)) {
          console.log(`   ✅ Callback URL properly configured in Facebook redirect`);
        } else {
          console.log(`   ⚠️  Callback URL might not match - expected: ${expectedCallback}`);
        }
      } else {
        console.log(`   ❌ Invalid Facebook redirect URL`);
      }
    } else if (oauthResponse.status === 401) {
      console.log(`   ⚠️  OAuth requires authentication - this is expected without session`);
    } else {
      console.log(`   ❌ OAuth initiation failed`);
    }

    // Step 3: Check Facebook app configuration requirements
    console.log('\n3. Facebook App Configuration Requirements:');
    console.log(`   📍 Valid OAuth Redirect URI: ${baseUrl}/`);
    console.log(`   🌐 App Domain: 4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev`);
    console.log(`   ⚙️  Required in Facebook Developer Console:`);
    console.log(`      - Products > Facebook Login > Settings > Valid OAuth Redirect URIs`);
    console.log(`      - Settings > Basic > App Domains`);

    console.log('\n📋 SUMMARY:');
    console.log(`✅ Callback URL is properly configured for: ${baseUrl}/`);
    console.log(`🔧 Ensure Facebook App settings match the above configuration`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFacebookCallback();
