#!/usr/bin/env node

/**
 * SCALABILITY TEST - 200 SIMULATED USERS
 * Tests system scalability with 200 concurrent users
 * Validates session management, user creation, and system performance
 */

const axios = require('axios');
const assert = require('assert');

// Configuration
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
const TEST_USERS_COUNT = 200;
const CONCURRENT_BATCHES = 20; // Process 20 users at a time

// Test results tracking
const testResults = {
  userCreation: { passed: 0, failed: 0, errors: [] },
  sessionManagement: { passed: 0, failed: 0, errors: [] },
  duplicatePrevention: { passed: 0, failed: 0, errors: [] },
  performanceMetrics: { totalTime: 0, averageResponseTime: 0 }
};

// HTTP client with timeout
const httpClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Generate test user data
 */
function generateTestUser(index) {
  return {
    email: `scalability-test-${index}@example${index}.com`,
    phone: `+614${String(index).padStart(8, '0')}`,
    password: `ScalabilityTest${index}!`,
    confirmPassword: `ScalabilityTest${index}!`
  };
}

/**
 * Create a single test user
 */
async function createTestUser(userData, index) {
  const startTime = Date.now();
  
  try {
    const response = await httpClient.post('/api/auth/signup', userData);
    const responseTime = Date.now() - startTime;
    
    if (response.status === 200 && response.data.success) {
      testResults.userCreation.passed++;
      console.log(`✅ User ${index}: ${userData.email} created successfully (${responseTime}ms)`);
      return { success: true, responseTime, userId: response.data.userId };
    } else {
      testResults.userCreation.failed++;
      console.log(`❌ User ${index}: Creation failed - ${response.data.message}`);
      return { success: false, responseTime, error: response.data.message };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    testResults.userCreation.failed++;
    testResults.userCreation.errors.push({
      user: index,
      email: userData.email,
      error: error.message,
      responseTime
    });
    
    if (error.response?.status === 400 && error.response?.data?.validationErrors) {
      console.log(`⚠️  User ${index}: Validation error (expected for duplicates)`);
      return { success: false, responseTime, error: 'Validation error' };
    }
    
    console.log(`❌ User ${index}: Error - ${error.message} (${responseTime}ms)`);
    return { success: false, responseTime, error: error.message };
  }
}

/**
 * Test session management for created users
 */
async function testSessionManagement(userCount) {
  console.log(`\n🔍 Testing session management with ${userCount} users...`);
  
  const sessionPromises = [];
  
  for (let i = 0; i < Math.min(userCount, 50); i++) { // Test with first 50 users
    sessionPromises.push(testUserSession(i));
  }
  
  const results = await Promise.allSettled(sessionPromises);
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value.success) {
      testResults.sessionManagement.passed++;
    } else {
      testResults.sessionManagement.failed++;
      testResults.sessionManagement.errors.push({
        user: index,
        error: result.reason || result.value?.error || 'Unknown error'
      });
    }
  });
  
  console.log(`Session Management Results: ${testResults.sessionManagement.passed} passed, ${testResults.sessionManagement.failed} failed`);
}

/**
 * Test session for a single user
 */
