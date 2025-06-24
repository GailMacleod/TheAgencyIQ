/**
 * Test X Integration Using Database Token
 */

const accessToken = 'MVF0RGxvd1VBYWFOcEtVNDlXRFN3d2d3eC1PcVZkVnk1TVBidkJCZVUydlEtOjE3NTA2NjE4MTg1MzE6MToxOmF0OjE';

async function testXDatabaseToken() {
  console.log('🔄 TESTING X DATABASE TOKEN');
  console.log('===========================');
  console.log('Connection ID: 132');
  console.log('Platform: X (OAuth 2.0)');

  try {
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'TheAgencyIQ X platform CONFIRMED! OAuth 2.0 token working from database - ready for 9:00 AM JST launch!'
      })
    });

    const tweetResult = await tweetResponse.json();
    console.log('Tweet Response Status:', tweetResponse.status);

    if (tweetResponse.ok) {
      console.log('✅ TWEET POSTED SUCCESSFULLY');
      console.log('Tweet ID:', tweetResult.data.id);
      console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
      console.log('✅ X PLATFORM OAUTH 2.0 CONFIRMED WORKING');
      console.log('✅ DATABASE TOKEN OPERATIONAL');
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

testXDatabaseToken();