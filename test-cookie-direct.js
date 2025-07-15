/**
 * Test Direct Cookie Setting
 * Tests setting cookies directly to confirm browser behavior
 */

import axios from 'axios';

async function testDirectCookie() {
  console.log('🧪 Testing Direct Cookie Setting');
  console.log('=================================');
  
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  try {
    // Test 1: Set cookie with SameSite=lax (should work)
    console.log('1. Testing SameSite=lax cookie...');
    const response1 = await axios.post(`${baseUrl}/api/auth/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      testMode: 'direct'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });
    
    console.log(`   Status: ${response1.status}`);
    console.log(`   Set-Cookie: ${response1.headers['set-cookie']}`);
    
    // Extract the signed session cookie
    const cookies = response1.headers['set-cookie'];
    let sessionCookie = null;
    
    if (cookies) {
      for (const cookie of cookies) {
        if (cookie.includes('s%3A')) {
          sessionCookie = cookie.split(';')[0];
          break;
        }
      }
    }
    
    if (sessionCookie) {
      console.log('2. Testing with signed session cookie...');
      const response2 = await axios.get(`${baseUrl}/api/user`, {
        headers: {
          'Cookie': sessionCookie
        },
        validateStatus: () => true
      });
      
      console.log(`   Status: ${response2.status}`);
      console.log(`   Response: ${JSON.stringify(response2.data, null, 2)}`);
      
      if (response2.status === 200) {
        console.log('✅ Signed cookie authentication working!');
      } else {
        console.log('❌ Signed cookie authentication failed');
      }
    } else {
      console.log('❌ No signed session cookie found');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDirectCookie();