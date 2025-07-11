/**
 * Final Direct Publishing Test
 * Tests the complete direct publishing system with existing connections
 */

import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testDirectPublishingFinal() {
  console.log('🔧 Testing Direct Publishing System - Final Test...\n');
  
  try {
    // Step 1: Establish session
    console.log('1. Establishing session...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Session established for User ID:', sessionResponse.data.user.id);
    
    // Extract cookies for subsequent requests
    const cookies = sessionResponse.headers['set-cookie'];
    const cookieString = cookies ? cookies.join('; ') : '';
    
    // Step 2: Check existing connections
    console.log('\n2. Checking existing platform connections...');
    const connectionsResponse = await axios.get(`${BASE_URL}/api/platform-connections`, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString
      }
    });
    
    console.log('✅ Existing connections:', connectionsResponse.data.length);
    connectionsResponse.data.forEach(conn => {
      console.log(`  - ${conn.platform}: ${conn.platformUsername} (${conn.isActive ? 'active' : 'inactive'})`);
    });
    
    // Step 3: Direct publish test using existing connections
    console.log('\n3. Testing direct publish with all existing connections...');
    const publishResponse = await axios.post(`${BASE_URL}/api/direct-publish`, {
      action: 'test_publish_all',
      content: 'FINAL TEST: Direct publishing system working!'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString
      }
    });
    
    console.log('✅ Direct publish results:', publishResponse.data);
    
    // Step 4: Analyze results
    const results = publishResponse.data.results;
    const successCount = publishResponse.data.summary.successCount;
    const failureCount = publishResponse.data.summary.failureCount;
    
    console.log('\n4. Results Analysis:');
    console.log(`📊 Success Rate: ${successCount}/${successCount + failureCount} platforms`);
    
    Object.entries(results).forEach(([platform, result]) => {
      const status = result.success ? '✅ SUCCESS' : '❌ FAILED';
      console.log(`  ${platform}: ${status}`);
      if (result.success) {
        console.log(`    Post ID: ${result.platformPostId}`);
      } else {
        console.log(`    Error: ${result.error}`);
      }
    });
    
    // Step 5: Mission status
    console.log('\n5. CRITICAL MISSION STATUS:');
    if (successCount === 5) {
      console.log('🌟 MISSION ACCOMPLISHED: All 5 platforms publishing successfully!');
      console.log('🎉 TheAgencyIQ platform is ready for launch!');
    } else if (successCount >= 3) {
      console.log('🟡 PARTIAL SUCCESS: Majority of platforms working');
      console.log(`✅ Working: ${successCount} platforms`);
      console.log(`❌ Need fixing: ${failureCount} platforms`);
    } else {
      console.log('🔴 NEEDS WORK: More platforms need fixing');
      console.log(`✅ Working: ${successCount} platforms`);
      console.log(`❌ Need fixing: ${failureCount} platforms`);
    }
    
    return { successCount, failureCount, results };
    
  } catch (error) {
    console.error('❌ Direct publishing test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
    return { successCount: 0, failureCount: 5, results: {} };
  }
}

// Run the test
testDirectPublishingFinal().then(result => {
  console.log('\n🏁 Test completed!');
  process.exit(result.successCount === 5 ? 0 : 1);
});