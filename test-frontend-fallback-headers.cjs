/**
 * Test Frontend Fallback Headers System
 * Simulate browser environment to test the fallback header authentication
 */

const axios = require('axios');
const tough = require('tough-cookie');

const BASE_URL = 'http://localhost:5000';
const cookieJar = new tough.CookieJar();

async function testFrontendFallbackHeaders() {
  console.log('🔍 Testing frontend fallback headers system...');
  
  try {
    // Step 1: Establish session
    console.log('\n🔗 Step 1: Establishing session...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    });

    console.log('📋 Session Response Status:', sessionResponse.status);
    console.log('📋 Session Response Data:', sessionResponse.data);

    // Extract session information
    const sessionId = sessionResponse.data.sessionId;
    const userId = sessionResponse.data.user.id;
    const userEmail = sessionResponse.data.user.email;

    console.log(`📋 Session ID: ${sessionId}`);
    console.log(`📋 User ID: ${userId}`);
    console.log(`📋 User Email: ${userEmail}`);

    // Step 2: Test API call with fallback headers (simulating browser localStorage)
    console.log('\n🔒 Step 2: Testing API call with fallback headers...');
    
    const userResponse = await axios.get(`${BASE_URL}/api/user`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Session-ID': sessionId,
        'X-User-ID': userId.toString(),
        'X-User-Email': userEmail
      },
      withCredentials: true
    });

    console.log('📋 User Response Status:', userResponse.status);
    console.log('📋 User Response Data:', userResponse.data);

    // Step 3: Test multiple endpoints with fallback headers
    console.log('\n🔄 Step 3: Testing multiple endpoints with fallback headers...');
    
    const statusResponse = await axios.get(`${BASE_URL}/api/user-status`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Session-ID': sessionId,
        'X-User-ID': userId.toString(),
        'X-User-Email': userEmail
      },
      withCredentials: true
    });

    console.log('📋 Status Response Status:', statusResponse.status);
    console.log('📋 Status Response Data:', statusResponse.data);

    // Step 4: Test platform connections with fallback headers
    console.log('\n🔗 Step 4: Testing platform connections with fallback headers...');
    
    const platformResponse = await axios.get(`${BASE_URL}/api/platform-connections`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Session-ID': sessionId,
        'X-User-ID': userId.toString(),
        'X-User-Email': userEmail
      },
      withCredentials: true
    });

    console.log('📋 Platform Response Status:', platformResponse.status);
    console.log('📋 Platform Response Data:', platformResponse.data);

    console.log('\n✅ Frontend fallback headers test completed successfully!');
    console.log('🔑 All requests succeeded with fallback session headers');
    console.log('🎯 Browser authentication should now work correctly');

  } catch (error) {
    console.error('❌ Frontend fallback headers test failed:', error.message);
    if (error.response) {
      console.error('📋 Error Response Status:', error.response.status);
      console.error('📋 Error Response Data:', error.response.data);
    }
  }
}

testFrontendFallbackHeaders();