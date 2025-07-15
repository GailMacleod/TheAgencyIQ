/**
 * Test Session Cookie Transmission - Verify Set-Cookie Headers
 */

const https = require('https');
const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSessionCookies() {
  console.log('🔍 Testing Session Cookie Transmission');
  console.log('=====================================');
  
  try {
    // Test 1: Session establishment with cookie inspection
    console.log('📋 Test 1: Session establishment with cookie inspection');
    const response = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('✅ Response Status:', response.status);
    console.log('📋 Response Data:', response.data);
    
    // Check for Set-Cookie headers
    const setCookieHeader = response.headers['set-cookie'];
    console.log('🍪 Set-Cookie Header:', setCookieHeader);
    
    if (setCookieHeader) {
      console.log('✅ Set-Cookie header found in response');
      setCookieHeader.forEach((cookie, index) => {
        console.log(`   Cookie ${index + 1}:`, cookie);
      });
    } else {
      console.log('❌ No Set-Cookie header found in response');
    }
    
    // Test 2: Extract session ID and test authenticated request
    if (response.data.sessionId) {
      console.log('\n📋 Test 2: Testing authenticated request with session ID');
      const sessionId = response.data.sessionId;
      console.log('🔑 Session ID:', sessionId);
      
      // Test authenticated request
      const authResponse = await axios.get(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': `theagencyiq.session=${sessionId}`
        }
      });
      
      console.log('✅ Authenticated Request Status:', authResponse.status);
      console.log('📋 User Data:', authResponse.data);
    }
    
    console.log('\n🎉 Session cookie test completed');
    
  } catch (error) {
    console.error('❌ Session cookie test failed:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
      console.error('Response Headers:', error.response.headers);
    }
  }
}

// Run the test
testSessionCookies();