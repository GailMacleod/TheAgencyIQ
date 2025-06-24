/**
 * Final X OAuth 2.0 Test - Using Your Premium Credentials
 * Tests X posting with OAuth 2.0 Bearer token authentication
 */

async function testXOAuth2Final() {
  console.log('🔄 TESTING X OAUTH 2.0 FINAL INTEGRATION');
  console.log('========================================');

  // Check if we have an OAuth 2.0 access token stored
  const accessToken = process.env.X_OAUTH2_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ No X OAuth 2.0 access token found');
    console.log('Integration should have stored the token in secrets');
    return false;
  }

  try {
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'TheAgencyIQ X OAuth 2.0 FINAL TEST - Platform operational for 9:00 AM JST launch! 🚀'
      })
    });

    const tweetResult = await tweetResponse.json();
    console.log('Tweet Response Status:', tweetResponse.status);

    if (tweetResponse.ok) {
      console.log('✅ TWEET POSTED SUCCESSFULLY');
      console.log('Tweet ID:', tweetResult.data.id);
      console.log('Tweet Text:', tweetResult.data.text);
      console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
      console.log('✅ X PLATFORM OAUTH 2.0 OPERATIONAL');
      console.log('✅ READY FOR 9:00 AM JST LAUNCH');
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

testXOAuth2Final();