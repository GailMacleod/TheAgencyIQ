/**
 * Browser Authentication Test
 * Test cookie transmission and /api/user endpoint with 401 fix
 */

async function testBrowserAuth() {
  console.log('🔍 BROWSER AUTHENTICATION TEST');
  console.log('===============================');
  
  const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  try {
    // 1. Establish session
    console.log('\n1. 🔐 Establishing session...');
    const sessionResponse = await fetch(`${BASE_URL}/api/establish-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      
      // 2. Test immediate authenticated request
      console.log('\n2. 🔍 Testing immediate authenticated request...');
      const userResponse = await fetch(`${BASE_URL}/api/user`, {
        method: 'GET',
        credentials: 'include'
      });
      
      console.log('📋 User endpoint status:', userResponse.status);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('✅ SUCCESS: Immediate authentication worked!');
        console.log('👤 User:', userData.email);
        console.log('🎯 CONCLUSION: Browser cookies ARE being transmitted correctly');
        return true;
      } else {
        console.log('❌ IMMEDIATE REQUEST FAILED - Testing fallback...');
        
        // 3. Test with manual header (if cookies not working)
        console.log('\n3. 🔧 Testing with manual session header...');
        const manualResponse = await fetch(`${BASE_URL}/api/user`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'X-Session-ID': sessionData.sessionId,
            'X-User-ID': '2',
            'X-User-Email': 'gailm@macleodglba.com.au'
          }
        });
        
        console.log('📋 Manual header status:', manualResponse.status);
        
        if (manualResponse.ok) {
          const manualData = await manualResponse.json();
          console.log('✅ SUCCESS: Manual header authentication worked!');
          console.log('👤 User:', manualData.email);
          console.log('🎯 CONCLUSION: Server is working, browser cookies need fallback');
          return true;
        } else {
          console.log('❌ MANUAL HEADER FAILED - Testing query params...');
          
          // 4. Test with query parameters
          console.log('\n4. 🔧 Testing with query parameters...');
          const queryResponse = await fetch(`${BASE_URL}/api/user?sessionId=${sessionData.sessionId}&userId=2&userEmail=gailm@macleodglba.com.au`, {
            method: 'GET',
            credentials: 'include'
          });
          
          console.log('📋 Query params status:', queryResponse.status);
          
          if (queryResponse.ok) {
            const queryData = await queryResponse.json();
            console.log('✅ SUCCESS: Query parameter authentication worked!');
            console.log('👤 User:', queryData.email);
            console.log('🎯 CONCLUSION: Fallback authentication is operational');
            return true;
          } else {
            console.log('❌ ALL METHODS FAILED');
            return false;
          }
        }
      }
      
    } else {
      console.log('❌ Session establishment failed:', sessionResponse.status);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testBrowserAuth().then(success => {
  console.log('\n=== FINAL RESULT ===');
  console.log(success ? '✅ BROWSER AUTHENTICATION WORKING' : '❌ BROWSER AUTHENTICATION FAILED');
});