/**
 * COOKIE PERSISTENCE TEST
 * Tests that session cookies are properly set and transmitted
 */

const axios = require('axios');

async function testCookiePersistence() {
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  // Track cookies manually
  let sessionCookie = null;
  
  console.log('🍪 COOKIE PERSISTENCE TEST');
  console.log('Target:', baseUrl);
  console.log('Time:', new Date().toISOString());
  
  let results = {
    sessionEstablishment: false,
    cookieSet: false,
    cookieTransmitted: false,
    apiCallsWorking: false,
    noCookieFailure: false
  };
  
  try {
    // Step 1: Establish session and capture cookie
    console.log('\n🔍 Step 1: Establishing session and capturing cookie...');
    const sessionResponse = await axios.post(`${baseUrl}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au'
    }, {
      withCredentials: true,
      timeout: 30000
    });
    
    if (sessionResponse.status === 200) {
      console.log('✅ Session established successfully');
      console.log('Session ID:', sessionResponse.data.sessionId);
      results.sessionEstablishment = true;
      
      // Check if Set-Cookie header was returned
      const setCookieHeader = sessionResponse.headers['set-cookie'];
      console.log('🍪 Set-Cookie header:', setCookieHeader);
      
      if (setCookieHeader && setCookieHeader.length > 0) {
        console.log('✅ Cookies were set in response');
        results.cookieSet = true;
        
        // Extract the signed session cookie (the one with s%3A prefix)
        const sessionCookieHeader = setCookieHeader.find(cookie => 
          cookie.includes('theagencyiq.session=s%3A')
        );
        
        if (sessionCookieHeader) {
          sessionCookie = sessionCookieHeader.split(';')[0];
          console.log('📋 Signed session cookie extracted:', sessionCookie);
        } else {
          // Fallback to unsigned cookie if signed not found
          const unsignedCookie = setCookieHeader.find(cookie => 
            cookie.includes('theagencyiq.session=') && !cookie.includes('s%3A')
          );
          if (unsignedCookie) {
            sessionCookie = unsignedCookie.split(';')[0];
            console.log('📋 Unsigned session cookie extracted:', sessionCookie);
          }
        }
      } else {
        console.log('❌ No Set-Cookie header found');
      }
    }
    
    // Step 2: Test API call with session cookie
    console.log('\n🔍 Step 2: Testing API call with session cookie...');
    const userResponse = await axios.get(`${baseUrl}/api/user`, {
      withCredentials: true,
      headers: {
        'Cookie': sessionCookie || ''
      },
      timeout: 30000
    });
    
    if (userResponse.status === 200) {
      console.log('✅ API call successful with cookies');
      console.log('User:', userResponse.data.email);
      results.cookieTransmitted = true;
      results.apiCallsWorking = true;
    }
    
    // Step 3: Test API call without cookie jar (should fail)
    console.log('\n🔍 Step 3: Testing API call without cookies (should fail)...');
    try {
      const noCookieResponse = await axios.get(`${baseUrl}/api/user`, {
        withCredentials: true,
        timeout: 30000
      });
      
      if (noCookieResponse.status === 401) {
        console.log('✅ API call properly failed without cookies');
        results.noCookieFailure = true;
      } else {
        console.log('❌ API call should have failed without cookies');
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ API call properly failed without cookies (401)');
        results.noCookieFailure = true;
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    
    // Step 4: Test user-status endpoint
    console.log('\n🔍 Step 4: Testing user-status endpoint with cookies...');
    const statusResponse = await axios.get(`${baseUrl}/api/user-status`, {
      withCredentials: true,
      headers: {
        'Cookie': sessionCookie || ''
      },
      timeout: 30000
    });
    
    if (statusResponse.status === 200) {
      console.log('✅ User status endpoint working with cookies');
      console.log('Subscription:', statusResponse.data.subscriptionPlan);
      console.log('Posts used:', statusResponse.data.postsUsed);
    }
    
    // Step 5: Test platform connections endpoint  
    console.log('\n🔍 Step 5: Testing platform connections endpoint with cookies...');
    const connectionsResponse = await axios.get(`${baseUrl}/api/platform-connections`, {
      withCredentials: true,
      headers: {
        'Cookie': sessionCookie || ''
      },
      timeout: 30000
    });
    
    if (connectionsResponse.status === 200) {
      console.log('✅ Platform connections endpoint working with cookies');
      console.log('Connected platforms:', connectionsResponse.data.platforms?.length || 0);
    }
    
  } catch (error) {
    console.error('❌ Cookie persistence test failed:', error.response?.data || error.message);
    return results;
  }
  
  return results;
}

// Run test
testCookiePersistence().then(results => {
  console.log('\n📊 COOKIE PERSISTENCE TEST RESULTS:');
  console.log(`   Session Establishment: ${results.sessionEstablishment ? '✅' : '❌'}`);
  console.log(`   Cookie Set: ${results.cookieSet ? '✅' : '❌'}`);
  console.log(`   Cookie Transmitted: ${results.cookieTransmitted ? '✅' : '❌'}`);
  console.log(`   API Calls Working: ${results.apiCallsWorking ? '✅' : '❌'}`);
  console.log(`   No Cookie Failure: ${results.noCookieFailure ? '✅' : '❌'}`);
  
  const successCount = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  const successRate = Math.round((successCount / totalTests) * 100);
  
  console.log(`\n🎯 SUCCESS RATE: ${successRate}% (${successCount}/${totalTests})`);
  console.log(`🎯 OVERALL RESULT: ${successRate === 100 ? 'PASS' : 'FAIL'}`);
  
  if (successRate === 100) {
    console.log('\n🎉 COOKIE PERSISTENCE WORKING PERFECTLY!');
    console.log('✅ Sessions establish and persist correctly');
    console.log('✅ Cookies are set and transmitted properly');
    console.log('✅ API authentication working with cookies');
    console.log('✅ Proper 401 errors without cookies');
  } else {
    console.log('\n❌ COOKIE PERSISTENCE ISSUES DETECTED');
    console.log('🔧 Review cookie configuration and transmission');
  }
  
  process.exit(successRate === 100 ? 0 : 1);
});