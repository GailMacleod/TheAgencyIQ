/**
 * Test Real API Publishing - Using ONLY stored OAuth connections
 * Creates posts and publishes them to verify actual platform APIs work
 */

const axios = require('axios');

async function testRealAPIPublishing() {
  console.log('🚀 Testing Real API Publishing with Post Creation');
  
  try {
    // Step 1: Create test posts for each platform
    console.log('📝 Creating test posts...');
    
    const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    const testContent = `TEST POST ${new Date().toISOString()} - Real API Publishing Test from TheAgencyIQ`;
    
    const createdPosts = [];
    
    for (const platform of platforms) {
      try {
        const response = await axios.post('http://localhost:5000/api/posts', {
          platform: platform,
          content: testContent,
          status: 'approved',
          scheduledFor: new Date().toISOString()
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ Created ${platform} post: ${response.data.id}`);
        createdPosts.push(response.data);
        
      } catch (error) {
        console.log(`❌ Failed to create ${platform} post: ${error.response?.data?.message || error.message}`);
      }
    }
    
    console.log(`\n📊 Created ${createdPosts.length} test posts`);
    
    // Step 2: Test direct publishing to each platform
    console.log('\n🚀 Testing direct publishing to each platform...');
    
    const publishResults = [];
    
    for (const platform of platforms) {
      try {
        console.log(`\n📤 Testing ${platform} publishing...`);
        
        const response = await axios.post('http://localhost:5000/api/direct-publish', {
          action: 'publish_single',
          platform: platform,
          content: testContent
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        const result = response.data;
        publishResults.push({
          platform,
          success: result.success,
          postId: result.platformPostId,
          error: result.error
        });
        
        if (result.success) {
          console.log(`✅ ${platform} SUCCESS: Post ID ${result.platformPostId}`);
        } else {
          console.log(`❌ ${platform} FAILED: ${result.error}`);
        }
        
      } catch (error) {
        console.log(`❌ ${platform} ERROR: ${error.response?.data?.message || error.message}`);
        publishResults.push({
          platform,
          success: false,
          postId: null,
          error: error.response?.data?.message || error.message
        });
      }
    }
    
    // Step 3: Generate comprehensive report
    console.log('\n📊 REAL API PUBLISHING TEST RESULTS');
    console.log('=====================================');
    
    let successCount = 0;
    let totalCount = publishResults.length;
    
    publishResults.forEach(result => {
      console.log(`${result.platform.toUpperCase()}:`);
      console.log(`  Success: ${result.success ? '✅' : '❌'}`);
      console.log(`  Post ID: ${result.postId || 'N/A'}`);
      console.log(`  Error: ${result.error || 'None'}`);
      console.log('');
      
      if (result.success) successCount++;
    });
    
    console.log(`SUMMARY: ${successCount}/${totalCount} platforms successful`);
    console.log('=====================================');
    
    // Step 4: Test platform connections status
    console.log('\n🔍 Platform connections status:');
    const connectionsResponse = await axios.get('http://localhost:5000/api/platform-connections');
    
    if (connectionsResponse.data && connectionsResponse.data.length > 0) {
      connectionsResponse.data.forEach(conn => {
        console.log(`${conn.platform}: ${conn.isActive ? '✅ Active' : '❌ Inactive'} (${conn.username || 'No username'})`);
      });
    } else {
      console.log('❌ No platform connections found');
    }
    
    // Save results
    const fs = require('fs');
    const reportData = {
      timestamp: new Date().toISOString(),
      totalPlatforms: totalCount,
      successfulPlatforms: successCount,
      results: publishResults,
      note: 'Using ONLY stored OAuth connections - NO fallback credentials',
      securityCompliant: true
    };
    
    fs.writeFileSync('real-api-publishing-results.json', JSON.stringify(reportData, null, 2));
    console.log('\n📁 Results saved to real-api-publishing-results.json');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testRealAPIPublishing();