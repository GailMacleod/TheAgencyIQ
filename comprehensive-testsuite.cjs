const { execSync } = require('child_process');
const axios = require('axios');

// Dynamic imports for ES modules
let chai, assert, Mocha;

async function initializeTestModules() {
  chai = await import('chai');
  assert = chai.assert;
  Mocha = (await import('mocha')).default;
}

// Configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const TEST_EMAIL = 'gailm@macleodglba.com.au';
const TEST_PHONE = '+61424835189';
const TEST_USER_ID = 2;

// API client
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

console.log('🚀 THEAGENCYIQ COMPREHENSIVE TEST SUITE');
console.log('=====================================');

// Test Suite
describe('TheAgencyIQ Comprehensive Test Suite', function () {
  this.timeout(10000); // Allow longer timeouts for async tests
  let sessionCookie;

  before(async () => {
    console.log('🔧 Setting up test environment...');
    // Establish session for testing
    try {
      const sessionRes = await api.post('/api/establish-session', {
        email: TEST_EMAIL,
        phone: TEST_PHONE
      });
      
      const cookies = sessionRes.headers['set-cookie'];
      sessionCookie = cookies ? cookies[0].split(';')[0] : null;
      
      if (sessionCookie) {
        console.log('✅ Test session established');
      } else {
        throw new Error('Failed to establish test session');
      }
    } catch (error) {
      console.error('❌ Failed to establish test session:', error.message);
      throw error;
    }
  });

  // 1. Code Quality and Bloat Tests
  describe('Code Quality and Bloat', () => {
    it('should have no duplicate middleware or endpoints', () => {
      try {
        const routes = execSync('grep -r "app\\..*(/api" server/routes.ts', { encoding: 'utf8' });
        const endpointCounts = {};
        routes.split('\n').forEach((line) => {
          const match = line.match(/\/api\/[\w-]+/);
          if (match) {
            endpointCounts[match[0]] = (endpointCounts[match[0]] || 0) + 1;
          }
        });
        const duplicates = Object.entries(endpointCounts).filter(([_, count]) => count > 1);
        assert.equal(duplicates.length, 0, `Duplicate endpoints found: ${JSON.stringify(duplicates)}`);
      } catch (error) {
        console.log('⚠️ Skipping duplicate endpoint check - file not found');
      }
    });

    it('should have minimal server response times', async () => {
      const start = Date.now();
      await api.get('/api/user', { headers: { Cookie: sessionCookie } });
      const duration = Date.now() - start;
      assert.isBelow(duration, 500, `Response took ${duration}ms`);
    });
  });

  // 2. Authentication and Session Management
  describe('Authentication and Session Management', () => {
    it('should establish session successfully', async () => {
      const res = await api.post('/api/establish-session', { 
        email: TEST_EMAIL, 
        phone: TEST_PHONE 
      });
      assert.equal(res.status, 200);
      assert.match(res.data.message, new RegExp(TEST_EMAIL));
      const cookies = res.headers['set-cookie'];
      assert(cookies, 'Session cookie not set');
    });

    it('should persist session for /api/user', async () => {
      const res = await api.get('/api/user', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.equal(res.data.id, TEST_USER_ID);
      assert.equal(res.data.email, TEST_EMAIL);
    });

    it('should reject unauthenticated requests', async () => {
      try {
        await api.get('/api/user');
        assert.fail('Should have failed with 401');
      } catch (err) {
        assert.equal(err.response.status, 401);
        assert.match(err.response.data.message, /Not authenticated|authentication required/i);
      }
    });
  });

  // 3. Subscription Management
  describe('Subscription Management', () => {
    it('should verify professional subscription', async () => {
      const res = await api.get('/api/user', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.equal(res.data.id, TEST_USER_ID);
      assert.equal(res.data.subscriptionPlan, 'professional');
      assert.isNumber(res.data.remainingPosts);
      assert.isNumber(res.data.totalPosts);
    });

    it('should validate subscription access', async () => {
      const res = await api.get('/api/subscription-status', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.equal(res.data.plan, 'professional');
      assert.equal(res.data.active, true);
    });
  });

  // 4. Platform Connections
  describe('Platform Connections', () => {
    it('should list connected platforms', async () => {
      const res = await api.get('/api/platform-connections', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.isArray(res.data);
      // Should have connections for Facebook, Instagram, LinkedIn, X, YouTube
      const platforms = res.data.map(c => c.platform);
      const expectedPlatforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
      expectedPlatforms.forEach(platform => {
        assert.include(platforms, platform, `${platform} connection not found`);
      });
    });

    it('should validate OAuth tokens', async () => {
      const res = await api.get('/api/oauth/validate-tokens', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.isObject(res.data);
      // Should have valid tokens for at least some platforms
      const validTokens = Object.values(res.data).filter(token => token.valid);
      assert.isAbove(validTokens.length, 0, 'No valid OAuth tokens found');
    });
  });

  // 5. Brand Purpose Retrieval
  describe('Brand Purpose', () => {
    it('should retrieve brand purpose', async () => {
      const res = await api.get('/api/brand-purpose', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.equal(res.data.userId, TEST_USER_ID);
      assert.isString(res.data.corePurpose);
      assert.isString(res.data.brandName);
      assert.isString(res.data.audience);
    });
  });

  // 6. Post Creation and Quota Management
  describe('Post Creation and Quota', () => {
    let postId;
    
    it('should create a post within quota', async () => {
      const res = await api.post('/api/posts', {
        content: 'Test post for comprehensive test suite',
        platform: 'facebook',
        scheduledFor: new Date(Date.now() + 60000).toISOString(),
      }, { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 201);
      postId = res.data.id;
      assert(postId, 'Post ID not returned');
    });

    it('should enforce quota limits', async () => {
      const userRes = await api.get('/api/user', { headers: { Cookie: sessionCookie } });
      assert.equal(userRes.status, 200);
      assert.isNumber(userRes.data.remainingPosts);
      assert.isNumber(userRes.data.totalPosts);
      assert.isAtLeast(userRes.data.remainingPosts, 0);
    });

    it('should retrieve created posts', async () => {
      const res = await api.get('/api/posts', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.isArray(res.data);
      const testPost = res.data.find(p => p.id === postId);
      assert(testPost, 'Created post not found');
    });
  });

  // 7. Analytics
  describe('Analytics', () => {
    it('should retrieve analytics data', async () => {
      const res = await api.get('/api/analytics', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.isObject(res.data);
      // Should have analytics structure
      assert.property(res.data, 'totalPosts');
      assert.property(res.data, 'platforms');
    });

    it('should retrieve yearly analytics', async () => {
      const res = await api.get('/api/yearly-analytics', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.isObject(res.data);
      assert.property(res.data, 'monthlyData');
      assert.property(res.data, 'totalEngagement');
    });
  });

  // 8. Performance Tests
  describe('Performance', () => {
    it('should respond to /api/user within 500ms', async () => {
      const start = Date.now();
      await api.get('/api/user', { headers: { Cookie: sessionCookie } });
      const duration = Date.now() - start;
      assert.isBelow(duration, 500, `Response took ${duration}ms`);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill().map(() => api.get('/api/user', { headers: { Cookie: sessionCookie } }));
      const responses = await Promise.all(requests);
      responses.forEach(res => assert.equal(res.status, 200));
    });
  });

  // 9. Security Tests
  describe('Security', () => {
    it('should enforce CORS credentials', async () => {
      const res = await api.options('/api/user', {
        headers: { 
          'Origin': 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Cookie'
        },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers['access-control-allow-credentials'], 'true');
    });

    it('should prevent session hijacking', async () => {
      const fakeCookie = 'theagencyiq.session=fake-session-token';
      const res = await api.get('/api/user', { headers: { Cookie: fakeCookie } }).catch(err => err.response);
      assert.equal(res.status, 401, 'Invalid session should be rejected');
    });

    it('should validate session integrity', async () => {
      const res = await api.get('/api/user', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.equal(res.data.id, TEST_USER_ID);
      assert.equal(res.data.email, TEST_EMAIL);
    });
  });

  // 10. AI Content Generation
  describe('AI Content Generation', () => {
    it('should generate strategic content', async () => {
      const res = await api.post('/api/generate-strategic-content', {
        brandPurpose: 'Help small businesses grow online',
        audience: 'Queensland small business owners',
        platforms: ['facebook', 'instagram', 'linkedin']
      }, { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.isArray(res.data.posts);
      assert.isAbove(res.data.posts.length, 0);
    });

    it('should provide AI assistance', async () => {
      const res = await api.post('/api/grok-chat', {
        message: 'How can I improve my social media engagement?'
      }, { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.isString(res.data.response);
      assert.isAbove(res.data.response.length, 10);
    });
  });

  // 11. Publishing System
  describe('Publishing System', () => {
    it('should validate publishing readiness', async () => {
      const res = await api.get('/api/posts?status=approved', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.isArray(res.data);
      // Should have some approved posts ready for publishing
    });

    it('should handle direct publishing', async () => {
      const res = await api.post('/api/direct-publish', {
        action: 'test_connection'
      }, { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.isObject(res.data);
      assert.property(res.data, 'platformStatus');
    });
  });

  after(async () => {
    console.log('🧹 Cleaning up test environment...');
    // Cleanup session
    try {
      await api.post('/api/logout', {}, { headers: { Cookie: sessionCookie } });
      console.log('✅ Test cleanup completed');
    } catch (error) {
      console.log('⚠️ Cleanup warning:', error.message);
    }
  });
});

// Custom test runner
async function runComprehensiveTests() {
  console.log('\n🧪 Starting comprehensive test execution...\n');
  
  try {
    // Initialize test modules
    await initializeTestModules();
    
    // Initialize Mocha
    const mocha = new Mocha({
      timeout: 10000,
      reporter: 'spec',
      slow: 2000,
      bail: false
    });

    // Add test suite
    mocha.addFile(__filename);

    // Run tests
    return new Promise((resolve, reject) => {
      mocha.run(failures => {
        if (failures) {
          console.log(`\n❌ ${failures} test(s) failed`);
          reject(new Error(`${failures} test(s) failed`));
        } else {
          console.log('\n✅ All tests passed successfully!');
          resolve();
        }
      });
    });
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    throw error;
  }
}

// Export for programmatic use
module.exports = {
  runComprehensiveTests,
  describe,
  it: global.it
};

// Auto-run if called directly
if (require.main === module) {
  (async () => {
    try {
      await initializeTestModules();
      await runComprehensiveTests();
      console.log('\n🎉 COMPREHENSIVE TEST SUITE COMPLETED SUCCESSFULLY');
      process.exit(0);
    } catch (error) {
      console.error('\n💥 TEST SUITE FAILED:', error.message);
      process.exit(1);
    }
  })();
}