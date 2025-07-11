/**
 * Debug Platform Tokens - Final Analysis
 * Debug what tokens are being passed to DirectPublisher
 */

import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function debugTokensFinal() {
  console.log('🔍 Debug Platform Tokens - Final Analysis...\n');
  
  try {
    // Step 1: Establish session
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
    
    const cookies = sessionResponse.headers['set-cookie'];
    const cookieString = cookies ? cookies.join('; ') : '';
    
    // Step 2: Check current platform tokens
    console.log('\n2. Current platform tokens:');
    const connectionsResponse = await axios.get(`${BASE_URL}/api/platform-connections`, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString
      }
    });
    
    connectionsResponse.data.forEach(conn => {
      console.log(`  ${conn.platform}: ${conn.accessToken.substring(0, 30)}...`);
    });
    
    // Step 3: Test with detailed debugging
    console.log('\n3. Testing with detailed debugging...');
    
    // Test each platform individually
    const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    
    for (const platform of platforms) {
      console.log(`\n--- Testing ${platform} ---`);
      
      const platformResponse = await axios.post(`${BASE_URL}/api/direct-publish`, {
        action: 'test_publish_all',
        content: `DEBUG TEST: ${platform.toUpperCase()} token test`,
        platforms: [platform]
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieString
        }
      });
      
      const result = platformResponse.data.results[platform];
      console.log(`Result: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`Details: ${result.success ? result.platformPostId : result.error}`);
    }
    
    // Step 4: Final comprehensive test
    console.log('\n4. Final comprehensive test...');
    const finalResponse = await axios.post(`${BASE_URL}/api/direct-publish`, {
      action: 'test_publish_all',
      content: 'COMPREHENSIVE TEST: All platforms final check!'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieString
      }
    });
    
    const finalResults = finalResponse.data.results;
    const finalSuccessCount = finalResponse.data.summary.successCount;
    
    console.log(`\n📊 Final Results: ${finalSuccessCount}/5 platforms successful`);
    Object.entries(finalResults).forEach(([platform, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${platform}: ${result.success ? result.platformPostId : 'FAILED'}`);
    });
    
    // Step 5: Mission Assessment
    console.log('\n5. MISSION ASSESSMENT:');
    if (finalSuccessCount === 5) {
      console.log('🎯 CRITICAL MISSION ACCOMPLISHED!');
      console.log('🌟 All 5 platforms are successfully publishing!');
      console.log('🚀 TheAgencyIQ is ready for launch!');
    } else {
      console.log(`🔄 Progress: ${finalSuccessCount}/5 platforms working`);
      console.log('⚠️ Still working toward full success...');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

debugTokensFinal();