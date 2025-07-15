const axios = require('axios');

async function testSessionEstablishment() {
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  console.log('Testing session establishment...');
  
  try {
    const response = await axios.post(`${baseUrl}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      timeout: 30000,
      validateStatus: () => true
    });
    
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    
    if (response.status === 200 && response.data.sessionEstablished) {
      console.log('✅ Session establishment successful');
      console.log('User:', response.data.user.email);
      console.log('Session ID:', response.data.sessionId);
      
      // Test session persistence
      const cookieHeader = response.headers['set-cookie'];
      if (cookieHeader) {
        const signedCookie = cookieHeader.find(cookie => cookie.includes('s%3A'));
        if (signedCookie) {
          console.log('✅ Signed cookie found');
          
          // Test API call with cookie
          const userResponse = await axios.get(`${baseUrl}/api/user`, {
            headers: { 'Cookie': signedCookie.split(';')[0] },
            timeout: 30000,
            validateStatus: () => true
          });
          
          console.log('User API Status:', userResponse.status);
          if (userResponse.status === 200) {
            console.log('✅ Session persistence working');
          } else {
            console.log('❌ Session persistence failed');
          }
        } else {
          console.log('❌ No signed cookie found');
        }
      } else {
        console.log('❌ No cookies in response');
      }
    } else {
      console.log('❌ Session establishment failed');
      console.log('Error:', response.data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testSessionEstablishment();