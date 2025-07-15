/**
 * Browser Cookie Test - Check if cookies are being properly transmitted
 */
import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testBrowserCookies() {
  console.log('🧪 BROWSER COOKIE TEST');
  console.log('Target:', BASE_URL);
  console.log('Time:', new Date().toISOString());
  console.log('');

  try {
    // Step 1: Establish session
    console.log('🔍 Step 1: Establishing session...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Session established:', sessionResponse.data.sessionId);
    
    // Extract cookies from response
    const cookies = sessionResponse.headers['set-cookie'];
    console.log('📋 Received cookies:', cookies);
    
    // Step 2: Try API call with cookies
    console.log('');
    console.log('🔍 Step 2: Testing API call with cookies...');
    
    const cookieHeader = cookies ? cookies.join('; ') : '';
    
    const userResponse = await axios.get(`${BASE_URL}/api/user`, {
      withCredentials: true,
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API call successful:', userResponse.data);
    
    // Step 3: Test without explicit cookie header (browser simulation)
    console.log('');
    console.log('🔍 Step 3: Testing without explicit cookie header...');
    
    try {
      const browserResponse = await axios.get(`${BASE_URL}/api/user`, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Browser simulation successful:', browserResponse.data);
    } catch (error) {
      console.log('❌ Browser simulation failed:', error.response?.status, error.response?.data);
    }
    
    console.log('');
    console.log('🎉 Cookie test completed');
    
  } catch (error) {
    console.error('❌ Cookie test failed:', error.response?.status, error.response?.data);
  }
}

testBrowserCookies();