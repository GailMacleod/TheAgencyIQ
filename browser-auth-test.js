/**
 * Browser Authentication Test
 * Test cookie transmission and /api/user endpoint with 401 fix
 */

import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// Wrap axios with cookie jar support
const client = wrapper(axios.create({
  jar: new CookieJar(),
  withCredentials: true,
  timeout: 30000,
  validateStatus: () => true // Accept all status codes
}));

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testBrowserAuth() {
  console.log('🔐 BROWSER AUTHENTICATION TEST - 401 FIX VALIDATION');
  console.log('Target:', BASE_URL);
  console.log('Time:', new Date().toISOString());
  console.log('');

  try {
    // Step 1: Establish session
    console.log('🔍 Step 1: Establishing session...');
    const sessionResponse = await client.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    console.log('   Session Status:', sessionResponse.status);
    console.log('   Session Data:', sessionResponse.data);
    
    // Check for Set-Cookie headers
    const setCookieHeaders = sessionResponse.headers['set-cookie'];
    console.log('   Set-Cookie Headers:', setCookieHeaders ? 'Present' : 'Missing');
    if (setCookieHeaders) {
      setCookieHeaders.forEach(cookie => {
        console.log('   Cookie:', cookie);
      });
    }
    
    // Step 2: Test /api/user endpoint with cookies
    console.log('');
    console.log('🔍 Step 2: Testing /api/user endpoint with cookies...');
    const userResponse = await client.get(`${BASE_URL}/api/user`);
    
    console.log('   User Status:', userResponse.status);
    console.log('   User Data:', userResponse.data);
    
    // Check request headers sent
    console.log('   Request Headers:', {
      cookie: userResponse.config.headers?.cookie || 'Not present',
      'user-agent': userResponse.config.headers?.['user-agent']
    });
    
    // Step 3: Test without establish session (should fail)
    console.log('');
    console.log('🔍 Step 3: Testing /api/user without session (should fail)...');
    const freshClient = wrapper(axios.create({
      jar: new CookieJar(),
      withCredentials: true,
      timeout: 10000,
      validateStatus: () => true
    }));
    
    const noSessionResponse = await freshClient.get(`${BASE_URL}/api/user`);
    console.log('   No Session Status:', noSessionResponse.status);
    console.log('   No Session Data:', noSessionResponse.data);
    
    // Final Report
    console.log('');
    console.log('📊 BROWSER AUTH TEST REPORT');
    console.log('=====================================');
    console.log('✅ Session establishment:', sessionResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    console.log('✅ Cookie transmission:', setCookieHeaders ? 'SUCCESS' : 'FAILED');
    console.log('✅ /api/user with cookies:', userResponse.status === 200 ? 'SUCCESS' : 'FAILED');
    console.log('✅ /api/user without cookies:', noSessionResponse.status === 401 ? 'SUCCESS' : 'FAILED');
    console.log('');
    
    if (userResponse.status === 200) {
      console.log('🎉 SUCCESS: 401 fix working - /api/user returns 200 with cookies');
      console.log('🔐 Authentication working properly');
    } else {
      console.log('❌ ISSUE: /api/user still returning', userResponse.status);
      console.log('🔧 Cookie fix may need adjustment');
    }
    
  } catch (error) {
    console.error('❌ Browser auth test failed:', error.message);
  }
}

testBrowserAuth();