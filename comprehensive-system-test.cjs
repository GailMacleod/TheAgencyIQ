#!/usr/bin/env node

/**
 * Comprehensive System Test for TheAgencyIQ Platform
 * Tests all core functionality with real user credentials
 * 
 * Usage: node comprehensive-system-test.cjs
 */

const axios = require('axios');
const assert = require('assert');
const fs = require('fs');

// Test configuration
const CONFIG = {
  baseUrl: 'http://localhost:5000',
  testUser: {
    email: 'gailm@macleodglba.com.au',
    password: 'Tw33dl3dum!',
    phone: '+61424835189',
    subscriptionPlan: 'professional'
  },
  platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube'],
  timeout: 30000
};

// Test results tracking
let testResults = {
  timestamp: new Date().toISOString(),
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  results: [],
  summary: {}
};

// Helper function to log test results
function logTest(testName, passed, details = '', duration = 0) {
  const result = {
    test: testName,
    status: passed ? 'PASS' : 'FAIL',
    details,
    duration: `${duration}ms`
  };
  
  testResults.totalTests++;
  if (passed) {
    testResults.passedTests++;
    console.log(`✅ ${testName} - ${duration}ms`);
  } else {
    testResults.failedTests++;
    console.log(`❌ ${testName} - ${details} - ${duration}ms`);
  }
  
  testResults.results.push(result);
  if (details) console.log(`   ${details}`);
}

// Test session management
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication System...');
  
  try {
    // Test 1: Health check
    const startTime = Date.now();
    const healthResponse = await axios.get(`${CONFIG.baseUrl}/api/health`, {
      timeout: CONFIG.timeout
    });
    
    logTest('Health Check', 
      healthResponse.status === 200 && healthResponse.data.status === 'healthy',
      `Server status: ${healthResponse.data.status}`,
      Date.now() - startTime
    );
    
    // Test 2: Login with real credentials
    const loginStart = Date.now();
    const loginResponse = await axios.post(`${CONFIG.baseUrl}/api/login`, {
      email: CONFIG.testUser.email,
      password: CONFIG.testUser.password
    }, {
      timeout: CONFIG.timeout,
      withCredentials: true
    });
    
    logTest('User Login', 
      loginResponse.status === 200 && loginResponse.data.success === true,
      `Login successful for ${CONFIG.testUser.email}`,
      Date.now() - loginStart
    );
    
    // Extract cookies for subsequent requests
    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';
    
    // Test 3: Session establishment
    const sessionStart = Date.now();
    const sessionResponse = await axios.post(`${CONFIG.baseUrl}/api/establish-session`, {
      email: CONFIG.testUser.email,
      password: CONFIG.testUser.password
    }, {
      timeout: CONFIG.timeout,
      headers: cookieHeader ? { Cookie: cookieHeader } : {}
    });
    
    logTest('Session Establishment', 
      sessionResponse.status === 200 && sessionResponse.data.success === true,
      `Session ID: ${sessionResponse.data.sessionId}`,
      Date.now() - sessionStart
    );
    
    return cookieHeader;
    
  } catch (error) {
    logTest('Authentication System', false, error.message);
    return null;
  }
}

