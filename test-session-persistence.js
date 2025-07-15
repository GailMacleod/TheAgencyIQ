/**
 * Session Persistence Test
 * Tests if sessions persist properly between API calls
 */

import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSessionPersistence() {
  console.log('🔍 Testing session persistence...');
  
  try {
    // Step 1: Establish session
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    console.log('✅ Session established:', sessionResponse.data);
    const sessionId = sessionResponse.data.sessionId;
    
    // Step 2: Test API call immediately after session establishment
    console.log('🔍 Testing immediate API call...');
    
    const testResponse = await axios.get(`${BASE_URL}/api/user`, {
      params: {
        sessionId: sessionId,
        userId: 2,
        userEmail: 'gailm@macleodglba.com.au'
      }
    });
    
    console.log('✅ API call successful:', testResponse.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Status:', error.response?.status);
  }
}

testSessionPersistence();