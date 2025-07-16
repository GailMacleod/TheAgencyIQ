/**
 * WEBHOOK STATUS VERIFICATION TEST
 * Tests webhook endpoint returns 200-299 status codes
 */

const axios = require('axios');

async function testWebhook() {
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  console.log('🔍 Testing webhook endpoint...');
  
  try {
    const response = await axios.post(`${baseUrl}/api/webhook`, {
      test: 'webhook_verification'
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log(`✅ Webhook Status Code: ${response.status}`);
    console.log(`✅ Webhook Response: ${JSON.stringify(response.data)}`);
    
    if (response.status >= 200 && response.status < 300) {
      console.log('🎉 WEBHOOK WORKING - Status code in 200-299 range');
      return true;
    } else {
      console.log('❌ WEBHOOK ISSUE - Status code outside 200-299 range');
      return false;
    }
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ Webhook Error Status: ${error.response.status}`);
      console.log(`❌ Webhook Error Response: ${JSON.stringify(error.response.data)}`);
      
      // Even error responses should be in proper range for webhooks
      if (error.response.status >= 200 && error.response.status < 300) {
        console.log('✅ WEBHOOK WORKING - Error response in 200-299 range');
        return true;
      }
    } else {
      console.log(`❌ Webhook Network Error: ${error.message}`);
    }
    return false;
  }
}

// Run test
testWebhook().then(success => {
  console.log(`\n📊 WEBHOOK TEST RESULT: ${success ? 'PASS' : 'FAIL'}`);
  process.exit(success ? 0 : 1);
});