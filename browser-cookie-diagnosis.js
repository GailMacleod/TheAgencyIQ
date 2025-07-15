/**
 * Browser Cookie Diagnosis
 * Check if the real browser is accepting cookies
 */

async function diagnoseBrowserCookies() {
  console.log('🔍 BROWSER COOKIE DIAGNOSIS');
  console.log('============================');
  
  const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  try {
    // Clear any existing cookies first
    document.cookie = 'theagencyiq.session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
    console.log('🧹 Cleared existing cookies');
    
    // Check current cookies before session establishment
    console.log('🔍 Cookies before session:', document.cookie);
    
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
      
      // Check cookies immediately after session establishment
      console.log('🔍 Cookies IMMEDIATELY after session:', document.cookie);
      
      // Wait 2 seconds to see if cookies appear
      console.log('\n2. ⏱️ Waiting 2 seconds for cookies to settle...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('🔍 Cookies after 2 seconds:', document.cookie);
      
      // 3. Try to make authenticated request
      console.log('\n3. 🔍 Testing authenticated request...');
      const userResponse = await fetch(`${BASE_URL}/api/user`, {
        method: 'GET',
        credentials: 'include'
      });
      
      console.log('📋 User endpoint status:', userResponse.status);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('✅ SUCCESS: Authenticated successfully!');
        console.log('👤 User:', userData.email);
        console.log('🔍 Final cookies:', document.cookie);
      } else {
        console.log('❌ FAILED: Authentication failed');
        const errorData = await userResponse.json();
        console.log('🔍 Error:', errorData);
        console.log('🔍 Final cookies:', document.cookie);
        
        // 4. Let's check if setting cookies manually works
        console.log('\n4. 🔧 Testing manual cookie setting...');
        document.cookie = `theagencyiq.session=s%3A${sessionData.sessionId}.test; path=/; secure; samesite=lax`;
        console.log('🔧 Manually set cookie:', document.cookie);
        
        // Try request again
        const retryResponse = await fetch(`${BASE_URL}/api/user`, {
          method: 'GET',
          credentials: 'include'
        });
        
        console.log('📋 Retry request status:', retryResponse.status);
        if (retryResponse.ok) {
          const retryData = await retryResponse.json();
          console.log('✅ SUCCESS after manual cookie setting!');
          console.log('👤 User:', retryData.email);
        } else {
          console.log('❌ Still failed after manual cookie setting');
        }
      }
      
    } else {
      console.log('❌ Session establishment failed:', sessionResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
diagnoseBrowserCookies();