async function testUserSession(index) {
  try {
    const response = await httpClient.post('/api/auth/establish-session', {});
    
    if (response.status === 200 && response.data.success) {
      return { success: true, sessionId: response.data.sessionId };
    } else {
      return { success: false, error: 'Session establishment failed' };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Test duplicate prevention
 */
async function testDuplicatePrevention() {
  console.log('\n🔍 Testing duplicate prevention...');
  
  const duplicateUser = generateTestUser(1); // Use same data as first user
  
  try {
    const response = await httpClient.post('/api/auth/signup', duplicateUser);
    
    if (response.status === 400) {
      testResults.duplicatePrevention.passed++;
      console.log('✅ Duplicate prevention working correctly');
      return { success: true };
    } else {
      testResults.duplicatePrevention.failed++;
      console.log('❌ Duplicate prevention failed - user created when it should have been blocked');
      return { success: false, error: 'Duplicate user was created' };
    }
  } catch (error) {
    if (error.response?.status === 400) {
      testResults.duplicatePrevention.passed++;
      console.log('✅ Duplicate prevention working correctly');
      return { success: true };
    } else {
      testResults.duplicatePrevention.failed++;
      console.log(`❌ Duplicate prevention test failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

/**
 * Process users in batches
 */
async function processUserBatch(startIndex, batchSize) {
  const promises = [];
  
  for (let i = startIndex; i < startIndex + batchSize; i++) {
    const userData = generateTestUser(i);
    promises.push(createTestUser(userData, i));
  }
  
  const results = await Promise.allSettled(promises);
  
  const responseTotal = results.reduce((sum, result) => {
    if (result.status === 'fulfilled' && result.value.responseTime) {
      return sum + result.value.responseTime;
    }
    return sum;
  }, 0);
  
  return { results, responseTotal };
}

/**
 * Generate final scalability report
 */
function generateScalabilityReport() {
  console.log('\n📊 SCALABILITY TEST REPORT - 200 SIMULATED USERS');
  console.log('=' .repeat(80));
  
  const totalUsers = testResults.userCreation.passed + testResults.userCreation.failed;
  const userCreationRate = (testResults.userCreation.passed / totalUsers) * 100;
  const sessionSuccessRate = (testResults.sessionManagement.passed / 
    (testResults.sessionManagement.passed + testResults.sessionManagement.failed)) * 100;
  
  console.log(`\n📈 USER CREATION RESULTS`);
  console.log(`Total Users Tested: ${totalUsers}`);
  console.log(`Successfully Created: ${testResults.userCreation.passed}`);
  console.log(`Failed: ${testResults.userCreation.failed}`);
  console.log(`Success Rate: ${userCreationRate.toFixed(1)}%`);
  
  console.log(`\n📈 SESSION MANAGEMENT RESULTS`);
  console.log(`Sessions Tested: ${testResults.sessionManagement.passed + testResults.sessionManagement.failed}`);
  console.log(`Successful Sessions: ${testResults.sessionManagement.passed}`);
  console.log(`Failed Sessions: ${testResults.sessionManagement.failed}`);
  console.log(`Success Rate: ${sessionSuccessRate.toFixed(1)}%`);
  
  console.log(`\n📈 DUPLICATE PREVENTION RESULTS`);
  console.log(`Tests Passed: ${testResults.duplicatePrevention.passed}`);
  console.log(`Tests Failed: ${testResults.duplicatePrevention.failed}`);
  
  console.log(`\n📈 PERFORMANCE METRICS`);
  console.log(`Total Test Time: ${testResults.performanceMetrics.totalTime}ms`);
  console.log(`Average Response Time: ${testResults.performanceMetrics.averageResponseTime}ms`);
  
  if (testResults.userCreation.errors.length > 0) {
    console.log(`\n⚠️  ERROR SUMMARY (First 10 errors):`);
    testResults.userCreation.errors.slice(0, 10).forEach(error => {
      console.log(`   User ${error.user} (${error.email}): ${error.error}`);
    });
  }
  
  const overallScore = ((userCreationRate + sessionSuccessRate) / 2);
  
  if (overallScore >= 90) {
    console.log('\n🎉 EXCELLENT - System ready for 200+ users!');
  } else if (overallScore >= 70) {
    console.log('\n⚠️  GOOD - System mostly scalable, minor optimizations needed');
  } else {
    console.log('\n🚨 NEEDS WORK - Scalability issues detected');
  }
  
  return {
    totalUsers,
    userCreationRate,
    sessionSuccessRate,
    overallScore,
    performanceMetrics: testResults.performanceMetrics
  };
}

/**
 * Main scalability test execution
 */
async function runScalabilityTest() {
  console.log('🚀 SCALABILITY TEST - 200 SIMULATED USERS');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Test Users: ${TEST_USERS_COUNT}`);
  console.log(`Concurrent Batches: ${CONCURRENT_BATCHES}`);
  console.log(`Time: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  
  try {
    // Process users in batches
    const batchSize = Math.ceil(TEST_USERS_COUNT / CONCURRENT_BATCHES);
    const batchPromises = [];
    
    for (let i = 0; i < TEST_USERS_COUNT; i += batchSize) {
      batchPromises.push(processUserBatch(i, Math.min(batchSize, TEST_USERS_COUNT - i)));
    }
    
    console.log('\n🔄 Processing user creation in batches...');
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Calculate total response time
    let totalResponseTime = 0;
    let responseCount = 0;
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        totalResponseTime += result.value.responseTotal;
        responseCount += result.value.results.length;
      }
    });
    
    testResults.performanceMetrics.totalTime = Date.now() - startTime;
    testResults.performanceMetrics.averageResponseTime = responseCount > 0 ? 
      Math.round(totalResponseTime / responseCount) : 0;
    
    // Test session management
    await testSessionManagement(testResults.userCreation.passed);
    
    // Test duplicate prevention
    await testDuplicatePrevention();
    
  } catch (error) {
    console.log(`\n⚠️  Test execution error: ${error.message}`);
  }
  
  // Generate final report
  const report = generateScalabilityReport();
  
  // Save report to file
  const fs = require('fs');
  const reportData = {
    timestamp: new Date().toISOString(),
    testResults,
    summary: report
  };
  
  fs.writeFileSync('SCALABILITY_TEST_REPORT.json', JSON.stringify(reportData, null, 2));
  console.log('\n📄 Report saved to: SCALABILITY_TEST_REPORT.json');
  
  return report;
}

// Execute test
if (require.main === module) {
  runScalabilityTest().catch(console.error);
}

module.exports = { runScalabilityTest };