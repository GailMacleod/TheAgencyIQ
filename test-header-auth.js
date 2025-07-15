/**
 * Test header-based authentication
 */

import axios from 'axios';

async function testHeaderAuth() {
  const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  console.log('🔍 Testing header-based authentication...');
  
  try {
    const response = await axios.get(`${baseURL}/api/user`, {
      headers: {
        'X-User-ID': '2',
        'X-User-Email': 'gailm@macleodglba.com.au',
        'X-Session-ID': 'test-session-123',
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCESS! Status:', response.status);
    console.log('📋 Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ ERROR:', error.response?.status, error.response?.data);
    console.log('📋 Error details:', error.message);
  }
}

testHeaderAuth();