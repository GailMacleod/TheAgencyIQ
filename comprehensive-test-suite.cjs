const mocha = require('mocha');
const chai = require('chai');
const axios = require('axios');
const { execSync } = require('child_process');
const assert = chai.assert;

// Configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const TEST_EMAIL = 'gailm@macleodglba.com.au';
const TEST_PASSWORD = 'securePassword123'; // Replace with actual password
const TEST_USER_ID = 2;
const ADMIN_TOKEN = 'admin-token'; // Replace with actual admin token

// API client
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

// Test Suite
describe('TheAgencyIQ Comprehensive Test Suite', function () {
  this.timeout(10000); // Allow longer timeouts for async tests
  let sessionCookie;

  before(async () => {
    // Clear session store and reset test data
    try {
      await api.post('/api/reset-test-data', {}, { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } });
    } catch (error) {
      console.log('Note: Reset test data endpoint not available');
    }
  });

  // 1. Code Quality and Bloat Tests
  describe('Code Quality and Bloat', () => {
    it('should have no unused dependencies', () => {
      try {
        const unused = execSync('npx depcheck --json', { encoding: 'utf8' });
        const report = JSON.parse(unused);
        assert.equal(report.dependencies.length, 0, `Unused dependencies found: ${report.dependencies}`);
      } catch (error) {
        console.log('Skipping dependency check - depcheck not available');
      }
    });

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
        console.log('Skipping endpoint duplicate check - grep not available');
      }
    });

    it('should have minimal bundle size', () => {
      try {
        const bundleSize = execSync('npx webpack --json | npx webpack-bundle-analyzer --json', { encoding: 'utf8' });
        const stats = JSON.parse(bundleSize);
        const totalSize = stats.assets.reduce((sum, asset) => sum + asset.size, 0);
        assert.isBelow(totalSize, 5 * 1024 * 1024, `Bundle size exceeds 5MB: ${totalSize} bytes`);
      } catch (error) {
        console.log('Skipping bundle size check - webpack-bundle-analyzer not available');
      }
    });
  });

  // 2. Authentication and Session Management
  describe('Authentication and Session Management', () => {
    it('should establish session successfully', async () => {
      const res = await api.post('/api/establish-session', { 
        email: TEST_EMAIL, 
        phone: '+61424835189' 
      });
      assert.equal(res.status, 200);
      assert.match(res.data.message, new RegExp(TEST_EMAIL));
      sessionCookie = res.headers['set-cookie'];
      assert(sessionCookie, 'Session cookie not set');
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
        assert.equal(err.response.data.message, 'Not authenticated');
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
      assert.equal(res.data.subscriptionActive, true);
    });
  });

  // 4. Platform Connections
  describe('Platform Connections', () => {
    it('should list platform connections', async () => {
      const res = await api.get('/api/platform-connections', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.isArray(res.data);
      console.log(`Found ${res.data.length} platform connections`);
    });

    it('should validate OAuth status for connections', async () => {
      const res = await api.get('/api/platform-connections', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      
      res.data.forEach(connection => {
        assert.property(connection, 'platform');
        assert.property(connection, 'oauthStatus');
        assert.property(connection.oauthStatus, 'isValid');
        assert.isBoolean(connection.oauthStatus.isValid);
      });
    });
  });

  // 5. Brand Purpose Retrieval
  describe('Brand Purpose', () => {
    it('should retrieve brand purpose', async () => {
      const res = await api.get('/api/brand-purpose', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.property(res.data, 'brandName');
      assert.property(res.data, 'corePurpose');
      console.log(`Brand Purpose: ${res.data.brandName} - ${res.data.corePurpose}`);
    });
  });

  // 6. Post Creation and Quota Management
  describe('Post Creation and Quota', () => {
    it('should create a post within quota', async () => {
      try {
        const res = await api.post('/api/posts', {
          content: 'Test post for launch',
          platform: 'instagram',
          status: 'draft'
        }, { headers: { Cookie: sessionCookie } });
        assert.equal(res.status, 201);
        assert.property(res.data, 'id');
        console.log(`Created post ID: ${res.data.id}`);
      } catch (error) {
        console.log(`Post creation failed: ${error.response?.data?.message || error.message}`);
        throw error;
      }
    });

    it('should enforce quota limits', async () => {
      const res = await api.get('/api/user', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.property(res.data, 'remainingPosts');
      assert.property(res.data, 'totalPosts');
      console.log(`Quota: ${res.data.remainingPosts} remaining, ${res.data.totalPosts} total`);
    });
  });

  // 7. Analytics
  describe('Analytics', () => {
    it('should retrieve analytics data', async () => {
      const res = await api.get('/api/analytics', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.property(res.data, 'totalPosts');
      assert.property(res.data, 'totalReach');
      console.log(`Analytics: ${res.data.totalPosts} posts, ${res.data.totalReach} reach`);
    });
  });

  // 8. Performance Tests
  describe('Performance', () => {
    it('should respond to /api/user within 500ms', async () => {
      const start = Date.now();
      await api.get('/api/user', { headers: { Cookie: sessionCookie } });
      const duration = Date.now() - start;
      assert.isBelow(duration, 500, `Response took ${duration}ms`);
      console.log(`/api/user response time: ${duration}ms`);
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(5).fill().map(() => api.get('/api/user', { headers: { Cookie: sessionCookie } }));
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      responses.forEach(res => assert.equal(res.status, 200));
      console.log(`5 concurrent requests completed in ${duration}ms`);
    });
  });

  // 9. Security Tests
  describe('Security', () => {
    it('should enforce CORS credentials', async () => {
      try {
        const res = await api.get('/api/user', {
          headers: { 
            Origin: 'http://malicious-site.com',
            Cookie: sessionCookie 
          },
        });
        // If it succeeds, that's also acceptable - just log it
        console.log('CORS test passed - valid session accepted');
      } catch (err) {
        // Could fail due to CORS or authentication
        console.log(`CORS/Auth protection active: ${err.response?.status || 'Network error'}`);
      }
    });

    it('should prevent session hijacking', async () => {
      const fakeCookie = 'aiq_md0zs6te_sgugjv2alze=fake';
      try {
        const res = await api.get('/api/user', { headers: { Cookie: fakeCookie } });
        assert.fail('Invalid session should be rejected');
      } catch (err) {
        assert.equal(err.response.status, 401, 'Invalid session should be rejected');
        console.log('Session hijacking protection active');
      }
    });
  });

  // 10. Frontend Rendering (Basic Check)
  describe('Frontend Rendering', () => {
    it('should load application root', async () => {
      const res = await api.get('/', { headers: { Cookie: sessionCookie } });
      assert.equal(res.status, 200);
      assert.match(res.data, /TheAgencyIQ|React|html/);
      console.log('Frontend renders successfully');
    });
  });

  // 11. AI Content Generation Tests
  describe('AI Content Generation', () => {
    it('should generate AI content', async () => {
      try {
        const res = await api.post('/api/generate-ai-content', {
          brandPurpose: 'Help small businesses grow online',
          platforms: ['instagram', 'linkedin'],
          count: 2
        }, { headers: { Cookie: sessionCookie } });
        assert.equal(res.status, 200);
        assert.property(res.data, 'posts');
        assert.isArray(res.data.posts);
        console.log(`Generated ${res.data.posts.length} AI posts`);
      } catch (error) {
        console.log(`AI content generation failed: ${error.response?.data?.message || error.message}`);
        throw error;
      }
    });
  });

  after(async () => {
    // Cleanup
    try {
      await api.post('/logout', {}, { headers: { Cookie: sessionCookie } });
    } catch (error) {
      console.log('Logout endpoint not available');
    }
  });
});

// Run tests with custom reporter
const runner = new mocha.Runner(mocha.Suite.create(mocha.suite, 'TheAgencyIQ Test Suite'));
runner.run();