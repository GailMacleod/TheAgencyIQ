/**
 * Debug Session Mapping Issue
 */

const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function debugSessionMapping() {
  console.log('🔍 DEBUGGING SESSION MAPPING ISSUE');
  
  try {
    // Step 1: Establish session
    console.log('\n🔍 Step 1: Establish session');
    const response = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ Session established');
    console.log('📋 Session ID from response:', response.data.sessionId);
    
    // Extract cookies from response
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      console.log('📋 Set-Cookie headers:', setCookieHeader);
      
      // Extract session cookie
      const sessionCookie = setCookieHeader.find(c => c.includes('theagencyiq.session='));
      if (sessionCookie) {
        console.log('📋 Session cookie:', sessionCookie);
        
        // Extract session ID from cookie
        const cookieMatch = sessionCookie.match(/theagencyiq\.session=([^;]+)/);
        if (cookieMatch) {
          const cookieSessionId = cookieMatch[1];
          console.log('📋 Session ID from cookie:', cookieSessionId);
          
          // Check if they match
          if (cookieSessionId === response.data.sessionId) {
            console.log('✅ Session IDs match!');
          } else {
            console.log('❌ Session IDs DO NOT match!');
            console.log('  Response ID:', response.data.sessionId);
            console.log('  Cookie ID:', cookieSessionId);
          }
        }
      }
    }
    
    // Step 2: Test API call with cookie
    console.log('\n🔍 Step 2: Test API call with cookie');
    const apiResponse = await axios.get(`${BASE_URL}/api/user`, {
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': setCookieHeader ? setCookieHeader.join('; ') : ''
      }
    });
    
    console.log('✅ API call successful');
    console.log('📋 User:', apiResponse.data.email);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.status, error.response?.data);
  }
}

debugSessionMapping();