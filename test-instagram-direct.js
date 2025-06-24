/**
 * Direct Instagram Integration Test
 */

async function testInstagramDirect() {
  console.log('📱 DIRECT INSTAGRAM INTEGRATION TEST');
  console.log('===================================');
  
  try {
    // Test Instagram setup endpoint directly
    const setupResponse = await fetch('http://localhost:5000/api/instagram/setup', {
      method: 'POST',
      headers: {
        'Cookie': 'connect.sid=s%3AKkZCVRY-sfng71ArWbtJsm_2_EwxUTig.TKyugtcLjDTMXTJdncP23%2BsCYu33B4sAFQ%2BodpZ1q6M',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        facebookConnectionId: 138
      })
    });
    
    const setupText = await setupResponse.text();
    console.log('Setup response status:', setupResponse.status);
    console.log('Setup response headers:', Object.fromEntries(setupResponse.headers.entries()));
    
    if (setupResponse.headers.get('content-type')?.includes('application/json')) {
      const setupData = JSON.parse(setupText);
      console.log('✅ Instagram setup result:', setupData);
      
      if (setupData.success) {
        console.log('🎉 Instagram integration successful!');
        console.log(`Connection ID: ${setupData.connectionId}`);
        console.log(`Instagram Username: ${setupData.instagramUsername}`);
        console.log(`Account Type: ${setupData.accountType}`);
        console.log(`Parent Page: ${setupData.parentPage}`);
        
        // Test Instagram posting
        console.log('');
        console.log('🧪 Testing Instagram Posting');
        console.log('============================');
        
        const testPostResponse = await fetch('http://localhost:5000/api/instagram/test-post', {
          method: 'POST',
          headers: {
            'Cookie': 'connect.sid=s%3AKkZCVRY-sfng71ArWbtJsm_2_EwxUTig.TKyugtcLjDTMXTJdncP23%2BsCYu33B4sAFQ%2BodpZ1q6M',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: '🚀 TheAgencyIQ Instagram integration successful! Ready for Queensland small businesses. #InstagramReady #TheAgencyIQ #SocialMediaAutomation'
          })
        });
        
        const testPostText = await testPostResponse.text();
        if (testPostResponse.headers.get('content-type')?.includes('application/json')) {
          const testPostData = JSON.parse(testPostText);
          console.log('✅ Instagram test post result:', testPostData);
        } else {
          console.log('Test post response:', testPostText);
        }
        
      } else {
        console.log('⚠️  Instagram setup issue:', setupData.message);
        if (setupData.error) {
          console.log('Error details:', setupData.error);
        }
      }
    } else {
      console.log('Non-JSON response:', setupText);
    }
    
  } catch (error) {
    console.error('❌ Instagram direct test failed:', error.message);
  }
  
  // Check current platform connections
  console.log('');
  console.log('📊 CURRENT PLATFORM STATUS');
  console.log('==========================');
  
  try {
    const { Pool } = await import('@neondatabase/serverless');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    const result = await pool.query('SELECT id, platform, platform_username, is_active FROM platform_connections WHERE user_id = 2 ORDER BY id DESC');
    
    result.rows.forEach(row => {
      const status = row.is_active ? '✅' : '❌';
      console.log(`${status} ${row.platform.toUpperCase()}: ${row.platform_username} (ID: ${row.id})`);
    });
    
    const activePlatforms = result.rows.filter(r => r.is_active).length;
    console.log('');
    console.log(`Active platforms: ${activePlatforms}/4`);
    
    if (activePlatforms >= 3) {
      console.log('🎯 LAUNCH STATUS: EXCELLENT (3+ platforms)');
    } else if (activePlatforms >= 2) {
      console.log('🎯 LAUNCH STATUS: READY (minimum met)');
    }
    
    await pool.end();
    
  } catch (dbError) {
    console.error('Database check failed:', dbError.message);
  }
}

testInstagramDirect();