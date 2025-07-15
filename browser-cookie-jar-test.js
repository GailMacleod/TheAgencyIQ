/**
 * Browser Cookie Jar Test - Test with proper cookie persistence
 */
import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testBrowserCookieJar() {
  console.log('🧪 BROWSER COOKIE JAR TEST');
  console.log('Target:', BASE_URL);
  console.log('Time:', new Date().toISOString());
  console.log('');

  try {
    // Create axios instance with cookie jar support
    const cookieJar = new CookieJar();
    const client = wrapper(axios.create({
      jar: cookieJar,
      withCredentials: true,
      timeout: 10000
    }));

    // Step 1: Establish session
    console.log('🔍 Step 1: Establishing session with cookie jar...');
    const sessionResponse = await client.post(`${BASE_URL}/api/establish-session`, {}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Session established:', sessionResponse.data.sessionId);
    
    // Check cookies in jar
    const cookies = await cookieJar.getCookies(BASE_URL);
    console.log('📋 Cookies in jar:', cookies.map(c => `${c.key}=${c.value}`));
    
    // Step 2: Try API call with cookie jar
    console.log('');
    console.log('🔍 Step 2: Testing API call with cookie jar...');
    
    const userResponse = await client.get(`${BASE_URL}/api/user`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API call successful:', userResponse.data);
    
    // Step 3: Test multiple API calls
    console.log('');
    console.log('🔍 Step 3: Testing multiple API calls...');
    
    const userStatusResponse = await client.get(`${BASE_URL}/api/user-status`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ User status successful:', userStatusResponse.data);
    
    const platformResponse = await client.get(`${BASE_URL}/api/platform-connections`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Platform connections successful:', platformResponse.data);
    
    console.log('');
    console.log('🎉 Cookie jar test completed successfully!');
    
    return true;
    
  } catch (error) {
    console.error('❌ Cookie jar test failed:', error.response?.status, error.response?.data);
    return false;
  }
}

testBrowserCookieJar().then(success => {
  if (success) {
    console.log('✅ SOLUTION CONFIRMED: Cookie jar approach works');
  } else {
    console.log('❌ SOLUTION FAILED: Cookie jar approach failed');
  }
});