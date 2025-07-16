/**
 * Browser Cookie Storage Test - Test if cookies are properly stored and transmitted
 * This test simulates real browser cookie handling behavior
 */

const axios = require('axios');

// Manual cookie handling
let cookieStore = '';

async function testBrowserCookieStorage() {
  console.log('🔍 Testing browser cookie storage and transmission...');
  
  try {
    // Step 1: Establish session and capture cookies
    console.log('\n🔗 Step 1: Establishing session and capturing cookies...');
    const sessionResponse = await axios.post('http://localhost:5000/api/establish-session', {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('📋 Session Response Status:', sessionResponse.status);
    console.log('📋 Session Response Data:', sessionResponse.data);
    
    // Extract cookies from response
    const setCookieHeaders = sessionResponse.headers['set-cookie'];
    console.log('📋 Set-Cookie Headers:', setCookieHeaders);
    
    if (setCookieHeaders) {
      // Parse all cookies and store them
      const cookies = setCookieHeaders.map(header => {
        const [cookiePart] = header.split(';');
        return cookiePart.trim();
      });
      cookieStore = cookies.join('; ');
      console.log('📋 Stored cookies:', cookieStore);
    }
    
    // Step 2: Make authenticated request with stored cookies
    console.log('\n🔒 Step 2: Making authenticated request with stored cookies...');
    const userResponse = await axios.get('http://localhost:5000/api/user', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': cookieStore
      }
    });
    
    console.log('📋 User Response Status:', userResponse.status);
    console.log('📋 User Response Data:', userResponse.data);
    
    // Step 3: Test session persistence
    console.log('\n🔄 Step 3: Testing session persistence...');
    const statusResponse = await axios.get('http://localhost:5000/api/user-status', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': cookieStore
      }
    });
    
    console.log('📋 Status Response Status:', statusResponse.status);
    console.log('📋 Status Response Data:', statusResponse.data);
    
    // Step 4: Test multiple endpoints
    console.log('\n🔗 Step 4: Testing multiple endpoints...');
    const platformResponse = await axios.get('http://localhost:5000/api/platform-connections', {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': cookieStore
      }
    });
    
    console.log('📋 Platform Response Status:', platformResponse.status);
    console.log('📋 Platform Response Data:', platformResponse.data);
    
    console.log('\n✅ Browser cookie storage test completed successfully!');
    
  } catch (error) {
    console.error('❌ Browser cookie storage test failed:', error.message);
    if (error.response) {
      console.error('📋 Error Response Status:', error.response.status);
      console.error('📋 Error Response Data:', error.response.data);
    }
  }
}

// Run the test
testBrowserCookieStorage();