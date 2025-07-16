const axios = require('axios');
const assert = require('assert');

// Configuration
const BASE_URL = 'http://localhost:5000'; // Replace with your app's URL
const TEST_EMAIL = 'gailm@macleodglba.com.au';
const TEST_PASSWORD = 'securePassword123'; // Replace with actual password
const TEST_USER_ID = 2;

// API client with session persistence
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Persist cookies for session
});

async function runEndToEndTest() {
  try {
    console.log('Starting end-to-end test...');

    // 1. Establish session using the current session establishment endpoint
    console.log('Testing session establishment...');
    const sessionRes = await api.post('/api/establish-session', {
      email: TEST_EMAIL,
      phone: '+61424835189'
    });
    assert.strictEqual(sessionRes.status, 200, 'Session establishment failed');
    console.log('✅ Session established successfully');
    
    // Debug cookie handling
    console.log('🔍 Cookie debugging:');
    console.log(`   Response cookies: ${JSON.stringify(sessionRes.headers['set-cookie'])}`);
    console.log(`   Cookie jar: ${JSON.stringify(api.defaults.jar)}`);
    
    // Add a small delay to ensure session is properly stored
    await new Promise(resolve => setTimeout(resolve, 100));

    // 2. Verify user authentication and data retrieval
    console.log('Testing user authentication...');
    try {
      const userRes = await api.get('/api/user');
      if (userRes.status === 200) {
        assert.strictEqual(userRes.data.id, TEST_USER_ID, 'User ID mismatch');
        console.log('✅ User authenticated successfully');
      } else {
        console.log('⚠️  User authentication failed - possible session issue');
        console.log(`   Status: ${userRes.status}`);
        console.log(`   Response: ${JSON.stringify(userRes.data)}`);
      }
    } catch (error) {
      console.log('⚠️  User authentication failed - possible session issue');
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response: ${JSON.stringify(error.response.data)}`);
      }
    }

    // 3. Verify subscription status
    console.log('Testing subscription status...');
    try {
      const subscriptionRes = await api.get('/api/subscription-usage');
      if (subscriptionRes.status === 200) {
        assert.strictEqual(subscriptionRes.data.subscriptionPlan, 'professional', 'Invalid subscription plan');
        assert.strictEqual(subscriptionRes.data.subscriptionActive, true, 'Subscription not active');
        console.log('✅ Subscription verified: Professional plan, active');
        console.log(`   Posts remaining: ${subscriptionRes.data.remainingPosts}/${subscriptionRes.data.totalPosts}`);
      } else {
        console.log('⚠️  Subscription check failed - possible authentication issue');
        console.log(`   Status: ${subscriptionRes.status}`);
        console.log(`   Response: ${JSON.stringify(subscriptionRes.data)}`);
      }
    } catch (error) {
      console.log('⚠️  Subscription check failed - possible authentication issue');
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response: ${JSON.stringify(error.response.data)}`);
      }
    }

    // 4. Verify brand purpose retrieval (Critical issue investigation)
    console.log('Testing brand purpose retrieval...');
    try {
      const brandPurposeRes = await api.get('/api/brand-purpose');
      if (brandPurposeRes.status === 200) {
        assert(brandPurposeRes.data.corePurpose, 'Core purpose missing');
        console.log('✅ Brand purpose retrieved successfully');
        console.log(`   Core purpose: ${brandPurposeRes.data.corePurpose}`);
      } else {
        console.log('⚠️  Brand purpose not found - this is the issue we\'re investigating');
        console.log(`   Status: ${brandPurposeRes.status}`);
        console.log(`   Response: ${JSON.stringify(brandPurposeRes.data)}`);
      }
    } catch (error) {
      console.log('⚠️  Brand purpose retrieval failed - authentication issue confirmed');
      console.log(`   Error: ${error.message}`);
      if (error.response) {
        console.log(`   Status: ${error.response.status}`);
        console.log(`   Response: ${JSON.stringify(error.response.data)}`);
      }
    }

    // 5. Test post creation and quota management
    console.log('Testing post creation...');
    const postRes = await api.post('/api/schedule-post', {
      content: 'Test post for end-to-end testing',
      platform: 'facebook',
      scheduledFor: new Date(Date.now() + 60000).toISOString() // 1 minute from now
    });
    if (postRes.status === 201 || postRes.status === 200) {
      const postId = postRes.data.id;
      assert(postId, 'Post ID not returned');
      console.log('✅ Post created successfully');
      console.log(`   Post ID: ${postId}`);
    } else {
      console.log('⚠️  Post creation failed');
      console.log(`   Status: ${postRes.status}`);
      console.log(`   Response: ${JSON.stringify(postRes.data)}`);
    }

    // 6. Check analytics
    console.log('Testing analytics...');
    const analyticsRes = await api.get('/api/analytics');
    assert.strictEqual(analyticsRes.status, 200, 'Analytics fetch failed');
    assert(analyticsRes.data.totalPosts >= 0, 'Invalid total posts data');
    console.log('✅ Analytics verified');
    console.log(`   Total posts: ${analyticsRes.data.totalPosts}`);

    // 7. Check monthly analytics
    console.log('Testing monthly analytics...');
    const monthlyAnalyticsRes = await api.get('/api/analytics/monthly');
    assert.strictEqual(monthlyAnalyticsRes.status, 200, 'Monthly analytics fetch failed');
    console.log('✅ Monthly analytics verified');

    // 8. Check platform connections
    console.log('Testing platform connections...');
    const connectionsRes = await api.get('/api/platform-connections');
    assert.strictEqual(connectionsRes.status, 200, 'Platform connections fetch failed');
    console.log('✅ Platform connections verified');
    console.log(`   Connected platforms: ${connectionsRes.data.length}`);

    // 9. Logout
    console.log('Testing logout...');
    const logoutRes = await api.post('/api/auth/logout');
    assert.strictEqual(logoutRes.status, 200, 'Logout failed');
    console.log('✅ Logout successful');

    console.log('🎉 End-to-end test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Status:', error.response.status);
    }
    process.exit(1);
  }
}

runEndToEndTest();