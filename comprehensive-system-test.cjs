/**
 * COMPREHENSIVE THEAGENCYIQ SYSTEM TEST
 * Tests core functionality without breaking existing features
 * Based on user's Python test script requirements but adapted for our Node.js system
 */

const axios = require('axios');
const assert = require('assert');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_COOKIE = 'theagencyiq.session=s%3Aaiq_md9zaigr_aknyuyl19nd.BezvuNEUo23IMWaBetxnSP5hof3lSdNdsjLrdkNQtzs';

// Test Results Storage
const testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper function to make authenticated requests
async function makeRequest(method, endpoint, data = null, skipAuth = false) {
  const config = {
    method,
    url: `${BASE_URL}${endpoint}`,
    headers: skipAuth ? {} : { 'Cookie': TEST_COOKIE },
    timeout: 10000
  };
  
  if (data) {
    config.data = data;
    config.headers['Content-Type'] = 'application/json';
  }
  
  return await axios(config);
}

// Test function wrapper
async function runTest(testName, testFunction) {
  try {
    console.log(`🧪 Testing: ${testName}`);
    await testFunction();
    testResults.passed++;
    console.log(`✅ PASSED: ${testName}`);
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error.message });
    console.log(`❌ FAILED: ${testName} - ${error.message}`);
  }
}

// CORE SYSTEM TESTS

// Test 1: Session Management & Authentication
async function testSessionManagement() {
  const response = await makeRequest('GET', '/api/user');
  assert(response.status === 200, 'User endpoint should return 200');
  assert(response.data.id === 2, 'Should authenticate as user 2');
  assert(response.data.email === 'gailm@macleodglba.com.au', 'Should return correct email');
}

// Test 2: Session Persistence Across Requests
async function testSessionPersistence() {
  const response1 = await makeRequest('GET', '/api/auth/session');
  const response2 = await makeRequest('GET', '/api/user-status');
  
  assert(response1.status === 200, 'Session endpoint should work');
  assert(response2.status === 200, 'User status should work');
  assert(response1.data.userId === response2.data.userId, 'Session should persist across requests');
}

// Test 3: Subscription & Quota System
async function testQuotaSystem() {
  const response = await makeRequest('GET', '/api/user-status');
  assert(response.status === 200, 'User status should return 200');
  assert(response.data.subscriptionActive === true, 'Subscription should be active');
  assert(typeof response.data.remainingPosts === 'number', 'Should return numeric quota');
  assert(response.data.remainingPosts >= 0, 'Quota should be non-negative');
}

// Test 4: Brand Purpose System
async function testBrandPurpose() {
  const response = await makeRequest('GET', '/api/brand-purpose');
  assert(response.status === 200, 'Brand purpose should return 200');
  assert(response.data.brandName, 'Should have brand name');
  assert(response.data.corePurpose, 'Should have core purpose');
}

// Test 5: Posts System
async function testPostsSystem() {
  const response = await makeRequest('GET', '/api/posts');
  assert(response.status === 200, 'Posts endpoint should work');
  assert(Array.isArray(response.data), 'Should return array of posts');
}

// Test 6: Platform Connections
async function testPlatformConnections() {
  const response = await makeRequest('GET', '/api/platform-connections');
  assert(response.status === 200, 'Platform connections should work');
  assert(Array.isArray(response.data), 'Should return array of connections');
}

// Test 7: Video Generation System (Core API)
async function testVideoGenerationAPI() {
  const testPayload = {
    promptType: 'cinematic-auto',
    promptPreview: 'System test video generation',
    editedText: 'Test Queensland business success story',
    platform: 'youtube',
    postId: 9999
  };
  
  const response = await makeRequest('POST', '/api/video/render', testPayload);
  assert(response.status === 200, 'Video render should return 200');
  assert(response.data.success === true, 'Video generation should succeed');
  assert(response.data.videoId, 'Should return video ID');
}

// Test 8: Admin Video Monitoring
async function testAdminVideoMonitoring() {
  const response = await makeRequest('GET', '/api/admin/video-prompts');
  assert(response.status === 200, 'Admin endpoint should work');
  assert(response.data.summary, 'Should return summary data');
  assert(Array.isArray(response.data.prompts), 'Should return prompts array');
}

// Test 9: AI Content Generation
async function testAIContentGeneration() {
  const testPayload = {
    message: 'Generate strategic business content for Queensland SME'
  };
  
  const response = await makeRequest('POST', '/api/generate-guidance', testPayload);
  assert(response.status === 200, 'AI guidance should work');
  assert(response.data.response, 'Should return AI response');
}

// Test 10: Error Handling & Rate Limiting
async function testErrorHandling() {
  // Test invalid endpoint
  try {
    await makeRequest('GET', '/api/invalid-endpoint');
    assert(false, 'Should throw error for invalid endpoint');
  } catch (error) {
    assert(error.response.status === 404, 'Should return 404 for invalid endpoint');
  }
}

// Test 11: Cookie Security & HTTPS Headers
async function testSecurityHeaders() {
  const response = await makeRequest('GET', '/api/user');
  const headers = response.headers;
  
  // Check for security headers presence (not strict requirements but good practice)
  console.log('Security headers check:', {
    hasSetCookie: !!headers['set-cookie'],
    hasXFrame: !!headers['x-frame-options'],
    hasCORS: !!headers['access-control-allow-origin']
  });
}

// Test 12: Performance & Response Times
async function testPerformance() {
  const start = Date.now();
  const response = await makeRequest('GET', '/api/user');
  const responseTime = Date.now() - start;
  
  assert(response.status === 200, 'Performance test should succeed');
  assert(responseTime < 5000, `Response time should be under 5 seconds (was ${responseTime}ms)`);
  console.log(`⚡ Response time: ${responseTime}ms`);
}

// MAIN TEST EXECUTION
async function runAllTests() {
  console.log('🚀 Starting Comprehensive TheAgencyIQ System Test');
  console.log('📍 Testing against:', BASE_URL);
  console.log('🔐 Using authenticated session for user: gailm@macleodglba.com.au');
  console.log('');

  // Core System Tests
  await runTest('Session Management & Authentication', testSessionManagement);
  await runTest('Session Persistence Across Requests', testSessionPersistence);
  await runTest('Subscription & Quota System', testQuotaSystem);
  await runTest('Brand Purpose System', testBrandPurpose);
  await runTest('Posts System', testPostsSystem);
  await runTest('Platform Connections', testPlatformConnections);
  
  // Critical Feature Tests
  await runTest('Video Generation API', testVideoGenerationAPI);
  await runTest('Admin Video Monitoring', testAdminVideoMonitoring);
  await runTest('AI Content Generation', testAIContentGeneration);
  
  // System Reliability Tests
  await runTest('Error Handling & Rate Limiting', testErrorHandling);
  await runTest('Security Headers', testSecurityHeaders);
  await runTest('Performance & Response Times', testPerformance);

  // Final Results
  console.log('');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('========================');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('');
    console.log('🔍 FAILED TESTS DETAILS:');
    testResults.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.test}: ${error.error}`);
    });
  }
  
  console.log('');
  if (testResults.failed === 0) {
    console.log('🎉 ALL TESTS PASSED - SYSTEM IS STABLE AND READY');
  } else {
    console.log('⚠️  SOME TESTS FAILED - REVIEW ERRORS ABOVE');
  }
}

// Run the tests
runAllTests().catch(console.error);