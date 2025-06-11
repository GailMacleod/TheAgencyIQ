// Debug script to test verification code flow
const axios = require('axios');

async function testVerificationFlow() {
  const baseUrl = 'http://localhost:5000';
  const phone = '+610424835200';
  const email = 'gailm@macleodglba.com.au';
  
  console.log('=== VERIFICATION CODE DEBUG TEST ===');
  
  try {
    // Step 1: Send verification code
    console.log('Step 1: Sending verification code...');
    const sendResponse = await axios.post(`${baseUrl}/api/send-code`, {
      phone: phone
    });
    
    console.log('Send response:', JSON.stringify(sendResponse.data, null, 2));
    
    if (sendResponse.data.developmentCode) {
      const code = sendResponse.data.developmentCode;
      console.log(`Development code: ${code}`);
      
      // Step 2: Use verification code
      console.log('\nStep 2: Using verification code...');
      const updateResponse = await axios.post(`${baseUrl}/api/update-phone`, {
        email: email,
        newPhone: phone,
        verificationCode: code
      });
      
      console.log('Update response:', JSON.stringify(updateResponse.data, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testVerificationFlow();