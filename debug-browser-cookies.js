/**
 * Debug Browser Cookie Issues
 * Simulates exact browser cookie behavior to identify the root cause
 */

import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function debugBrowserCookies() {
  try {
    console.log('🔍 DEBUGGING BROWSER COOKIE BEHAVIOR');
    
    // Create axios instance with jar for cookie handling
    const client = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Browser Cookie Debug)',
        'Accept': 'application/json'
      }
    });
    
    // Add response interceptor to capture cookies
    client.interceptors.response.use((response) => {
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        console.log('🍪 Set-Cookie headers received:', setCookie);
      }
      return response;
    });
    
    // Step 1: Establish session
    console.log('\n🔍 Step 1: Establishing session...');
    const sessionResponse = await client.post('/api/establish-session', {
      email: 'gailm@macleodglba.com.au'
    });
    
    console.log('✅ Session established:', sessionResponse.data);
    
    // Extract cookies from response
    const cookies = sessionResponse.headers['set-cookie'];
    let signedCookie = null;
    let unsignedCookie = null;
    
    if (cookies) {
      cookies.forEach(cookie => {
        if (cookie.includes('theagencyiq.session=')) {
          signedCookie = cookie.split(';')[0]; // Get just the name=value part
        }
        if (cookie.includes('theagencyiq.session.unsigned=')) {
          unsignedCookie = cookie.split(';')[0];
        }
      });
    }
    
    console.log('🔍 Extracted cookies:', { signedCookie, unsignedCookie });
    
    // Step 2: Test with signed cookie
    if (signedCookie) {
      console.log('\n🔍 Step 2: Testing signed cookie...');
      const signedResponse = await client.get('/api/user', {
        headers: {
          'Cookie': signedCookie
        }
      });
      console.log('✅ Signed cookie test result:', signedResponse.status);
    }
    
    // Step 3: Test with unsigned cookie
    if (unsignedCookie) {
      console.log('\n🔍 Step 3: Testing unsigned cookie...');
      const unsignedResponse = await client.get('/api/user', {
        headers: {
          'Cookie': unsignedCookie
        }
      });
      console.log('✅ Unsigned cookie test result:', unsignedResponse.status);
    }
    
    // Step 4: Test with both cookies
    if (signedCookie && unsignedCookie) {
      console.log('\n🔍 Step 4: Testing both cookies...');
      const bothResponse = await client.get('/api/user', {
        headers: {
          'Cookie': `${signedCookie}; ${unsignedCookie}`
        }
      });
      console.log('✅ Both cookies test result:', bothResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.response?.status, error.response?.data);
  }
}

debugBrowserCookies();