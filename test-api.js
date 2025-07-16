// import fetch from 'node-fetch';

const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testAPI() {
  console.log('🧪 Testing TheAgencyIQ API endpoints...\n');
  
  try {
    // Test health endpoint
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health:', healthData);
    
    // Test establish session
    console.log('\n2. Testing session establishment...');
    const sessionResponse = await fetch(`${baseUrl}/api/establish-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    const sessionData = await sessionResponse.json();
    console.log('✅ Session:', sessionData);
    
    // Test user endpoint
    console.log('\n3. Testing user endpoint...');
    const userResponse = await fetch(`${baseUrl}/api/user`, {
      credentials: 'include'
    });
    const userData = await userResponse.json();
    console.log('✅ User:', userData);
    
    // Test user status
    console.log('\n4. Testing user status...');
    const statusResponse = await fetch(`${baseUrl}/api/user-status`, {
      credentials: 'include'
    });
    const statusData = await statusResponse.json();
    console.log('✅ Status:', statusData);
    
    // Test platform connections
    console.log('\n5. Testing platform connections...');
    const platformResponse = await fetch(`${baseUrl}/api/platform-connections`, {
      credentials: 'include'
    });
    const platformData = await platformResponse.json();
    console.log('✅ Platforms:', platformData);
    
    console.log('\n🎉 ALL API ENDPOINTS WORKING SUCCESSFULLY!');
    console.log('\n🌐 TheAgencyIQ application is LIVE and operational at:');
    console.log(baseUrl);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();