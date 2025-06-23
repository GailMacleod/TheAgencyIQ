/**
 * X OAuth 2.0 Direct Fix - Bypass Configuration Issues
 * Uses direct API approach with your existing credentials
 */

async function testXOAuth2Direct() {
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;

  console.log('🔥 X OAUTH 2.0 DIRECT FIX');
  console.log('=========================');
  
  // Test 1: Check if we can get an app-only bearer token
  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    console.log('🔧 Testing Bearer Token Generation...');
    
    const response = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const result = await response.json();
    
    if (response.ok && result.access_token) {
      console.log('✅ App Bearer Token Generated Successfully');
      console.log('📝 Bearer Token:', result.access_token.substring(0, 30) + '...');
      
      // Test posting capability with bearer token
      console.log('\n🧪 Testing Tweet Capability...');
      
      const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'Test tweet from TheAgencyIQ - OAuth 2.0 working!'
        })
      });

      const tweetResult = await tweetResponse.json();
      console.log('Tweet Test Status:', tweetResponse.status);
      console.log('Tweet Test Response:', JSON.stringify(tweetResult, null, 2));
      
      if (tweetResponse.ok) {
        console.log('🎉 SUCCESS! X posting is working with OAuth 2.0');
        console.log('🔧 Add this to Replit Secrets:');
        console.log('X_BEARER_TOKEN =', result.access_token);
        return result.access_token;
      } else {
        console.log('❌ Tweet failed but bearer token works');
        console.log('💡 This means OAuth 2.0 is working but needs user context for posting');
      }
      
    } else {
      console.log('❌ Bearer token generation failed');
      console.log('📋 Response:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.log('💥 Error:', error.message);
  }

  // Test 2: Alternative OAuth 2.0 URL with different parameters
  console.log('\n🔄 ALTERNATIVE OAUTH 2.0 APPROACH');
  console.log('==================================');
  
  const simpleAuthUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/&scope=tweet.write%20users.read&state=simple_auth`;
  
  console.log('🔗 SIMPLIFIED AUTHORIZATION URL:');
  console.log(simpleAuthUrl);
  console.log('\n📋 Try this simpler URL - it removes PKCE which might be causing issues');
}

testXOAuth2Direct();