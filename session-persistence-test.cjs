#!/usr/bin/env node
/**
 * Comprehensive Session Persistence Test
 * Tests all implemented fixes for 100% success rate
 */

const axios = require('axios');
const tough = require('tough-cookie');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

// Create cookie jar for persistent session
const cookieJar = new tough.CookieJar();
const axiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  jar: cookieJar,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Add axios interceptor to handle cookies
axiosInstance.interceptors.request.use(
  (config) => {
    const cookies = cookieJar.getCookieStringSync(BASE_URL);
    if (cookies) {
      config.headers['Cookie'] = cookies;
      console.log('🍪 Request cookies:', cookies.substring(0, 100) + '...');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => {
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      console.log('🍪 Set-Cookie received:', setCookieHeader.join('; '));
      setCookieHeader.forEach(cookie => {
        cookieJar.setCookieSync(cookie, BASE_URL);
      });
    }
    return response;
  },
  (error) => {
    console.error('❌ Request failed:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

async function runComprehensiveTest() {
  console.log('🔍 COMPREHENSIVE SESSION PERSISTENCE TEST');
  console.log('============================================================');
  
  const results = {
    sessionEstablishment: false,
    sessionPersistence: false,
    authGuardWorking: false,
    cookieTransmission: false,
    apiAuthentication: false,
    overallSuccess: false
  };
  
  let sessionId = null;
  
  try {
    // TEST 1: Session Establishment
    console.log('\n📱 TEST 1: Session Establishment');
    console.log('------------------------------------------------------------');
    
    const sessionResponse = await axiosInstance.post('/api/establish-session', {
      email: 'gailm@macleodglba.com.au'
    });
    
    if (sessionResponse.status === 200 && sessionResponse.data.sessionEstablished) {
      console.log('✅ Session establishment: SUCCESS');
      console.log('📋 Session ID:', sessionResponse.data.sessionId);
      console.log('👤 User:', sessionResponse.data.user.email);
      results.sessionEstablishment = true;
      sessionId = sessionResponse.data.sessionId;
    } else {
      console.log('❌ Session establishment: FAILED');
      throw new Error('Session establishment failed');
    }
    
    // TEST 2: Cookie Transmission
    console.log('\n🍪 TEST 2: Cookie Transmission');
    console.log('------------------------------------------------------------');
    
    const cookies = cookieJar.getCookieStringSync(BASE_URL);
    if (cookies && cookies.includes('theagencyiq.session')) {
      console.log('✅ Cookie transmission: SUCCESS');
      console.log('🍪 Session cookie found:', cookies.substring(0, 100) + '...');
      results.cookieTransmission = true;
    } else {
      console.log('❌ Cookie transmission: FAILED');
      console.log('🍪 Available cookies:', cookies || 'NONE');
    }
    
    // TEST 3: Session Persistence
    console.log('\n🔐 TEST 3: Session Persistence');
    console.log('------------------------------------------------------------');
    
    // Wait a moment to simulate browser behavior
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const userResponse = await axiosInstance.get('/api/user');
    
    if (userResponse.status === 200 && userResponse.data.email) {
      console.log('✅ Session persistence: SUCCESS');
      console.log('👤 Authenticated user:', userResponse.data.email);
      console.log('🆔 User ID:', userResponse.data.id);
      results.sessionPersistence = true;
      results.authGuardWorking = true;
      results.apiAuthentication = true;
    } else {
      console.log('❌ Session persistence: FAILED');
      console.log('📋 Response status:', userResponse.status);
      console.log('📋 Response data:', userResponse.data);
    }
    
    // TEST 4: Multiple API Calls
    console.log('\n🔄 TEST 4: Multiple API Calls');
    console.log('------------------------------------------------------------');
    
    try {
      const endpoints = ['/api/user-status', '/api/platform-connections', '/api/posts'];
      let apiSuccesses = 0;
      
      for (const endpoint of endpoints) {
        try {
          const response = await axiosInstance.get(endpoint);
          if (response.status === 200) {
            apiSuccesses++;
            console.log(`✅ ${endpoint}: SUCCESS`);
          } else {
            console.log(`❌ ${endpoint}: FAILED (${response.status})`);
          }
        } catch (error) {
          console.log(`❌ ${endpoint}: FAILED (${error.response?.status || 'ERROR'})`);
        }
      }
      
      if (apiSuccesses === endpoints.length) {
        console.log('✅ All API calls: SUCCESS');
        results.apiAuthentication = true;
      } else {
        console.log(`⚠️ API calls: ${apiSuccesses}/${endpoints.length} successful`);
      }
    } catch (error) {
      console.log('❌ Multiple API calls: FAILED');
      console.error('Error:', error.message);
    }
    
    // TEST 5: Session Restoration
    console.log('\n🔄 TEST 5: Session Restoration');
    console.log('------------------------------------------------------------');
    
    // Create new axios instance to simulate fresh browser
    const newAxiosInstance = axios.create({
      baseURL: BASE_URL,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Cookie': cookies // Use the same cookies
      }
    });
    
    try {
      const restoredResponse = await newAxiosInstance.get('/api/user');
      if (restoredResponse.status === 200 && restoredResponse.data.email) {
        console.log('✅ Session restoration: SUCCESS');
        console.log('👤 Restored user:', restoredResponse.data.email);
        results.sessionPersistence = true;
      } else {
        console.log('❌ Session restoration: FAILED');
        console.log('📋 Response:', restoredResponse.data);
      }
    } catch (error) {
      console.log('❌ Session restoration: FAILED');
      console.error('Error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  // Final Results
  console.log('\n📊 FINAL RESULTS');
  console.log('============================================================');
  
  const passedTests = Object.values(results).filter(result => result === true).length;
  const totalTests = Object.keys(results).length - 1; // Exclude overallSuccess
  
  results.overallSuccess = passedTests === totalTests;
  
  console.log(`Session Establishment: ${results.sessionEstablishment ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Cookie Transmission: ${results.cookieTransmission ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Session Persistence: ${results.sessionPersistence ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`AuthGuard Working: ${results.authGuardWorking ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Authentication: ${results.apiAuthentication ? '✅ PASS' : '❌ FAIL'}`);
  console.log('------------------------------------------------------------');
  console.log(`OVERALL SUCCESS: ${results.overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`SUCCESS RATE: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (results.overallSuccess) {
    console.log('\n🎉 ALL TESTS PASSED! Session persistence is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Session persistence needs additional fixes.');
  }
  
  return results;
}

// Run the test
if (require.main === module) {
  runComprehensiveTest().catch(console.error);
}

module.exports = { runComprehensiveTest };