// Test authenticated endpoints
async function testAuthenticatedEndpoints(cookieHeader) {
  console.log('\n📡 Testing Authenticated Endpoints...');
  
  const endpoints = [
    { name: 'User Info', url: '/api/user' },
    { name: 'User Status', url: '/api/user-status' },
    { name: 'Platform Connections', url: '/api/platform-connections' },
    { name: 'Brand Purpose', url: '/api/brand-purpose' },
    { name: 'Posts', url: '/api/posts' },
    { name: 'Memory Info', url: '/api/memory' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${CONFIG.baseUrl}${endpoint.url}`, {
        timeout: CONFIG.timeout,
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
        withCredentials: true
      });
      
      logTest(endpoint.name, 
        response.status === 200,
        `Status: ${response.status}`,
        Date.now() - startTime
      );
      
      // Store specific endpoint data for validation
      if (endpoint.url === '/api/user-status') {
        testResults.summary.userStatus = response.data;
      }
      if (endpoint.url === '/api/platform-connections') {
        testResults.summary.platformConnections = response.data.connections;
      }
      if (endpoint.url === '/api/posts') {
        testResults.summary.totalPosts = response.data.posts.length;
      }
      
    } catch (error) {
      logTest(endpoint.name, false, error.message);
    }
  }
}

// Test OAuth endpoints
async function testOAuthEndpoints(cookieHeader) {
  console.log('\n🔗 Testing OAuth Endpoints...');
  
  for (const platform of CONFIG.platforms) {
    try {
      const startTime = Date.now();
      const response = await axios.get(`${CONFIG.baseUrl}/auth/${platform}`, {
        timeout: CONFIG.timeout,
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
        withCredentials: true,
        maxRedirects: 0, // Don't follow redirects
        validateStatus: status => status < 400 // Accept redirects as success
      });
      
      logTest(`OAuth ${platform.toUpperCase()}`, 
        response.status >= 300 && response.status < 400,
        `Redirect status: ${response.status}`,
        Date.now() - startTime
      );
      
    } catch (error) {
      if (error.response && error.response.status >= 300 && error.response.status < 400) {
        logTest(`OAuth ${platform.toUpperCase()}`, true, `Redirect to OAuth provider`);
      } else {
        logTest(`OAuth ${platform.toUpperCase()}`, false, error.message);
      }
    }
  }
}

// Test post creation
async function testPostCreation(cookieHeader) {
  console.log('\n📝 Testing Post Creation...');
  
  try {
    const startTime = Date.now();
    const testPost = {
      content: `Test post created by comprehensive system test at ${new Date().toISOString()}`,
      platforms: ['facebook', 'instagram', 'linkedin'],
      status: 'draft'
    };
    
    const response = await axios.post(`${CONFIG.baseUrl}/api/posts`, testPost, {
      timeout: CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(cookieHeader ? { Cookie: cookieHeader } : {})
      },
      withCredentials: true
    });
    
    logTest('Post Creation', 
      response.status === 200 || response.status === 201,
      `Post created successfully`,
      Date.now() - startTime
    );
    
    return response.data;
    
  } catch (error) {
    logTest('Post Creation', false, error.message);
    return null;
  }
}

// Test system performance
async function testSystemPerformance(cookieHeader) {
  console.log('\n⚡ Testing System Performance...');
  
  try {
    const startTime = Date.now();
    
    // Concurrent requests test
    const concurrentRequests = [
      axios.get(`${CONFIG.baseUrl}/api/user-status`, { 
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
        timeout: CONFIG.timeout 
      }),
      axios.get(`${CONFIG.baseUrl}/api/platform-connections`, { 
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
        timeout: CONFIG.timeout 
      }),
      axios.get(`${CONFIG.baseUrl}/api/posts`, { 
        headers: cookieHeader ? { Cookie: cookieHeader } : {},
        timeout: CONFIG.timeout 
      })
    ];
    
    const results = await Promise.all(concurrentRequests);
    const allSuccessful = results.every(r => r.status === 200);
    
    logTest('Concurrent Requests', 
      allSuccessful,
      `${results.length} concurrent requests completed`,
      Date.now() - startTime
    );
    
    // Memory usage test
    const memoryStart = Date.now();
    const memoryResponse = await axios.get(`${CONFIG.baseUrl}/api/memory`, {
      headers: cookieHeader ? { Cookie: cookieHeader } : {},
      timeout: CONFIG.timeout
    });
    
    const memoryMB = Math.round(memoryResponse.data.memory.rss / 1024 / 1024);
    logTest('Memory Usage', 
      memoryMB < 512, // Should be under 512MB
      `Memory usage: ${memoryMB}MB`,
      Date.now() - memoryStart
    );
    
    testResults.summary.memoryUsageMB = memoryMB;
    
  } catch (error) {
    logTest('System Performance', false, error.message);
  }
}

// Generate final report
function generateReport() {
  console.log('\n📊 COMPREHENSIVE SYSTEM TEST REPORT');
  console.log('=' * 50);
  
  const successRate = ((testResults.passedTests / testResults.totalTests) * 100).toFixed(1);
  
  console.log(`\n📈 OVERALL RESULTS:`);
  console.log(`   Total Tests: ${testResults.totalTests}`);
  console.log(`   Passed: ${testResults.passedTests}`);
  console.log(`   Failed: ${testResults.failedTests}`);
  console.log(`   Success Rate: ${successRate}%`);
  
  if (testResults.summary.userStatus) {
    console.log(`\n👤 USER STATUS:`);
    console.log(`   Email: ${testResults.summary.userStatus.email}`);
    console.log(`   Subscription: ${testResults.summary.userStatus.subscriptionPlan}`);
    console.log(`   Quota Remaining: ${testResults.summary.userStatus.quotaRemaining}`);
  }
  
  if (testResults.summary.platformConnections) {
    console.log(`\n🔗 PLATFORM CONNECTIONS:`);
    console.log(`   Total Platforms: ${testResults.summary.platformConnections.length}`);
    testResults.summary.platformConnections.forEach(conn => {
      console.log(`   ${conn.platform.toUpperCase()}: ${conn.isActive ? 'Active' : 'Inactive'}`);
    });
  }
  
  if (testResults.summary.totalPosts) {
    console.log(`\n📝 POSTS:`);
    console.log(`   Total Posts: ${testResults.summary.totalPosts}`);
  }
  
  if (testResults.summary.memoryUsageMB) {
    console.log(`\n💾 PERFORMANCE:`);
    console.log(`   Memory Usage: ${testResults.summary.memoryUsageMB}MB`);
  }
  
  console.log(`\n🏆 SYSTEM STATUS: ${successRate >= 80 ? 'PRODUCTION READY' : 'NEEDS ATTENTION'}`);
  
  // Save detailed report
  const reportFilename = `system-test-report-${Date.now()}.json`;
  fs.writeFileSync(reportFilename, JSON.stringify(testResults, null, 2));
  console.log(`\n📄 Detailed report saved: ${reportFilename}`);
}

// Main test execution
async function runComprehensiveTest() {
  console.log('🚀 Starting Comprehensive System Test for TheAgencyIQ Platform');
  console.log('=' * 60);
  
  try {
    // Run authentication tests
    const cookieHeader = await testAuthentication();
    
    if (!cookieHeader) {
      console.log('❌ Authentication failed - aborting remaining tests');
      return;
    }
    
    // Run authenticated endpoint tests
    await testAuthenticatedEndpoints(cookieHeader);
    
    // Run OAuth tests
    await testOAuthEndpoints(cookieHeader);
    
    // Run post creation test
    await testPostCreation(cookieHeader);
    
    // Run performance tests
    await testSystemPerformance(cookieHeader);
    
    // Generate final report
    generateReport();
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    logTest('Test Execution', false, error.message);
  }
}

// Run the test
if (require.main === module) {
  runComprehensiveTest().catch(console.error);
}

module.exports = { runComprehensiveTest };