/**
 * COMPREHENSIVE BROWSER SESSION FIX
 * Creates a cookie jar that works exactly like a browser
 */

const axios = require('axios');
const tough = require('tough-cookie');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testComprehensiveBrowserSession() {
  console.log('🔍 COMPREHENSIVE BROWSER SESSION FIX TEST');
  console.log('================================================================================');
  
  // Create a cookie jar that works exactly like a browser
  const cookieJar = new tough.CookieJar();
  
  // Create an axios instance with cookie jar simulation
  const client = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Browser Test)'
    }
  });
  
  // Intercept requests to add cookies
  client.interceptors.request.use(async (config) => {
    const cookies = await cookieJar.getCookies(BASE_URL);
    if (cookies.length > 0) {
      config.headers['Cookie'] = cookies.map(c => `${c.key}=${c.value}`).join('; ');
    }
    return config;
  });
  
  // Intercept responses to save cookies
  client.interceptors.response.use(async (response) => {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      for (const cookieHeader of setCookieHeaders) {
        await cookieJar.setCookie(cookieHeader, BASE_URL);
      }
    }
    return response;
  });
  
  try {
    // Step 1: Establish session
    console.log('\n🔍 Step 1: Establish Session with Cookie Jar');
    
    const establishResponse = await client.post('/api/establish-session', {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    console.log('✅ Session establishment:', establishResponse.status);
    console.log('📋 Session data:', establishResponse.data);
    
    // Check cookies in jar
    const cookies = await cookieJar.getCookies(BASE_URL);
    console.log('🍪 Cookies in jar:', cookies.length);
    
    for (const cookie of cookies) {
      console.log(`📝 Cookie: ${cookie.key}=${cookie.value}`);
    }
    
    // Step 2: Test immediate API call
    console.log('\n🔍 Step 2: Test Immediate API Call');
    
    const apiResponse = await client.get('/api/user');
    
    console.log('📋 API response status:', apiResponse.status);
    
    if (apiResponse.status === 200) {
      console.log('✅ API call successful');
      console.log('👤 User data:', apiResponse.data);
    } else {
      console.log('❌ API call failed');
      console.log('📋 Error:', apiResponse.data);
    }
    
    // Step 3: Test with manual cookie transmission
    console.log('\n🔍 Step 3: Test Manual Cookie Transmission');
    
    const sessionCookies = await cookieJar.getCookies(BASE_URL);
    const sessionCookie = sessionCookies.find(c => c.key.includes('theagencyiq.session'));
    
    if (sessionCookie) {
      console.log('📝 Using session cookie:', `${sessionCookie.key}=${sessionCookie.value}`);
      
      const manualResponse = await axios.get(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': `${sessionCookie.key}=${sessionCookie.value}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('📋 Manual response status:', manualResponse.status);
      
      if (manualResponse.status === 200) {
        console.log('✅ Manual cookie transmission successful');
        console.log('👤 User data:', manualResponse.data);
      } else {
        console.log('❌ Manual cookie transmission failed');
        console.log('📋 Error:', manualResponse.data);
      }
    }
    
    // Step 4: Test session persistence after delay
    console.log('\n🔍 Step 4: Test Session Persistence After Delay');
    
    // Wait 2 seconds
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const delayedResponse = await client.get('/api/user');
    
    console.log('📋 Delayed response status:', delayedResponse.status);
    
    if (delayedResponse.status === 200) {
      console.log('✅ Session persistence successful');
      console.log('👤 User data:', delayedResponse.data);
    } else {
      console.log('❌ Session persistence failed');
      console.log('📋 Error:', delayedResponse.data);
    }
    
    // Step 5: Test with different endpoints
    console.log('\n🔍 Step 5: Test Different Endpoints');
    
    const endpoints = ['/api/user-status', '/api/platform-connections'];
    
    for (const endpoint of endpoints) {
      try {
        const response = await client.get(endpoint);
        console.log(`✅ ${endpoint}: ${response.status}`);
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || 'ERROR'}`);
      }
    }
    
    console.log('\n📊 COMPREHENSIVE BROWSER SESSION FIX TEST COMPLETE');
    console.log('================================================================================');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('📋 Error response:', error.response.status, error.response.data);
    }
  }
}

// Run the test
testComprehensiveBrowserSession().catch(console.error);