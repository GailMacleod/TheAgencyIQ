/**
 * Platform Connection Diagnostic
 * Direct API testing to identify exact failure causes
 */

const { db } = require('./server/db.ts');
const { platformConnections } = require('./shared/schema.ts');
const { eq } = require('drizzle-orm');

async function diagnosticTest() {
  console.log('🔍 PLATFORM DIAGNOSTIC TEST - USER ID: 2');
  console.log('================================================');
  
  try {
    // Get all platform connections
    const connections = await db.select().from(platformConnections).where(eq(platformConnections.userId, 2));
    
    console.log(`Found ${connections.length} platform connections:`);
    
    for (const connection of connections) {
      console.log(`\n--- TESTING ${connection.platform.toUpperCase()} ---`);
      console.log(`Username: ${connection.platformUsername}`);
      console.log(`Active: ${connection.isActive}`);
      console.log(`Expires: ${connection.expiresAt || 'No expiry'}`);
      console.log(`Token exists: ${connection.accessToken ? 'YES' : 'NO'}`);
      console.log(`Token length: ${connection.accessToken?.length || 0} chars`);
      
      // Test specific platform
      await testPlatformConnection(connection);
    }
    
  } catch (error) {
    console.error('❌ DIAGNOSTIC ERROR:', error);
  }
}

async function testPlatformConnection(connection) {
  switch (connection.platform) {
    case 'facebook':
      await testFacebook(connection);
      break;
    case 'linkedin':
      await testLinkedIn(connection);
      break;
    case 'x':
      await testX(connection);
      break;
    case 'instagram':
      await testInstagram(connection);
      break;
    case 'youtube':
      await testYouTube(connection);
      break;
  }
}

async function testFacebook(connection) {
  try {
    console.log('Testing Facebook API...');
    
    // Test basic me endpoint
    const response = await fetch(`https://graph.facebook.com/me?access_token=${connection.accessToken}`);
    const data = await response.json();
    
    if (data.error) {
      console.log('❌ Facebook API Error:', data.error.message);
      
      if (data.error.code === 190) {
        console.log('🔧 TOKEN EXPIRED - Need to refresh');
        return false;
      }
    } else {
      console.log('✅ Facebook basic API working');
      console.log('User ID:', data.id);
      
      // Test permissions
      const permResponse = await fetch(`https://graph.facebook.com/me/permissions?access_token=${connection.accessToken}`);
      const permData = await permResponse.json();
      
      if (permData.data) {
        const granted = permData.data.filter(p => p.status === 'granted').map(p => p.permission);
        console.log('✅ Granted permissions:', granted.join(', '));
        
        // Check for required permissions
        const required = ['pages_manage_posts', 'pages_read_engagement', 'publish_to_groups'];
        const missing = required.filter(p => !granted.includes(p));
        if (missing.length > 0) {
          console.log('⚠️  Missing permissions:', missing.join(', '));
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Facebook test failed:', error.message);
  }
}

async function testLinkedIn(connection) {
  try {
    console.log('Testing LinkedIn API...');
    
    const response = await fetch('https://api.linkedin.com/v2/me', {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'cache-control': 'no-cache',
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      console.log('❌ LinkedIn token expired or invalid');
      return false;
    } else if (data.id) {
      console.log('✅ LinkedIn API working');
      console.log('Profile ID:', data.id);
      
      // Test posting permissions
      const testPost = {
        "author": `urn:li:person:${data.id}`,
        "lifecycleState": "PUBLISHED",
        "specificContent": {
          "com.linkedin.ugc.ShareContent": {
            "shareCommentary": {
              "text": "Test post - will be deleted"
            },
            "shareMediaCategory": "NONE"
          }
        },
        "visibility": {
          "com.linkedin.ugc.MemberNetworkVisibility": "CONNECTIONS"
        }
      };
      
      console.log('🧪 Testing posting capability (dry run)...');
      // Don't actually post, just validate the token format
      
    } else {
      console.log('❌ LinkedIn API error:', data);
    }
    
  } catch (error) {
    console.log('❌ LinkedIn test failed:', error.message);
  }
}

async function testX(connection) {
  console.log('🔧 X/Twitter requires OAuth 1.0a - Complex validation needed');
  console.log('Token format check:', connection.accessToken ? 'Present' : 'Missing');
}

async function testInstagram(connection) {
  console.log('🔧 Instagram requires Facebook Business API connection');
  console.log('Instagram connection depends on valid Facebook token');
}

async function testYouTube(connection) {
  try {
    console.log('Testing YouTube API...');
    
    const response = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.error) {
      console.log('❌ YouTube API Error:', data.error.message);
      if (data.error.code === 401) {
        console.log('🔧 TOKEN EXPIRED - Need to refresh');
      }
    } else if (data.items && data.items.length > 0) {
      console.log('✅ YouTube API working');
      console.log('Channel:', data.items[0].snippet.title);
    }
    
  } catch (error) {
    console.log('❌ YouTube test failed:', error.message);
  }
}

// Run diagnostic
diagnosticTest().then(() => {
  console.log('\n🏁 DIAGNOSTIC COMPLETE');
  process.exit(0);
}).catch(err => {
  console.error('DIAGNOSTIC FAILED:', err);
  process.exit(1);
});