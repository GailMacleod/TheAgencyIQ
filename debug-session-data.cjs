const axios = require('axios');

const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

(async function() {
  try {
    console.log('1. Establishing session...');
    const response = await axios.post(baseURL + '/api/establish-session', {
      email: 'gailm@macleodglba.com.au', 
      phone: '+61424835189'
    });
    
    console.log('Response:', response.data);
    
    const sessionId = response.data.sessionId;
    console.log('Session ID:', sessionId);
    
    console.log('2. Testing session with cookie...');
    const debugResponse = await axios.get(baseURL + '/api/session-debug', {
      headers: {
        'Cookie': 'theagencyiq.session=' + sessionId
      }
    });
    
    console.log('Debug response:', debugResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data);
  }
})();