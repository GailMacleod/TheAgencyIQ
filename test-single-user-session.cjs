/**
 * Test Single User Session Flow
 * Debug the session establishment and persistence
 */

const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSingleUserSession() {
  try {
    console.log('🔍 Testing single user session establishment...');
    
    // Step 1: Establish session
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'testuser1@example.com',
      phone: '+61400000001'
    }, {
      timeout: 30000,
      withCredentials: true
    });
    
    console.log('📋 Session Response Status:', sessionResponse.status);
    console.log('📋 Session Response Data:', sessionResponse.data);
    console.log('📋 Session Response Headers:', sessionResponse.headers);
    
    // Extract cookies from response
    const cookies = sessionResponse.headers['set-cookie'];
    console.log('📋 Set-Cookie Headers:', cookies);
    
    if (sessionResponse.status === 200) {
      // Step 2: Test session persistence
      const userResponse = await axios.get(`${BASE_URL}/api/user`, {
        headers: {
          'Cookie': cookies ? cookies.join('; ') : ''
        },
        timeout: 30000
      });
      
      console.log('📋 User Response Status:', userResponse.status);
      console.log('📋 User Response Data:', userResponse.data);
      
      if (userResponse.status === 200) {
        console.log('✅ Session test successful!');
        return true;
      } else {
        console.log('❌ Session test failed - user endpoint returned', userResponse.status);
        return false;
      }
    } else {
      console.log('❌ Session establishment failed:', sessionResponse.status);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Error Response:', error.response.status, error.response.data);
    }
    return false;
  }
}

testSingleUserSession();