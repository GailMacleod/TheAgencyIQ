/**
 * Test Platform Publishing - ONLY using stored OAuth connections
 * NO fallback credentials - Security First
 */

const axios = require('axios');

async function testPlatformPublishing() {
  console.log('🚀 Testing Real API Publishing - ONLY stored OAuth connections');
  
  try {
    // Test the /api/direct-publish endpoint
    const testContent = `TEST POST ${new Date().toISOString()} - Real API Publishing Test`;
    
    const response = await axios.post('http://localhost:5000/api/direct-publish', {
      action: 'publish_all',
      content: testContent
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'theagencyiq.session=test_session'
      }
    });
    
    console.log('📊 Publishing Test Results:');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.results) {
      response.data.results.forEach(result => {
        console.log(`${result.platform}: ${result.success ? '✅' : '❌'} ${result.platformPostId || result.error}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Test stored connections
async function testStoredConnections() {
  console.log('\n🔍 Testing stored platform connections...');
  
  try {
    const response = await axios.get('http://localhost:5000/api/platform-connections', {
      headers: {
        'Cookie': 'theagencyiq.session=test_session'
      }
    });
    
    console.log('📋 Stored connections:');
    if (response.data && response.data.length > 0) {
      response.data.forEach(conn => {
        console.log(`${conn.platform}: ${conn.isActive ? '✅ Active' : '❌ Inactive'} (${conn.username})`);
      });
    } else {
      console.log('❌ No stored connections found');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.response?.data || error.message);
  }
}

// Run tests
testStoredConnections().then(() => testPlatformPublishing());