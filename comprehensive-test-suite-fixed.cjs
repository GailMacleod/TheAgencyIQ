const axios = require('axios');
const assert = require('assert');

// Configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const TEST_EMAIL = 'gailm@macleodglba.com.au';
const TEST_USER_ID = 2;

// API client
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 10000
});

// Test Results
const results = {
  passed: 0,
  failed: 0,
  total: 0,
  tests: []
};

// Test Helper
function test(name, fn) {
  return async () => {
    results.total++;
    try {
      await fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS', error: null });
      console.log(`✅ ${name}`);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`❌ ${name}: ${error.message}`);
    }
  };
}

// Main Test Suite
async function runComprehensiveTestSuite() {
  console.log('🚀 THEAGENCYIQ COMPREHENSIVE TEST SUITE');
  console.log('========================================');
  
  let sessionCookie;
  
  // 1. Authentication and Session Management
  console.log('\n📝 AUTHENTICATION & SESSION MANAGEMENT');
  
  await test('Session establishment', async () => {
    const res = await api.post('/api/establish-session', { 
      email: TEST_EMAIL, 
      phone: '+61424835189' 
    });
    assert.strictEqual(res.status, 200);
    assert(res.data.message.includes(TEST_EMAIL));
    sessionCookie = res.headers['set-cookie'];
    assert(sessionCookie, 'Session cookie not set');
  })();
  
  await test('Session persistence for /api/user', async () => {
    const res = await api.get('/api/user', { headers: { Cookie: sessionCookie } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.id, TEST_USER_ID);
    assert.strictEqual(res.data.email, TEST_EMAIL);
  })();
  
  await test('Unauthenticated request rejection', async () => {
    try {
      await api.get('/api/user');
      assert.fail('Should have failed with 401');
    } catch (err) {
      assert.strictEqual(err.response.status, 401);
      assert.strictEqual(err.response.data.message, 'Not authenticated');
    }
  })();
  
  // 2. Subscription Management
  console.log('\n💳 SUBSCRIPTION MANAGEMENT');
  
  await test('Professional subscription verification', async () => {
    const res = await api.get('/api/user', { headers: { Cookie: sessionCookie } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.id, TEST_USER_ID);
    assert.strictEqual(res.data.subscriptionPlan, 'professional');
    assert.strictEqual(res.data.subscriptionActive, true);
  })();
  
  // 3. Platform Connections
  console.log('\n🔗 PLATFORM CONNECTIONS');
  
  await test('Platform connections retrieval', async () => {
    const res = await api.get('/api/platform-connections', { headers: { Cookie: sessionCookie } });
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    console.log(`   Found ${res.data.length} platform connections`);
  })();
  
  await test('OAuth status validation', async () => {
    const res = await api.get('/api/platform-connections', { headers: { Cookie: sessionCookie } });
    assert.strictEqual(res.status, 200);
    
    res.data.forEach(connection => {
      assert(connection.platform, 'Platform property missing');
      assert(connection.oauthStatus, 'OAuth status missing');
      assert(typeof connection.oauthStatus.isValid === 'boolean', 'OAuth isValid not boolean');
    });
  })();
  
  // 4. Brand Purpose
  console.log('\n🎯 BRAND PURPOSE');
  
  await test('Brand purpose retrieval', async () => {
    const res = await api.get('/api/brand-purpose', { headers: { Cookie: sessionCookie } });
    assert.strictEqual(res.status, 200);
    assert(res.data.brandName, 'Brand name missing');
    assert(res.data.corePurpose, 'Core purpose missing');
    console.log(`   Brand: ${res.data.brandName} - ${res.data.corePurpose}`);
  })();
  
  // 5. Performance Tests
  console.log('\n⚡ PERFORMANCE TESTS');
  
  await test('API response time under 500ms', async () => {
    const start = Date.now();
    await api.get('/api/user', { headers: { Cookie: sessionCookie } });
    const duration = Date.now() - start;
    assert(duration < 500, `Response took ${duration}ms`);
    console.log(`   Response time: ${duration}ms`);
  })();
  
  await test('Concurrent request handling', async () => {
    const requests = Array(5).fill().map(() => api.get('/api/user', { headers: { Cookie: sessionCookie } }));
    const start = Date.now();
    const responses = await Promise.all(requests);
    const duration = Date.now() - start;
    responses.forEach(res => assert.strictEqual(res.status, 200));
    console.log(`   5 concurrent requests: ${duration}ms`);
  })();
  
  // 6. Security Tests
  console.log('\n🔒 SECURITY TESTS');
  
  await test('Session hijacking prevention', async () => {
    const fakeCookie = 'aiq_md0zs6te_sgugjv2alze=fake';
    try {
      const res = await api.get('/api/user', { headers: { Cookie: fakeCookie } });
      assert.fail('Invalid session should be rejected');
    } catch (err) {
      assert.strictEqual(err.response.status, 401, 'Invalid session should be rejected');
    }
  })();
  
  // 7. Post Creation
  console.log('\n📝 POST CREATION');
  
  await test('Post creation within quota', async () => {
    try {
      const res = await api.post('/api/posts', {
        content: 'Test post for comprehensive test suite',
        platform: 'instagram',
        status: 'draft'
      }, { headers: { Cookie: sessionCookie } });
      assert.strictEqual(res.status, 201);
      assert(res.data.id, 'Post ID missing');
      console.log(`   Created post ID: ${res.data.id}`);
    } catch (error) {
      console.log(`   Post creation issue: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  })();
  
  // 8. Analytics
  console.log('\n📊 ANALYTICS');
  
  await test('Analytics data retrieval', async () => {
    const res = await api.get('/api/analytics', { headers: { Cookie: sessionCookie } });
    assert.strictEqual(res.status, 200);
    assert(typeof res.data.totalPosts === 'number', 'Total posts not a number');
    assert(typeof res.data.totalReach === 'number', 'Total reach not a number');
    console.log(`   Analytics: ${res.data.totalPosts} posts, ${res.data.totalReach} reach`);
  })();
  
  // 9. Frontend Rendering
  console.log('\n🎨 FRONTEND RENDERING');
  
  await test('Application root loading', async () => {
    const res = await api.get('/', { headers: { Cookie: sessionCookie } });
    assert.strictEqual(res.status, 200);
    assert(res.data.includes('TheAgencyIQ') || res.data.includes('React') || res.data.includes('html'));
  })();
  
  // 10. AI Content Generation
  console.log('\n🤖 AI CONTENT GENERATION');
  
  await test('AI content generation', async () => {
    try {
      const res = await api.post('/api/generate-ai-content', {
        brandPurpose: 'Help small businesses grow online',
        platforms: ['instagram', 'linkedin'],
        count: 2
      }, { headers: { Cookie: sessionCookie } });
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.data.posts), 'Posts should be an array');
      console.log(`   Generated ${res.data.posts.length} AI posts`);
    } catch (error) {
      console.log(`   AI generation issue: ${error.response?.data?.message || error.message}`);
      throw error;
    }
  })();
  
  // 11. Quota Management
  console.log('\n📊 QUOTA MANAGEMENT');
  
  await test('Quota status check', async () => {
    const res = await api.get('/api/user', { headers: { Cookie: sessionCookie } });
    assert.strictEqual(res.status, 200);
    assert(typeof res.data.remainingPosts === 'number', 'Remaining posts not a number');
    assert(typeof res.data.totalPosts === 'number', 'Total posts not a number');
    console.log(`   Quota: ${res.data.remainingPosts} remaining, ${res.data.totalPosts} total`);
  })();
  
  // Final Results
  console.log('\n📋 COMPREHENSIVE TEST RESULTS');
  console.log('==============================');
  console.log(`✅ Tests Passed: ${results.passed}`);
  console.log(`❌ Tests Failed: ${results.failed}`);
  console.log(`📊 Total Tests: ${results.total}`);
  console.log(`🎯 Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`   - ${t.name}: ${t.error}`);
    });
  }
  
  console.log('\n🎉 COMPREHENSIVE TEST SUITE COMPLETE');
  
  return results;
}

// Run the test suite
runComprehensiveTestSuite().catch(console.error);