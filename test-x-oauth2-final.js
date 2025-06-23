/**
 * Final X OAuth 2.0 Test - Using Your Premium Credentials
 * Tests X posting with OAuth 2.0 Bearer token authentication
 */

async function testXOAuth2Final() {
  console.log('🔥 TESTING X OAUTH 2.0 WITH YOUR PREMIUM CREDENTIALS');
  console.log('================================================');

  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;

  console.log('✅ Client ID:', clientId ? `${clientId.substring(0, 8)}...` : 'MISSING');
  console.log('✅ Client Secret:', clientSecret ? `${clientSecret.substring(0, 8)}...` : 'MISSING');
  console.log('✅ Access Token:', accessToken ? `${accessToken.substring(0, 10)}...` : 'MISSING');

  if (!clientId || !clientSecret || !accessToken) {
    console.log('❌ MISSING X CREDENTIALS - Check your secrets');
    return;
  }

  try {
    console.log('\n🚀 Testing X post with OAuth 2.0...');
    
    const testContent = `🎯 Testing X OAuth 2.0 integration - ${new Date().toISOString()}`;
    
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: testContent })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('🎉 SUCCESS! X POST PUBLISHED!');
      console.log('📝 Post ID:', result.data?.id);
      console.log('💬 Content:', testContent);
      console.log('🔗 URL: https://twitter.com/i/web/status/' + result.data?.id);
    } else {
      console.log('❌ X POST FAILED');
      console.log('📊 Status:', response.status);
      console.log('📋 Response:', JSON.stringify(result, null, 2));
      
      // Check for specific error types
      if (result.title === 'Unauthorized' || response.status === 401) {
        console.log('🔐 AUTHENTICATION ISSUE - Token may be invalid or expired');
      } else if (result.detail?.includes('duplicate')) {
        console.log('📝 DUPLICATE CONTENT - Try with different text');
      }
    }

  } catch (error) {
    console.log('💥 X TEST ERROR:', error.message);
  }

  console.log('\n================================================');
  console.log('X OAuth 2.0 test completed');
}

// Run the test
testXOAuth2Final();