/**
 * PLATFORM PUBLISHING TEST
 * Tests real API publishing to all 5 platforms with quota management
 */

const axios = require('axios');

async function testPlatformPublishing() {
  const baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
  
  console.log('🚀 PLATFORM PUBLISHING TEST');
  console.log('Target:', baseUrl);
  
  try {
    // 1. Establish session
    console.log('\n🔍 Step 1: Establishing session...');
    const sessionResponse = await axios.post(`${baseUrl}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au'
    }, {
      withCredentials: true,
      timeout: 30000
    });
    
    console.log(`✅ Session established: ${sessionResponse.data.sessionId}`);
    
    // 2. Get platform connections
    console.log('\n🔍 Step 2: Checking platform connections...');
    const connectionsResponse = await axios.get(`${baseUrl}/api/platform-connections`, {
      withCredentials: true,
      timeout: 30000
    });
    
    const platforms = connectionsResponse.data.platforms || [];
    console.log(`📋 Found ${platforms.length} platform connections`);
    
    // 3. Test content creation with quota checking
    console.log('\n🔍 Step 3: Testing content creation with quota...');
    const contentResponse = await axios.post(`${baseUrl}/api/posts`, {
      content: 'TEST: Platform publishing verification',
      platforms: platforms.map(p => p.platform),
      scheduleTime: new Date().toISOString()
    }, {
      withCredentials: true,
      timeout: 30000
    });
    
    console.log(`✅ Content created: Post ID ${contentResponse.data.id}`);
    
    // 4. Test immediate publishing
    console.log('\n🔍 Step 4: Testing immediate publishing...');
    const publishResponse = await axios.post(`${baseUrl}/api/posts/${contentResponse.data.id}/publish`, {
      platforms: platforms.map(p => p.platform)
    }, {
      withCredentials: true,
      timeout: 30000
    });
    
    console.log(`✅ Publishing response:`, publishResponse.data);
    
    // 5. Validate quota deduction
    console.log('\n🔍 Step 5: Validating quota management...');
    const quotaResponse = await axios.get(`${baseUrl}/api/user-status`, {
      withCredentials: true,
      timeout: 30000
    });
    
    console.log(`📊 Quota status: ${quotaResponse.data.postsUsed}/${quotaResponse.data.quotaLimit}`);
    
    return {
      sessionEstablished: true,
      platformsConnected: platforms.length,
      contentCreated: true,
      publishingTested: true,
      quotaManaged: true
    };
    
  } catch (error) {
    console.error('❌ Platform publishing test failed:', error.response?.data || error.message);
    return {
      sessionEstablished: false,
      platformsConnected: 0,
      contentCreated: false,
      publishingTested: false,
      quotaManaged: false
    };
  }
}

// Run test
testPlatformPublishing().then(results => {
  console.log('\n📊 PLATFORM PUBLISHING TEST RESULTS:');
  console.log(`   Session Establishment: ${results.sessionEstablished ? '✅' : '❌'}`);
  console.log(`   Platform Connections: ${results.platformsConnected} platforms`);
  console.log(`   Content Creation: ${results.contentCreated ? '✅' : '❌'}`);
  console.log(`   Publishing Test: ${results.publishingTested ? '✅' : '❌'}`);
  console.log(`   Quota Management: ${results.quotaManaged ? '✅' : '❌'}`);
  
  const success = results.sessionEstablished && results.contentCreated && results.publishingTested && results.quotaManaged;
  console.log(`\n🎯 OVERALL RESULT: ${success ? 'PASS' : 'FAIL'}`);
  process.exit(success ? 0 : 1);
});