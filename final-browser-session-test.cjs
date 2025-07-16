/**
 * FINAL BROWSER SESSION TEST
 * Tests the exact frontend behavior to confirm working session persistence
 */

const axios = require('axios');
const tough = require('tough-cookie');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testFinalBrowserSession() {
  console.log('🔍 FINAL BROWSER SESSION TEST');
  console.log('================================================================================');
  
  // Create a browser-style cookie jar
  const cookieJar = new tough.CookieJar();
  
  // Create client that behaves like a browser
  const client = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin'
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
    // Test 1: Establish session with proper parameters
    console.log('\n🔍 Test 1: Session Establishment');
    
    const establishResponse = await client.post('/api/establish-session', {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    console.log('✅ Session establishment:', establishResponse.status);
    console.log('📋 Session data:', establishResponse.data);
    
    // Check cookies
    const cookies = await cookieJar.getCookies(BASE_URL);
    console.log('🍪 Cookies saved:', cookies.length);
    
    for (const cookie of cookies) {
      console.log(`📝 Cookie: ${cookie.key}=${cookie.value.substring(0, 50)}...`);
    }
    
    // Test 2: Immediate API call
    console.log('\n🔍 Test 2: Immediate API Call');
    
    const apiResponse = await client.get('/api/user');
    console.log('📋 API response:', apiResponse.status);
    
    if (apiResponse.status === 200) {
      console.log('✅ API call successful');
      console.log('👤 User data:', apiResponse.data);
    } else {
      console.log('❌ API call failed');
      console.log('📋 Error:', apiResponse.data);
    }
    
    // Test 3: Multiple endpoints
    console.log('\n🔍 Test 3: Multiple Endpoints');
    
    const endpoints = [
      '/api/user-status',
      '/api/platform-connections'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await client.get(endpoint);
        console.log(`✅ ${endpoint}: ${response.status}`);
        
        if (response.status === 200) {
          console.log(`📋 ${endpoint} data:`, JSON.stringify(response.data).substring(0, 200) + '...');
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ${error.response?.status || 'ERROR'}`);
        console.log(`📋 Error:`, error.response?.data || error.message);
      }
    }
    
    // Test 4: Session persistence after delay
    console.log('\n🔍 Test 4: Session Persistence After Delay');
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const delayedResponse = await client.get('/api/user');
    console.log('📋 Delayed response:', delayedResponse.status);
    
    if (delayedResponse.status === 200) {
      console.log('✅ Session persistence successful');
      console.log('👤 User data:', delayedResponse.data);
    } else {
      console.log('❌ Session persistence failed');
      console.log('📋 Error:', delayedResponse.data);
    }
    
    // Test 5: Browser-style request (without cookie jar)
    console.log('\n🔍 Test 5: Browser-style Request (No Cookie Jar)');
    
    const sessionCookies = await cookieJar.getCookies(BASE_URL);
    const sessionCookie = sessionCookies.find(c => c.key.includes('theagencyiq.session'));
    
    if (sessionCookie) {
      const browserResponse = await axios.get(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': `${sessionCookie.key}=${sessionCookie.value}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
        },
        withCredentials: true
      });
      
      console.log('📋 Browser-style response:', browserResponse.status);
      
      if (browserResponse.status === 200) {
        console.log('✅ Browser-style request successful');
        console.log('👤 User data:', browserResponse.data);
      } else {
        console.log('❌ Browser-style request failed');
        console.log('📋 Error:', browserResponse.data);
      }
    }
    
    console.log('\n📊 FINAL BROWSER SESSION TEST COMPLETE');
    console.log('================================================================================');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('📋 Error response:', error.response.status, error.response.data);
    }
  }
}

// Run the test
testFinalBrowserSession().catch(console.error);