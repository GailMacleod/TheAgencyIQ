/**
 * COMPREHENSIVE SESSION PERSISTENCE TEST
 * Tests the exact specifications provided by the user
 */

const axios = require('axios');
const tough = require('tough-cookie');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSessionPersistence() {
  console.log('🔍 COMPREHENSIVE SESSION PERSISTENCE TEST');
  console.log('=========================================');
  
  try {
    // Create axios instance with cookie jar support
    const cookieJar = new tough.CookieJar();
    
    // Configure axios to use cookie jar
    const axiosInstance = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }
    });
    
    // Add interceptor to handle cookies manually
    axiosInstance.interceptors.request.use(async (config) => {
      const cookies = await cookieJar.getCookieString(config.baseURL + config.url);
      if (cookies) {
        config.headers.Cookie = cookies;
      }
      return config;
    });
    
    axiosInstance.interceptors.response.use(async (response) => {
      if (response.headers['set-cookie']) {
        for (const cookie of response.headers['set-cookie']) {
          await cookieJar.setCookie(cookie, response.config.baseURL + response.config.url);
        }
      }
      return response;
    });

    // Step 1: Establish session
    console.log('\n1. 🔐 Establishing session...');
    const sessionResponse = await axiosInstance.post('/api/establish-session', {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    console.log('✅ Session establishment response:', sessionResponse.status);
    console.log('📋 Session data:', sessionResponse.data);
    
    // Check cookies from response
    const setCookieHeader = sessionResponse.headers['set-cookie'];
    console.log('🍪 Set-Cookie headers:', setCookieHeader);
    
    if (setCookieHeader) {
      setCookieHeader.forEach(cookie => {
        console.log('🔧 Cookie:', cookie);
      });
    } else {
      console.log('⚠️ No Set-Cookie headers found in response');
    }

    // Step 2: Test immediate API call
    console.log('\n2. 🔍 Testing immediate API call...');
    try {
      const userResponse = await axiosInstance.get('/api/user');
      console.log('✅ User endpoint response:', userResponse.status);
      console.log('📋 User data:', userResponse.data);
    } catch (error) {
      console.log('❌ User endpoint failed:', error.response?.status, error.response?.data);
    }

    // Step 3: Test /api/user-status
    console.log('\n3. 📊 Testing user-status endpoint...');
    try {
      const statusResponse = await axiosInstance.get('/api/user-status');
      console.log('✅ User-status endpoint response:', statusResponse.status);
      console.log('📋 Status data:', statusResponse.data);
    } catch (error) {
      console.log('❌ User-status endpoint failed:', error.response?.status, error.response?.data);
    }

    // Step 4: Test /api/platform-connections
    console.log('\n4. 🔗 Testing platform-connections endpoint...');
    try {
      const connectionsResponse = await axiosInstance.get('/api/platform-connections');
      console.log('✅ Platform-connections endpoint response:', connectionsResponse.status);
      console.log('📋 Connections data:', connectionsResponse.data);
    } catch (error) {
      console.log('❌ Platform-connections endpoint failed:', error.response?.status, error.response?.data);
    }

    // Step 5: Simulate delay and test persistence
    console.log('\n5. ⏱️ Waiting 2 seconds and testing persistence...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const delayedResponse = await axiosInstance.get('/api/user');
      console.log('✅ Delayed user endpoint response:', delayedResponse.status);
      console.log('📋 Delayed user data:', delayedResponse.data);
    } catch (error) {
      console.log('❌ Delayed user endpoint failed:', error.response?.status, error.response?.data);
    }

    console.log('\n6. 🔍 Final cookie jar state:');
    console.log('📋 Cookies in jar:', cookieJar.toJSON());

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('📋 Error response:', error.response.status, error.response.data);
    }
  }
}

testSessionPersistence().catch(console.error);