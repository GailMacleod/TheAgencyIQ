/**
 * Test Cookie Flow - Verify Set-Cookie header and cookie transmission
 */

const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testCookieFlow() {
  console.log('🧪 TESTING COOKIE FLOW');
  
  // Create axios instance with cookie jar support
  const jar = new CookieJar();
  const client = wrapper(axios.create({ jar }));
  
  try {
    // Step 1: Test session establishment
    console.log('\n🔍 Step 1: Session Establishment');
    const response = await client.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });
    
    console.log('✅ Session establishment response:', response.status);
    console.log('📋 User ID:', response.data.user?.id);
    console.log('📋 Session ID:', response.data.sessionId);
    
    // Check Set-Cookie header
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      console.log('✅ Set-Cookie header found:', setCookieHeader);
    } else {
      console.log('❌ No Set-Cookie header found');
    }
    
    // Step 2: Test API call with cookie
    console.log('\n🔍 Step 2: API Call with Cookie');
    const apiResponse = await client.get(`${BASE_URL}/api/user`, {
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true
    });
    
    console.log('✅ API call response:', apiResponse.status);
    console.log('📋 User email:', apiResponse.data.email);
    console.log('📋 User ID:', apiResponse.data.id);
    
    console.log('\n🎉 COOKIE FLOW TEST PASSED');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.status, error.response?.data);
    if (error.response?.status === 401) {
      console.log('❌ 401 Error: Cookie not being transmitted properly');
    }
  }
}

testCookieFlow();