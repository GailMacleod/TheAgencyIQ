/**
 * Session Persistence Test
 * Tests that session cookies are properly maintained across requests
 */

import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

// Create a proper cookie jar for session management
const jar = new CookieJar();
const client = wrapper(axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  jar: jar, // Use the cookie jar
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'User-Agent': 'TheAgencyIQ-SessionTest/1.0'
  }
}));

async function testSessionPersistence() {
  console.log('🔍 TESTING SESSION PERSISTENCE ACROSS REQUESTS\n');
  
  try {
    // Step 1: Establish session
    console.log('📋 Step 1: Establishing session...');
    const sessionResponse = await client.post('/api/auth/establish-session', {});
    
    console.log('✅ Session establishment response:');
    console.log(`   Status: ${sessionResponse.status}`);
    console.log(`   Success: ${sessionResponse.data.success}`);
    console.log(`   User: ${sessionResponse.data.user?.email || 'N/A'}`);
    console.log(`   Session ID: ${sessionResponse.data.sessionId || 'N/A'}`);
    
    // Check cookies after establishment
    const cookiesAfterSession = await jar.getCookies(BASE_URL);
    console.log('\n🍪 Cookies after session establishment:');
    cookiesAfterSession.forEach(cookie => {
      console.log(`   ${cookie.key}=${cookie.value}`);
    });
    
    // Step 2: Test API call with same session
    console.log('\n📋 Step 2: Testing API call with established session...');
    const userResponse = await client.get('/api/user');
    
    console.log('✅ User API response:');
    console.log(`   Status: ${userResponse.status}`);
    console.log(`   User ID: ${userResponse.data.id || 'N/A'}`);
    console.log(`   Email: ${userResponse.data.email || 'N/A'}`);
    
    // Step 3: Test another API call
    console.log('\n📋 Step 3: Testing user-status API call...');
    const statusResponse = await client.get('/api/user-status');
    
    console.log('✅ User status response:');
    console.log(`   Status: ${statusResponse.status}`);
    console.log(`   Authenticated: ${statusResponse.data.authenticated}`);
    console.log(`   User ID: ${statusResponse.data.userId || 'N/A'}`);
    
    // Step 4: Test post creation
    console.log('\n📋 Step 4: Testing post creation...');
    const postResponse = await client.post('/api/posts', {
      content: 'Test post for session persistence validation',
      platform: 'facebook'
    });
    
    console.log('✅ Post creation response:');
    console.log(`   Status: ${postResponse.status}`);
    console.log(`   Post ID: ${postResponse.data.id || 'N/A'}`);
    
    console.log('\n🎉 SESSION PERSISTENCE TEST COMPLETED SUCCESSFULLY');
    
  } catch (error) {
    console.error('❌ Session persistence test failed:', error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data)}`);
    }
    
    // Show cookies even on failure
    const cookiesOnFailure = await jar.getCookies(BASE_URL);
    console.log('\n🍪 Cookies on failure:');
    cookiesOnFailure.forEach(cookie => {
      console.log(`   ${cookie.key}=${cookie.value}`);
    });
  }
}

testSessionPersistence();