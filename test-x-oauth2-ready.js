/**
 * Test X OAuth 2.0 Integration - Launch Ready
 */

async function testXOAuth2Ready() {
  console.log('🔄 TESTING X OAUTH 2.0 INTEGRATION');
  console.log('==================================');

  const accessToken = process.env.X_OAUTH2_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ No X OAuth 2.0 access token found');
    return false;
  }

  console.log('✅ OAuth 2.0 token available');
  console.log('Token preview:', accessToken.substring(0, 20) + '...');

  try {
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'TheAgencyIQ X OAuth 2.0 INTEGRATION VERIFIED! Platform ready for 9:00 AM JST launch!'
      })
    });

    const tweetResult = await tweetResponse.json();
    console.log('Tweet Response Status:', tweetResponse.status);

    if (tweetResponse.ok) {
      console.log('✅ TWEET POSTED SUCCESSFULLY');
      console.log('Tweet ID:', tweetResult.data.id);
      console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
      console.log('✅ X PLATFORM OAUTH 2.0 FULLY OPERATIONAL');
      console.log('✅ LAUNCH READINESS: CONFIRMED');
      return true;
    } else {
      console.log('❌ Tweet posting failed:', JSON.stringify(tweetResult, null, 2));
      return false;
    }
  } catch (error) {
    console.log('💥 Network error:', error.message);
    return false;
  }
}

testXOAuth2Ready();