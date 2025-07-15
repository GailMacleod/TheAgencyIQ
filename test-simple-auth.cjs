/**
 * Simple Authentication Test
 * Tests basic signup and login functionality
 */

const axios = require('axios');
const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSimpleAuth() {
  console.log('🧪 Testing Simple Authentication Flow');
  console.log('='.repeat(50));

  try {
    // Test 1: Signup
    console.log('\n📝 Test 1: User Signup');
    const signupData = {
      email: 'testuser@example.com',
      password: 'testpass123',
      phone: '+61400111222'
    };

    const signupResponse = await axios.post(`${baseURL}/api/auth/signup`, signupData);
    console.log(`Signup status: ${signupResponse.status}`);
    console.log('Signup response:', signupResponse.data);

    // Test 2: Login
    console.log('\n🔐 Test 2: User Login');
    const loginData = {
      email: 'testuser@example.com',
      password: 'testpass123'
    };

    const loginResponse = await axios.post(`${baseURL}/api/auth/login`, loginData);
    console.log(`Login status: ${loginResponse.status}`);
    console.log('Login response:', loginResponse.data);

    // Test 3: Auth Status
    console.log('\n✅ Test 3: Auth Status');
    const statusResponse = await axios.get(`${baseURL}/api/auth/status`);
    console.log(`Status check: ${statusResponse.status}`);
    console.log('Status response:', statusResponse.data);

    console.log('\n🎉 Simple authentication test completed successfully!');
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testSimpleAuth();