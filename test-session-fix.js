/**
 * Test Session Persistence Fix
 * Simple test to verify session establishment and persistence
 */

const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSessionFix() {
  console.log('🧪 Testing Session Persistence Fix');
  
  try {
    // Step 1: Establish session
    console.log('1. Establishing session...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (sessionResponse.status === 200) {
      console.log('✅ Session established:', sessionResponse.data.sessionId);
      
      // Extract cookies
      const cookies = sessionResponse.headers['set-cookie'] ? 
        sessionResponse.headers['set-cookie'].join('; ') : '';
      console.log('📋 Cookies:', cookies);
      
      // Step 2: Test session persistence
      console.log('2. Testing session persistence...');
      const userResponse = await axios.get(`${BASE_URL}/api/user`, {
        withCredentials: true,
        headers: {
          'Cookie': cookies
        }
      });
      
      if (userResponse.status === 200) {
        console.log('✅ Session persisted successfully!');
        console.log('👤 User:', userResponse.data.email);
        console.log('📊 Plan:', userResponse.data.subscriptionPlan);
      } else {
        console.log('❌ Session persistence failed:', userResponse.status);
      }
    } else {
      console.log('❌ Session establishment failed:', sessionResponse.status);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testSessionFix();