/**
 * Browser Cookie Check - Test if browser is storing cookies even without header visibility
 */

async function testBrowserCookieStorage() {
  console.log('🔍 BROWSER COOKIE STORAGE TEST');
  console.log('===============================');
  
  const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  try {
    // 1. Make session establishment request
    console.log('\n1. 🔐 Establishing session...');
    const sessionResponse = await fetch(`${BASE_URL}/api/establish-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      })
    });

    if (sessionResponse.ok) {
      const sessionData = await sessionResponse.json();
      console.log('✅ Session established:', sessionData.sessionId);
      
      // Check for visible Set-Cookie headers (should be null for security)
      const setCookieHeader = sessionResponse.headers.get('Set-Cookie');
      console.log('🔍 Set-Cookie header visible to JavaScript:', setCookieHeader);
      
      // Check current cookies in browser (should include session cookie)
      const currentCookies = document.cookie;
      console.log('🍪 Current browser cookies:', currentCookies);
      
      // 2. Wait 1 second then test if cookie persists
      console.log('\n2. ⏱️ Waiting 1 second...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 3. Make authenticated request WITHOUT manually setting cookies
      console.log('\n3. 🔍 Testing authenticated request...');
      const userResponse = await fetch(`${BASE_URL}/api/user`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      console.log('📋 User endpoint status:', userResponse.status);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('✅ SUCCESS: Cookie was automatically transmitted!');
        console.log('👤 User authenticated:', userData.email);
      } else {
        console.log('❌ FAIL: Cookie was not transmitted');
        const errorData = await userResponse.json();
        console.log('🔍 Error response:', errorData);
      }
      
    } else {
      console.log('❌ Session establishment failed:', sessionResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBrowserCookieStorage();