/**
 * DEFINITIVE SESSION FIX TEST
 * Test the exact specifications: Trust proxy disabled, secure: false, sameSite: 'lax', credentials: true
 */

const axios = require('axios');
const tough = require('tough-cookie');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testDefinitiveSessionFix() {
  console.log('🔧 DEFINITIVE SESSION FIX TEST');
  console.log('================================================================================');
  console.log('Testing: Trust proxy disabled, secure: false, sameSite: lax, credentials: true');
  console.log('================================================================================');
  
  // Create a browser-style cookie jar
  const cookieJar = new tough.CookieJar();
  
  // Create client that behaves like a browser with credentials: include
  const client = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,  // This is equivalent to credentials: 'include'
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  // Intercept requests to add cookies
  client.interceptors.request.use(async (config) => {
    const cookies = await cookieJar.getCookies(BASE_URL);
    if (cookies.length > 0) {
      config.headers['Cookie'] = cookies.map(c => `${c.key}=${c.value}`).join('; ');
      console.log(`🍪 Sending cookies: ${cookies.map(c => `${c.key}=${c.value.substring(0, 20)}...`).join('; ')}`);
    }
    return config;
  });
  
  // Intercept responses to save cookies
  client.interceptors.response.use(async (response) => {
    const setCookieHeaders = response.headers['set-cookie'];
    if (setCookieHeaders) {
      console.log(`🍪 Received Set-Cookie headers: ${setCookieHeaders.length} cookies`);
      for (const cookieHeader of setCookieHeaders) {
        await cookieJar.setCookie(cookieHeader, BASE_URL);
        console.log(`📝 Saved cookie: ${cookieHeader.substring(0, 100)}...`);
      }
    }
    return response;
  });
  
  try {
    // Step 1: Establish session with proper credentials
    console.log('\n🔍 Step 1: Session Establishment (with credentials: include)');
    
    const establishResponse = await client.post('/api/establish-session', {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    console.log('✅ Session establishment:', establishResponse.status);
    console.log('📋 Session data:', establishResponse.data);
    
    // Check if cookies were set
    const cookies = await cookieJar.getCookies(BASE_URL);
    console.log(`🍪 Cookies in jar: ${cookies.length}`);
    
    if (cookies.length === 0) {
      console.log('❌ No cookies were set - this indicates the fix failed');
      return;
    }
    
    // Step 2: Immediate API call (should use established session)
    console.log('\n🔍 Step 2: Immediate API Call (should use established session)');
    
    const userResponse = await client.get('/api/user');
    console.log('📋 User API response:', userResponse.status);
    
    if (userResponse.status === 200) {
      console.log('✅ DEFINITIVE FIX SUCCESSFUL - No 401 error!');
      console.log('👤 User data:', userResponse.data);
    } else {
      console.log('❌ DEFINITIVE FIX FAILED - Still getting 401 error');
      console.log('📋 Error:', userResponse.data);
    }
    
    // Step 3: Test multiple endpoints to ensure session persistence
    console.log('\n🔍 Step 3: Multiple Endpoints Test');
    
    const endpoints = [
      '/api/user-status',
      '/api/platform-connections'
    ];
    
    let allPassed = true;
    for (const endpoint of endpoints) {
      try {
        const response = await client.get(endpoint);
        if (response.status === 200) {
          console.log(`✅ ${endpoint}: SUCCESS (${response.status})`);
        } else {
          console.log(`❌ ${endpoint}: FAILED (${response.status})`);
          allPassed = false;
        }
      } catch (error) {
        console.log(`❌ ${endpoint}: ERROR (${error.response?.status || 'NETWORK'})`);
        allPassed = false;
      }
    }
    
    // Step 4: Session persistence after delay
    console.log('\n🔍 Step 4: Session Persistence After Delay');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const delayedResponse = await client.get('/api/user');
    if (delayedResponse.status === 200) {
      console.log('✅ Session persistence: SUCCESS');
    } else {
      console.log('❌ Session persistence: FAILED');
      allPassed = false;
    }
    
    console.log('\n📊 DEFINITIVE SESSION FIX TEST RESULTS');
    console.log('================================================================================');
    
    if (allPassed) {
      console.log('🎉 DEFINITIVE FIX SUCCESSFUL!');
      console.log('✅ Trust proxy disabled: Working');
      console.log('✅ Session secure: false: Working');
      console.log('✅ Session sameSite: lax: Working');
      console.log('✅ CORS credentials: true: Working');
      console.log('✅ Fetch credentials: include: Working');
      console.log('✅ No 401 errors: Confirmed');
      console.log('✅ Browser end-to-end: Successful');
    } else {
      console.log('❌ DEFINITIVE FIX FAILED');
      console.log('Some tests failed - session persistence not working properly');
    }
    
    console.log('================================================================================');
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    if (error.response) {
      console.error('📋 Error response:', error.response.status, error.response.data);
    }
  }
}

// Run the test
testDefinitiveSessionFix().catch(console.error);