/**
 * Test Cookie Flow - Manual verification of cookie transmission
 */

import axios from 'axios';

async function testCookieFlow() {
  const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  console.log('🔍 Testing cookie flow manually...');
  
  try {
    // Step 1: Establish session
    console.log('Step 1: Establishing session...');
    const sessionResponse = await axios.post(baseURL + '/api/establish-session', {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Session establishment response:', sessionResponse.data);
    console.log('Response cookies:', sessionResponse.headers['set-cookie']);
    
    // Step 2: Extract cookies
    const setCookieHeader = sessionResponse.headers['set-cookie'];
    let sessionCookie = null;
    
    if (setCookieHeader) {
      for (const cookie of setCookieHeader) {
        if (cookie.includes('theagencyiq.session=')) {
          sessionCookie = cookie.split(';')[0]; // Extract just the cookie part
          break;
        }
      }
    }
    
    console.log('Extracted session cookie:', sessionCookie);
    
    // Step 3: Test API call with cookie
    if (sessionCookie) {
      console.log('Step 3: Testing API call with cookie...');
      try {
        const apiResponse = await axios.get(baseURL + '/api/user', {
          headers: {
            'Cookie': sessionCookie,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('API response:', apiResponse.data);
        console.log('✅ SUCCESS: Cookie transmission working!');
      } catch (error) {
        console.log('❌ API call failed:', error.response?.status, error.response?.data);
      }
    } else {
      console.log('❌ No session cookie found in response');
    }
  } catch (error) {
    console.error('Error during test:', error.message);
  }
}

testCookieFlow();