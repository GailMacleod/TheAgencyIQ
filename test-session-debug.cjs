/**
 * Simple test for session debug endpoint
 */

const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSessionDebug() {
  console.log('Testing session debug endpoint...');
  
  try {
    // First establish a session
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    console.log('Session established:', sessionResponse.data);
    
    if (sessionResponse.headers['set-cookie']) {
      const cookies = sessionResponse.headers['set-cookie'];
      console.log('Set-Cookie headers:', cookies);
      
      // Find the session cookie
      const sessionCookie = cookies.find(cookie => cookie.includes('theagencyiq.session'));
      if (sessionCookie) {
        const cookieValue = sessionCookie.split(';')[0];
        console.log('Session cookie:', cookieValue);
        
        // Test the debug endpoint
        const debugResponse = await axios.get(`${BASE_URL}/api/session-debug`, {
          headers: {
            'Cookie': cookieValue
          }
        });
        
        console.log('Debug response:', debugResponse.data);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testSessionDebug();