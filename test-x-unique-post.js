/**
 * Test X Platform with Unique Content
 */

import { Pool } from '@neondatabase/serverless';

async function testXUniquePost() {
  console.log('🔄 TESTING X PLATFORM WITH UNIQUE CONTENT');
  console.log('=========================================');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get X connection from database
    const result = await pool.query(
      'SELECT * FROM platform_connections WHERE platform = $1 AND "isActive" = true ORDER BY "createdAt" DESC LIMIT 1',
      ['x']
    );
    
    if (result.rows.length === 0) {
      console.log('❌ No active X connection found');
      return;
    }
    
    const connection = result.rows[0];
    console.log(`✅ Found X connection ID: ${connection.id}`);
    console.log(`   Username: ${connection.platformUsername}`);
    
    // Test with unique timestamp content
    const uniqueContent = `X platform integration test - ${new Date().toISOString()} - Ready for launch! 🚀`;
    
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: uniqueContent
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ X platform posting successful!');
      console.log(`   Tweet ID: ${result.data.id}`);
      console.log(`   Content: ${uniqueContent}`);
      console.log('🚀 X Platform Status: READY FOR LAUNCH');
      return true;
    } else {
      const error = await response.json();
      console.log('❌ X posting failed:', error);
      return false;
    }
    
  } catch (error) {
    console.error('❌ X test error:', error);
    return false;
  } finally {
    await pool.end();
  }
}

testXUniquePost();