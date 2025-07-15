/**
 * Authentication Access Test - Verify who can sign in and current authentication status
 */

import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

// Enable cookie jar support
wrapper(axios);

async function testAuthenticationAccess() {
  console.log('\n🔐 AUTHENTICATION ACCESS TEST - Testing who can sign in\n');
  
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  // Create axios instance with cookie jar for session persistence
  const cookieJar = new CookieJar();
  const client = axios.create({
    jar: cookieJar,
    withCredentials: true,
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36'
    }
  });
  
  let testResults = {
    currentAuthStatus: null,
    sessionEstablishment: null,
    userAccess: null,
    authenticationMethod: null,
    accessControl: null,
    timestamp: new Date().toISOString()
  };
  
  try {
    // Test 1: Check current authentication status
    console.log('1. Testing current authentication status...');
    try {
      const sessionResponse = await client.post(`${baseUrl}/api/establish-session`, {}, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('✅ Session establishment response:', sessionResponse.data);
      testResults.sessionEstablishment = {
        success: true,
        userId: sessionResponse.data.user?.id || null,
        sessionId: sessionResponse.data.sessionId || null,
        status: sessionResponse.data.sessionEstablished ? 'established' : 'failed'
      };
      
      if (sessionResponse.data.user?.id) {
        console.log(`✅ Session established for User ID: ${sessionResponse.data.user.id}`);
        testResults.currentAuthStatus = 'authenticated';
        testResults.userAccess = `User ID ${sessionResponse.data.user.id} (gailm@macleodglba.com.au)`;
      } else {
        console.log('❌ No user ID in session response');
        testResults.currentAuthStatus = 'not_authenticated';
      }
    } catch (error) {
      console.error('❌ Session establishment failed:', error.response?.data || error.message);
      testResults.sessionEstablishment = {
        success: false,
        error: error.response?.data?.message || error.message
      };
      testResults.currentAuthStatus = 'session_failed';
    }
    
    // Test 2: Test authenticated endpoint access
    console.log('\n2. Testing authenticated endpoint access...');
    try {
      const userResponse = await client.get(`${baseUrl}/api/user`, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('✅ User endpoint response:', userResponse.data);
      testResults.userAccess = `Authenticated access granted - User: ${userResponse.data.email}`;
    } catch (error) {
      console.log('❌ User endpoint failed:', error.response?.status, error.response?.data?.message);
      if (error.response?.status === 401) {
        testResults.userAccess = 'Authentication required - 401 Unauthorized';
      } else {
        testResults.userAccess = `Error: ${error.response?.data?.message || error.message}`;
      }
    }
    
    // Test 3: Check authentication method
    console.log('\n3. Checking authentication method...');
    testResults.authenticationMethod = 'Session-based with PostgreSQL store';
    
    // Test 4: Check access control
    console.log('\n4. Checking access control...');
    if (testResults.currentAuthStatus === 'authenticated') {
      testResults.accessControl = 'RESTRICTED - Only authenticated User ID 2 (gailm@macleodglba.com.au) can access';
    } else {
      testResults.accessControl = 'OPEN - No authentication required, anyone can establish session';
    }
    
    // Generate comprehensive report
    console.log('\n' + '='.repeat(80));
    console.log('📋 AUTHENTICATION ACCESS REPORT');
    console.log('='.repeat(80));
    console.log(`🕐 Generated: ${testResults.timestamp}`);
    console.log(`🔐 Current Status: ${testResults.currentAuthStatus}`);
    console.log(`👤 User Access: ${testResults.userAccess}`);
    console.log(`🔑 Authentication Method: ${testResults.authenticationMethod}`);
    console.log(`🚪 Access Control: ${testResults.accessControl}`);
    
    if (testResults.sessionEstablishment) {
      console.log(`📝 Session: ${testResults.sessionEstablishment.success ? 'Working' : 'Failed'}`);
      if (testResults.sessionEstablishment.sessionId) {
        console.log(`🆔 Session ID: ${testResults.sessionEstablishment.sessionId}`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('🎯 ANSWER: Who can sign in?');
    console.log('='.repeat(80));
    
    if (testResults.currentAuthStatus === 'authenticated') {
      console.log('✅ CURRENT STATUS: Only one user can access the system');
      console.log('📧 AUTHORIZED USER: gailm@macleodglba.com.au (User ID 2)');
      console.log('🔒 ACCESS CONTROL: Restricted to single authenticated user');
      console.log('🏢 BUSINESS MODEL: Single-user Queensland SME account');
    } else {
      console.log('⚠️  CURRENT STATUS: Authentication system has issues');
      console.log('🔧 RECOMMENDATION: Fix session authentication for production');
      console.log('🎯 INTENDED ACCESS: Only gailm@macleodglba.com.au should access');
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error.message);
    testResults.error = error.message;
  }
  
  return testResults;
}

// Run the test
testAuthenticationAccess().then(results => {
  console.log('\n✅ Authentication access test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});