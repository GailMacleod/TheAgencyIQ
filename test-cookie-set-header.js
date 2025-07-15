/**
 * Test Set-Cookie Header in /api/establish-session Response
 */

async function testSetCookieHeader() {
  console.log('🔍 Testing Set-Cookie header in /api/establish-session response...');
  
  try {
    const response = await fetch('http://localhost:5000/api/establish-session', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      })
    });
    
    console.log('📋 Response status:', response.status);
    console.log('📋 Response headers:');
    for (const [key, value] of response.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    const setCookieHeader = response.headers.get('set-cookie');
    console.log('🍪 Set-Cookie header:', setCookieHeader);
    
    if (setCookieHeader) {
      console.log('✅ Set-Cookie header found in response');
    } else {
      console.log('❌ Set-Cookie header MISSING in response');
    }
    
    const data = await response.json();
    console.log('📋 Response data:', data);
    
    // Now test if cookie is sent in next request
    console.log('\n🔍 Testing if cookie is sent in /api/user request...');
    
    const userResponse = await fetch('http://localhost:5000/api/user', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📋 User response status:', userResponse.status);
    console.log('📋 User response headers:');
    for (const [key, value] of userResponse.headers.entries()) {
      console.log(`   ${key}: ${value}`);
    }
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('✅ User data retrieved:', userData);
    } else {
      console.log('❌ User request failed with status:', userResponse.status);
      const errorData = await userResponse.text();
      console.log('❌ Error response:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSetCookieHeader();