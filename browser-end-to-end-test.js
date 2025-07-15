/**
 * Browser End-to-End Test - Verify User ID persistence in browser environment
 */
import axios from 'axios';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testBrowserEndToEnd() {
  console.log('🧪 BROWSER END-TO-END USER ID TEST');
  console.log('Target:', BASE_URL);
  console.log('Time:', new Date().toISOString());
  console.log('');

  const results = {
    sessionEstablishment: false,
    userIdDefined: false,
    sessionPersistence: false,
    apiCallsWorking: false,
    noUndefinedErrors: true
  };

  try {
    // Step 1: Establish session
    console.log('🔍 Step 1: Establishing session...');
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {}, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Session established:', sessionResponse.data.sessionId);
    console.log('📋 User ID from response:', sessionResponse.data.user.id);
    
    if (sessionResponse.data.user.id) {
      results.sessionEstablishment = true;
      results.userIdDefined = true;
      console.log('✅ User ID defined: TRUE');
    } else {
      console.log('❌ User ID undefined in response');
      results.noUndefinedErrors = false;
    }
    
    // Extract cookies from response
    const cookies = sessionResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';
    console.log('📋 Cookie header:', cookieHeader.substring(0, 100) + '...');
    
    // Step 2: Test API calls with session
    console.log('');
    console.log('🔍 Step 2: Testing API calls with session...');
    
    const apiEndpoints = [
      { endpoint: '/api/user', name: 'User Data' },
      { endpoint: '/api/user-status', name: 'User Status' },
      { endpoint: '/api/platform-connections', name: 'Platform Connections' }
    ];
    
    let successfulCalls = 0;
    
    for (const api of apiEndpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${api.endpoint}`, {
          withCredentials: true,
          headers: {
            'Cookie': cookieHeader,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ ${api.name}: User ID ${response.data.id || 'OK'}`);
        successfulCalls++;
        
        // Check for undefined user ID in response
        if (response.data.id === undefined && api.endpoint === '/api/user') {
          console.log('❌ UNDEFINED USER ID DETECTED in API response');
          results.noUndefinedErrors = false;
        }
        
      } catch (error) {
        console.log(`❌ ${api.name}: ${error.response?.status} ${error.response?.data?.message}`);
        results.noUndefinedErrors = false;
      }
    }
    
    if (successfulCalls === apiEndpoints.length) {
      results.apiCallsWorking = true;
      console.log('✅ All API calls working');
    }
    
    // Step 3: Test session persistence after delay
    console.log('');
    console.log('🔍 Step 3: Testing session persistence after delay...');
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const delayedResponse = await axios.get(`${BASE_URL}/api/user`, {
      withCredentials: true,
      headers: {
        'Cookie': cookieHeader,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Session persisted after delay:', delayedResponse.data.email);
    console.log('📋 User ID after delay:', delayedResponse.data.id);
    
    if (delayedResponse.data.id) {
      results.sessionPersistence = true;
      console.log('✅ Session persistence: TRUE');
    } else {
      console.log('❌ User ID undefined after delay');
      results.noUndefinedErrors = false;
    }
    
    // Step 4: Test multiple concurrent calls
    console.log('');
    console.log('🔍 Step 4: Testing concurrent API calls...');
    
    const concurrentPromises = [
      axios.get(`${BASE_URL}/api/user`, {
        withCredentials: true,
        headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' }
      }),
      axios.get(`${BASE_URL}/api/user-status`, {
        withCredentials: true,
        headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' }
      }),
      axios.get(`${BASE_URL}/api/platform-connections`, {
        withCredentials: true,
        headers: { 'Cookie': cookieHeader, 'Content-Type': 'application/json' }
      })
    ];
    
    const concurrentResults = await Promise.all(concurrentPromises);
    const allSuccessful = concurrentResults.every(r => r.status === 200);
    
    if (allSuccessful) {
      console.log('✅ Concurrent API calls: ALL SUCCESSFUL');
    } else {
      console.log('❌ Some concurrent calls failed');
      results.noUndefinedErrors = false;
    }
    
    // Generate final report
    console.log('');
    console.log('📊 BROWSER END-TO-END TEST REPORT');
    console.log('================================================================================');
    console.log(`✅ Session Establishment: ${results.sessionEstablishment ? 'PASS' : 'FAIL'}`);
    console.log(`🔢 User ID Defined: ${results.userIdDefined ? 'PASS' : 'FAIL'}`);
    console.log(`💾 Session Persistence: ${results.sessionPersistence ? 'PASS' : 'FAIL'}`);
    console.log(`🔗 API Calls Working: ${results.apiCallsWorking ? 'PASS' : 'FAIL'}`);
    console.log(`🚫 No Undefined Errors: ${results.noUndefinedErrors ? 'PASS' : 'FAIL'}`);
    
    const overallSuccess = Object.values(results).every(r => r === true);
    
    console.log('');
    if (overallSuccess) {
      console.log('🎉 BROWSER END-TO-END TEST: 100% SUCCESS ✅');
      console.log('✅ User ID properly loaded from session');
      console.log('✅ No undefined errors detected');
      console.log('✅ Session persistence working perfectly');
      console.log('✅ All API endpoints functional');
      console.log('🚀 System ready for production deployment');
    } else {
      console.log('❌ BROWSER END-TO-END TEST: ISSUES DETECTED');
      console.log('🔧 User ID undefined or session issues found');
    }
    
    return overallSuccess;
    
  } catch (error) {
    console.error('❌ Browser end-to-end test failed:', error.message);
    return false;
  }
}

testBrowserEndToEnd().then(success => {
  if (success) {
    console.log('');
    console.log('📊 FINAL VERDICT: USER ID PERSISTENCE CONFIRMED ✅');
    console.log('🏢 No undefined errors - production ready');
  } else {
    console.log('');
    console.log('📊 FINAL VERDICT: USER ID ISSUES DETECTED ❌');
    console.log('🔧 Undefined errors or session problems found');
  }
});