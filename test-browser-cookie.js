/**
 * Test Browser Cookie Transmission
 * Tests if cookies are properly transmitted in browser environment
 */

import axios from 'axios';

async function testBrowserCookies() {
  console.log('🧪 Testing Browser Cookie Transmission');
  console.log('=====================================');
  
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  try {
    // Step 1: Establish session
    console.log('1. Establishing session...');
    const sessionResponse = await axios.post(`${baseUrl}/api/auth/establish-session`, {
      email: 'gailm@macleodglba.com.au'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });
    
    console.log(`   Status: ${sessionResponse.status}`);
    console.log(`   Set-Cookie: ${sessionResponse.headers['set-cookie']}`);
    
    if (sessionResponse.status === 200) {
      const cookies = sessionResponse.headers['set-cookie'];
      const cookieHeader = cookies.join('; ');
      
      console.log('2. Testing cookie transmission...');
      const userResponse = await axios.get(`${baseUrl}/api/user`, {
        headers: {
          'Cookie': cookieHeader
        },
        validateStatus: () => true
      });
      
      console.log(`   Status: ${userResponse.status}`);
      console.log(`   Response: ${JSON.stringify(userResponse.data, null, 2)}`);
      
      if (userResponse.status === 200) {
        console.log('✅ Cookie transmission working!');
      } else {
        console.log('❌ Cookie transmission failed');
      }
    } else {
      console.log('❌ Session establishment failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBrowserCookies();