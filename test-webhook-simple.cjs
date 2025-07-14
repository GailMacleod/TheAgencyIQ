/**
 * Simple Webhook Test - Check if webhook returns 200
 */

const axios = require('axios');

async function testWebhook() {
  try {
    console.log('Testing webhook with simple request...');
    
    const response = await axios.post('http://localhost:5000/api/webhook', {
      type: 'test.webhook',
      data: { object: { id: 'test_event' } }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      timeout: 10000,
      validateStatus: () => true
    });
    
    console.log('Status:', response.status);
    console.log('Response:', response.data);
    
    if (response.status === 200) {
      console.log('✅ Webhook fix working - returns 200');
    } else {
      console.log('❌ Webhook still returning non-200 status');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testWebhook();