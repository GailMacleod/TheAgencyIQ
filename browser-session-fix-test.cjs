/**
 * BROWSER SESSION FIX TEST
 * Tests the exact frontend session flow to identify the cookie transmission issue
 */

const axios = require('axios');
const { parse } = require('cookie');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testBrowserSessionFlow() {
  console.log('🔍 BROWSER SESSION FIX TEST - Simulating Frontend Behavior');
  console.log('================================================================================');
  
  try {
    // Step 1: Establish session like the frontend does
    console.log('\n🔍 Step 1: Establish Session (Frontend Style)');
    
    const establishResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true,
      validateStatus: () => true
    });
    
    console.log('✅ Session establishment response:', establishResponse.status);
    console.log('📋 Session data:', establishResponse.data);
    
    // Extract cookies from response
    const cookies = establishResponse.headers['set-cookie'];
    console.log('🍪 Set-Cookie headers:', cookies?.length || 0);
    
    let sessionCookie = null;
    if (cookies) {
      // Find the session cookie
      for (const cookieHeader of cookies) {
        if (cookieHeader.includes('theagencyiq.session=')) {
          // Extract the cookie value
          const cookieValue = cookieHeader.split(';')[0];
          sessionCookie = cookieValue;
          console.log('📝 Found session cookie:', cookieValue);
          break;
        }
      }
    }
    
    if (!sessionCookie) {
      console.log('❌ No session cookie found in response');
      return;
    }
    
    // Step 2: Test API call with extracted cookie (like frontend should do)
    console.log('\n🔍 Step 2: Test API Call with Cookie');
    
    const apiResponse = await axios.get(`${BASE_URL}/api/user`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': sessionCookie
      },
      withCredentials: true,
      validateStatus: () => true
    });
    
    console.log('📋 API response status:', apiResponse.status);
    
    if (apiResponse.status === 200) {
      console.log('✅ API call successful with cookie');
      console.log('👤 User data:', apiResponse.data);
    } else {
      console.log('❌ API call failed:', apiResponse.status);
      console.log('📋 Error response:', apiResponse.data);
    }
    
    // Step 3: Test with credentials: 'include' (browser default)
    console.log('\n🔍 Step 3: Test with credentials: include (Browser Default)');
    
    const browserResponse = await axios.get(`${BASE_URL}/api/user`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true,
      validateStatus: () => true
    });
    
    console.log('📋 Browser-style response status:', browserResponse.status);
    
    if (browserResponse.status === 200) {
      console.log('✅ Browser-style call successful');
      console.log('👤 User data:', browserResponse.data);
    } else {
      console.log('❌ Browser-style call failed:', browserResponse.status);
      console.log('📋 Error response:', browserResponse.data);
    }
    
    // Step 4: Test session persistence with cookie jar
    console.log('\n🔍 Step 4: Test Session Persistence with Cookie Jar');
    
    const cookieJar = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // First establish session with cookie jar
    const jarEstablish = await cookieJar.post('/api/establish-session', {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      validateStatus: () => true
    });
    
    console.log('📋 Cookie jar establishment:', jarEstablish.status);
    
    // Then test API call with same cookie jar
    const jarApi = await cookieJar.get('/api/user', {
      validateStatus: () => true
    });
    
    console.log('📋 Cookie jar API call:', jarApi.status);
    
    if (jarApi.status === 200) {
      console.log('✅ Cookie jar persistence working');
      console.log('👤 User data:', jarApi.data);
    } else {
      console.log('❌ Cookie jar persistence failed');
      console.log('📋 Error response:', jarApi.data);
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

// Run the test
testBrowserSessionFlow().catch(console.error);