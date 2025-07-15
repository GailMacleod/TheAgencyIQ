/**
 * Browser Session Test - Verify session persistence in browser environment
 */

const axios = require('axios');
const tough = require('tough-cookie');
const axiosCookiejarSupport = require('axios-cookiejar-support');

// Configure axios with cookie support
const jar = new tough.CookieJar();
axiosCookiejarSupport.default(axios);
const client = axios.create({
  jar,
  withCredentials: true,
  validateStatus: (status) => status < 500
});

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testBrowserSession() {
  console.log('🌐 BROWSER SESSION PERSISTENCE TEST');
  console.log('===================================');
  
  const results = [];
  
  try {
    // Step 1: Establish session
    console.log('🔍 Step 1: Establishing session...');
    const sessionResponse = await client.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    if (sessionResponse.status === 200) {
      const sessionData = sessionResponse.data;
      console.log('✅ Session established:', sessionData.user.email);
      results.push({ step: 'Session Establishment', status: 'PASSED', details: sessionData.user.email });
    } else {
      console.log('❌ Session establishment failed:', sessionResponse.status);
      results.push({ step: 'Session Establishment', status: 'FAILED', details: sessionResponse.status });
      return;
    }
    
    // Step 2: Test /api/user endpoint with session cookies
    console.log('🔍 Step 2: Testing /api/user endpoint...');
    const userResponse = await client.get(`${BASE_URL}/api/user`);
    
    if (userResponse.status === 200) {
      const userData = userResponse.data;
      console.log('✅ User data retrieved:', userData.email);
      results.push({ step: 'User Data Retrieval', status: 'PASSED', details: userData.email });
    } else {
      console.log('❌ User data retrieval failed:', userResponse.status);
      results.push({ step: 'User Data Retrieval', status: 'FAILED', details: userResponse.status });
    }
    
    // Step 3: Test /api/user-status endpoint 
    console.log('🔍 Step 3: Testing /api/user-status endpoint...');
    const statusResponse = await client.get(`${BASE_URL}/api/user-status`);
    
    if (statusResponse.status === 200) {
      const statusData = statusResponse.data;
      console.log('✅ User status retrieved:', statusData.subscriptionTier);
      results.push({ step: 'User Status Retrieval', status: 'PASSED', details: statusData.subscriptionTier });
    } else {
      console.log('❌ User status retrieval failed:', statusResponse.status);
      results.push({ step: 'User Status Retrieval', status: 'FAILED', details: statusResponse.status });
    }
    
    // Step 4: Test /api/platform-connections endpoint
    console.log('🔍 Step 4: Testing /api/platform-connections endpoint...');
    const platformResponse = await client.get(`${BASE_URL}/api/platform-connections`);
    
    if (platformResponse.status === 200) {
      const platformData = platformResponse.data;
      console.log('✅ Platform connections retrieved:', platformData.length + ' platforms');
      results.push({ step: 'Platform Connections', status: 'PASSED', details: platformData.length + ' platforms' });
    } else {
      console.log('❌ Platform connections retrieval failed:', platformResponse.status);
      results.push({ step: 'Platform Connections', status: 'FAILED', details: platformResponse.status });
    }
    
    // Step 5: Test session persistence across multiple requests
    console.log('🔍 Step 5: Testing session persistence across multiple requests...');
    const persistenceTests = [];
    
    for (let i = 0; i < 3; i++) {
      const testResponse = await client.get(`${BASE_URL}/api/user`);
      persistenceTests.push(testResponse.status === 200);
    }
    
    const persistenceSuccess = persistenceTests.every(test => test);
    
    if (persistenceSuccess) {
      console.log('✅ Session persistence verified across 3 requests');
      results.push({ step: 'Session Persistence', status: 'PASSED', details: '3/3 requests successful' });
    } else {
      console.log('❌ Session persistence failed');
      results.push({ step: 'Session Persistence', status: 'FAILED', details: 'Request failures detected' });
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    results.push({ step: 'Test Execution', status: 'FAILED', details: error.message });
  }
  
  // Generate report
  console.log('\n📊 BROWSER SESSION TEST REPORT');
  console.log('===============================');
  
  const passedTests = results.filter(r => r.status === 'PASSED').length;
  const totalTests = results.length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log(`✅ Passed: ${passedTests}/${totalTests} tests (${successRate}%)`);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  results.forEach(result => {
    const icon = result.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${result.step}: ${result.details}`);
  });
  
  if (successRate === '100.0') {
    console.log('\n🎉 BROWSER SESSION PERSISTENCE - 100% SUCCESS!');
    console.log('✅ System ready for production deployment');
  } else {
    console.log(`\n⚠️  BROWSER SESSION PERSISTENCE - ${successRate}% SUCCESS`);
    console.log('❌ Issues detected - review failed tests');
  }
}

testBrowserSession().catch(console.error);