/**
 * Test X Integration Using Stored Database Token
 */

import { db } from './server/db.js';
import { platformConnections } from './shared/schema.js';
import { eq, and } from 'drizzle-orm';

async function testStoredXToken() {
  console.log('🔄 TESTING STORED X TOKEN');
  console.log('=========================');

  try {
    // Get the X platform connection from database
    const [connection] = await db
      .select()
      .from(platformConnections)
      .where(and(
        eq(platformConnections.platform, 'x'),
        eq(platformConnections.isActive, true)
      ))
      .orderBy(platformConnections.createdAt)
      .limit(1);

    if (!connection) {
      console.log('❌ No active X connection found in database');
      return false;
    }

    console.log('✅ X connection found:', connection.id);
    console.log('Platform Username:', connection.platformUsername);
    console.log('Token preview:', connection.accessToken.substring(0, 20) + '...');

    // Test posting with the stored token
    const tweetResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'TheAgencyIQ X platform VERIFIED! Database token working perfectly for 9:00 AM JST launch!'
      })
    });

    const tweetResult = await tweetResponse.json();
    console.log('Tweet Response Status:', tweetResponse.status);

    if (tweetResponse.ok) {
      console.log('✅ TWEET POSTED SUCCESSFULLY');
      console.log('Tweet ID:', tweetResult.data.id);
      console.log('Tweet URL: https://twitter.com/i/web/status/' + tweetResult.data.id);
      console.log('✅ X PLATFORM FULLY OPERATIONAL');
      console.log('✅ READY FOR 9:00 AM JST LAUNCH');
      return true;
    } else {
      console.log('❌ Tweet posting failed:', JSON.stringify(tweetResult, null, 2));
      return false;
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
    return false;
  }
}

testStoredXToken();