/**
 * Simple Fallback Test - Test single API call with fallback headers
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

async function testSimpleFallback() {
  console.log('🔍 Testing simple fallback authentication...');
  
  try {
    // Test API call with fallback headers
    console.log('\n🔒 Testing API call with fallback headers...');
    
    const response = await axios.get(`${BASE_URL}/api/user`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Session-ID': 'test-session-id-123',
        'X-User-ID': '2',
        'X-User-Email': 'gailm@macleodglba.com.au'
      },
      withCredentials: true
    });

    console.log('✅ Simple fallback test successful!');
    console.log('📋 Response Status:', response.status);
    console.log('📋 Response Data:', response.data);

  } catch (error) {
    console.error('❌ Simple fallback test failed:', error.message);
    if (error.response) {
      console.error('📋 Error Response Status:', error.response.status);
      console.error('📋 Error Response Data:', error.response.data);
    }
  }
}

testSimpleFallback();