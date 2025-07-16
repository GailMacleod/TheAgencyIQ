/**
 * Test Session Cookie Fix
 * Tests manual session cookie extraction and transmission
 */

const axios = require('axios');

async function testSessionCookieFix() {
  console.log('🔍 Testing session cookie fix...');
  
  try {
    // Step 1: Establish session
    const sessionResponse = await axios.post('https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/api/auth/session', {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      withCredentials: true
    });

    console.log('📋 Session Response Status:', sessionResponse.status);
    console.log('📋 Session Response Data:', sessionResponse.data);
    
    // Step 2: Extract session ID from response
    const sessionId = sessionResponse.data.sessionId;
    console.log('📋 Extracted Session ID:', sessionId);
    
    // Step 3: Extract session cookie from Set-Cookie header
    const setCookieHeaders = sessionResponse.headers['set-cookie'];
    console.log('📋 Set-Cookie Headers:', setCookieHeaders);
    
    let cookieValue = null;
    if (setCookieHeaders) {
      for (const cookie of setCookieHeaders) {
        if (cookie.startsWith('theagencyiq.session=')) {
          const match = cookie.match(/theagencyiq\.session=([^;]+)/);
          if (match) {
            cookieValue = match[1];
            break;
          }
        }
      }
    }
    
    console.log('📋 Extracted Cookie Value:', cookieValue);
    
    // Step 4: Test with manual cookie header
    const testResponse = await axios.get('https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/api/user', {
      headers: {
        'Cookie': `theagencyiq.session=${cookieValue}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
    
    console.log('📋 Test Response Status:', testResponse.status);
    console.log('📋 Test Response Data:', testResponse.data);
    
    if (testResponse.status === 200) {
      console.log('✅ Session cookie fix successful!');
      return true;
    } else {
      console.log('❌ Session cookie fix failed');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.status, error.response?.data);
    return false;
  }
}

testSessionCookieFix();