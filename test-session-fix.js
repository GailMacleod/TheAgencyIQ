import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSessionFix() {
  console.log('🔧 Testing Session Establishment Fix');
  
  try {
    // Test 1: Establish guest session
    console.log('\n1. Testing guest session establishment...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Session established:', sessionResponse.data);
    
    // Extract cookies from response
    const setCookieHeader = sessionResponse.headers['set-cookie'];
    console.log('🍪 Session cookies:', setCookieHeader);
    
    // Test 2: Access root with established session
    console.log('\n2. Testing root access with session...');
    const cookies = setCookieHeader ? setCookieHeader.map(cookie => cookie.split(';')[0]).join('; ') : '';
    
    const rootResponse = await axios.get(`${BASE_URL}/`, {
      headers: {
        'Cookie': cookies
      }
    });
    
    console.log('✅ Root access successful:', rootResponse.status);
    
    // Test 3: Public status endpoint
    console.log('\n3. Testing public status...');
    const statusResponse = await axios.get(`${BASE_URL}/api/public/status`);
    console.log('✅ Public status:', statusResponse.data);
    
    console.log('\n🎯 All tests passed! 401 error should be fixed.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSessionFix();