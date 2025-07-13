/**
 * Browser Session Test Evidence
 * Test session behavior from browser perspective
 */

const axios = require('axios');
const tough = require('tough-cookie');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testBrowserSession() {
  console.log('🌐 BROWSER SESSION TEST EVIDENCE');
  console.log('='.repeat(60));
  
  // Test 1: Check if user can access the platform via browser
  console.log('\n1️⃣ TESTING BROWSER ACCESS');
  console.log('-'.repeat(40));
  
  try {
    const response = await axios.get(`${BASE_URL}/api/user`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Browser Test)',
        'Accept': 'application/json'
      }
    });
    
    console.log('📋 Browser /api/user Response:', response.status);
    console.log('📋 User Data:', response.data);
    
  } catch (error) {
    console.log('📋 Browser /api/user Response:', error.response?.status || 'ERROR');
    console.log('📋 Error Message:', error.response?.data?.message || error.message);
  }
  
  // Test 2: Check session establishment endpoint
  console.log('\n2️⃣ TESTING SESSION ESTABLISHMENT');
  console.log('-'.repeat(40));
  
  try {
    const sessionResponse = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Browser Test)'
      }
    });
    
    console.log('📋 Session Establishment Response:', sessionResponse.status);
    console.log('📋 Session Data:', sessionResponse.data);
    
  } catch (error) {
    console.log('📋 Session Establishment Response:', error.response?.status || 'ERROR');
    console.log('📋 Error Message:', error.response?.data?.message || error.message);
  }
  
  // Test 3: Check platform connections with session
  console.log('\n3️⃣ TESTING PLATFORM CONNECTIONS WITH SESSION');
  console.log('-'.repeat(40));
  
  const cookieJar = new tough.CookieJar();
  const sessionAxios = axios.create({
    jar: cookieJar,
    withCredentials: true
  });
  
  try {
    // First establish session
    await sessionAxios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    });
    
    // Then try platform connections
    const connectionsResponse = await sessionAxios.get(`${BASE_URL}/api/platform-connections`);
    
    console.log('📋 Platform Connections Response:', connectionsResponse.status);
    console.log('📋 Connections Data:', connectionsResponse.data);
    
  } catch (error) {
    console.log('📋 Platform Connections Response:', error.response?.status || 'ERROR');
    console.log('📋 Error Message:', error.response?.data?.message || error.message);
  }
}

testBrowserSession();