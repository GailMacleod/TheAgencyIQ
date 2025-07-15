/**
 * Browser Cookie Diagnosis
 * Check if the real browser is accepting cookies
 */

import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function diagnoseBrowserCookies() {
  try {
    console.log('🔍 BROWSER COOKIE DIAGNOSIS - SECURE FLAG TEST');
    
    // Test 1: Check current cookie configuration
    console.log('\n🔍 Step 1: Check current cookie configuration...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au'
    }, {
      withCredentials: true
    });
    
    console.log('✅ Session established:', sessionResponse.data);
    
    // Extract Set-Cookie headers
    const cookies = sessionResponse.headers['set-cookie'];
    if (cookies) {
      console.log('🍪 Set-Cookie headers analysis:');
      cookies.forEach((cookie, index) => {
        console.log(`  ${index + 1}. ${cookie}`);
        const hasSecure = cookie.includes('Secure');
        const sameSite = cookie.match(/SameSite=([^;]+)/)?.[1];
        const isHttps = BASE_URL.startsWith('https://');
        
        console.log(`     - Secure: ${hasSecure ? 'YES' : 'NO'}`);
        console.log(`     - SameSite: ${sameSite || 'NOT SET'}`);
        console.log(`     - HTTPS Context: ${isHttps ? 'YES' : 'NO'}`);
        console.log(`     - Cookie viable: ${hasSecure && !isHttps ? 'NO - Secure on HTTP' : 'YES'}`);
      });
    }
    
    // Test 2: Check if cookies are being sent in subsequent requests
    console.log('\n🔍 Step 2: Testing automatic cookie transmission...');
    const testResponse = await axios.get(`${BASE_URL}/api/user`, {
      withCredentials: true
    });
    
    console.log('✅ API call result:', testResponse.status);
    
  } catch (error) {
    console.error('❌ Test error:', error.response?.status, error.response?.data);
  }
}

diagnoseBrowserCookies();