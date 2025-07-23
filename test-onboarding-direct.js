import axios from 'axios';

// Test against the actual Replit development server
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

console.log('\n🧪 DIRECT ONBOARDING ENDPOINT TEST');
console.log('===================================');
console.log(`Testing against: ${BASE_URL}`);

async function testOnboardingEndpoint() {
  try {
    console.log('\n🔍 Testing /api/onboarding/validate endpoint...');
    
    const testData = {
      email: 'test@queenslandbiz.com.au',
      phone: '+61412345678',
      firstName: 'Test',
      lastName: 'User',
      businessName: 'Queensland Test Business',
      subscriptionPlan: 'professional'
    };

    console.log('Request data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/api/onboarding/validate`, testData, {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Test-Client/1.0'
      }
    });
    
    console.log('\n✅ SUCCESS! Response received:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.valid) {
      console.log('\n🎉 ONBOARDING ENDPOINT IS WORKING!');
      console.log('✅ Authentication bypass successful');
      console.log('✅ Validation logic working');
      console.log('✅ Response format correct');
    } else {
      console.log('\n⚠️ Endpoint accessible but validation failed');
    }

  } catch (error) {
    console.log('\n❌ ERROR occurred:');
    console.log('Error type:', error.name);
    
    if (error.response) {
      console.log('HTTP Status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 401) {
        console.log('\n🚨 AUTHENTICATION STILL BLOCKING ENDPOINT');
        console.log('The middleware changes have not taken effect yet');
      } else if (error.response.status === 500) {
        console.log('\n🔧 SERVER ERROR - endpoint reached but internal error occurred');
      } else {
        console.log('\n🤔 UNEXPECTED HTTP STATUS');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('\n🔌 CONNECTION REFUSED - server might not be running');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n🌐 DNS ERROR - could not resolve hostname');
    } else {
      console.log('Error message:', error.message);
      console.log('Error code:', error.code);
    }
  }
}

testOnboardingEndpoint();