/**
 * Session Persistence Analysis Report Generator
 * Tests browser recognition, session cookies, and authentication flows
 */

import axios from 'axios';
import tough from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';
import fs from 'fs';

// Setup axios with cookie jar for session persistence testing
const cookieJar = new tough.CookieJar();
const client = wrapper(axios.create({ jar: cookieJar }));

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function generateSessionPersistenceReport() {
  const report = {
    testTime: new Date().toISOString(),
    baseUrl: BASE_URL,
    tests: {
      browserRecognition: { status: 'UNKNOWN', details: [] },
      sessionCookies: { status: 'UNKNOWN', details: [] },
      authGuardPersistence: { status: 'UNKNOWN', details: [] },
      returnUserExperience: { status: 'UNKNOWN', details: [] },
      sessionRestoration: { status: 'UNKNOWN', details: [] }
    },
    summary: {
      overallStatus: 'UNKNOWN',
      criticalIssues: [],
      recommendations: []
    }
  };

  console.log('🔍 DETAILED SESSION PERSISTENCE ANALYSIS');
  console.log('=' .repeat(60));

  // Test 1: Browser Recognition on Return
  console.log('\n📱 TEST 1: Browser Recognition on Return');
  try {
    // Initial request without session
    const initialResponse = await client.get(`${BASE_URL}/api/user`);
    report.tests.browserRecognition.details.push({
      step: 'Initial request without session',
      status: initialResponse.status,
      hasSession: false,
      sessionId: null
    });

    // Establish session
    const sessionResponse = await client.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au'
    });
    
    const sessionData = sessionResponse.data;
    report.tests.browserRecognition.details.push({
      step: 'Session establishment',
      status: sessionResponse.status,
      sessionEstablished: sessionData.sessionEstablished,
      sessionId: sessionData.sessionId,
      user: sessionData.user
    });

    // Test return visit recognition
    const returnResponse = await client.get(`${BASE_URL}/api/user`);
    report.tests.browserRecognition.details.push({
      step: 'Return visit recognition',
      status: returnResponse.status,
      recognized: returnResponse.status === 200,
      userData: returnResponse.data
    });

    report.tests.browserRecognition.status = returnResponse.status === 200 ? 'PASS' : 'FAIL';
    
  } catch (error) {
    report.tests.browserRecognition.status = 'FAIL';
    report.tests.browserRecognition.details.push({
      step: 'Browser recognition test',
      error: error.message,
      status: error.response?.status || 'ERROR'
    });
  }

  // Test 2: Session Cookie Analysis
  console.log('\n🍪 TEST 2: Session Cookie Analysis');
  try {
    const cookies = cookieJar.getCookiesSync(BASE_URL);
    const sessionCookie = cookies.find(c => c.key === 'theagencyiq.session');
    
    report.tests.sessionCookies.details.push({
      step: 'Cookie jar analysis',
      totalCookies: cookies.length,
      sessionCookieFound: !!sessionCookie,
      sessionCookieValue: sessionCookie ? sessionCookie.value.substring(0, 50) + '...' : null,
      cookieProperties: sessionCookie ? {
        httpOnly: sessionCookie.httpOnly,
        secure: sessionCookie.secure,
        sameSite: sessionCookie.sameSite,
        expires: sessionCookie.expires
      } : null
    });

    // Test cookie transmission
    const cookieTestResponse = await client.get(`${BASE_URL}/api/user-status`);
    report.tests.sessionCookies.details.push({
      step: 'Cookie transmission test',
      status: cookieTestResponse.status,
      cookieTransmitted: cookieTestResponse.status === 200,
      responseData: cookieTestResponse.data
    });

    report.tests.sessionCookies.status = sessionCookie && cookieTestResponse.status === 200 ? 'PASS' : 'FAIL';

  } catch (error) {
    report.tests.sessionCookies.status = 'FAIL';
    report.tests.sessionCookies.details.push({
      step: 'Session cookie analysis',
      error: error.message,
      status: error.response?.status || 'ERROR'
    });
  }

  // Test 3: AuthGuard Persistence
  console.log('\n🔐 TEST 3: AuthGuard Persistence');
  try {
    const endpoints = ['/api/user', '/api/user-status', '/api/platform-connections', '/api/posts'];
    const authResults = [];

    for (const endpoint of endpoints) {
      try {
        const response = await client.get(`${BASE_URL}${endpoint}`);
        authResults.push({
          endpoint,
          status: response.status,
          authenticated: response.status === 200,
          hasUserId: response.data.id || response.data.userId || false
        });
      } catch (error) {
        authResults.push({
          endpoint,
          status: error.response?.status || 'ERROR',
          authenticated: false,
          error: error.message
        });
      }
    }

    report.tests.authGuardPersistence.details = authResults;
    const successfulAuth = authResults.filter(r => r.authenticated).length;
    report.tests.authGuardPersistence.status = successfulAuth === endpoints.length ? 'PASS' : 'PARTIAL';

  } catch (error) {
    report.tests.authGuardPersistence.status = 'FAIL';
    report.tests.authGuardPersistence.details.push({
      step: 'AuthGuard persistence test',
      error: error.message
    });
  }

  // Test 4: Return User Experience
  console.log('\n👤 TEST 4: Return User Experience');
  try {
    // Simulate browser close/reopen by creating new client with same cookies
    const newClient = wrapper(axios.create({ jar: cookieJar }));
    
    const returnUserResponse = await newClient.get(`${BASE_URL}/api/user`);
    report.tests.returnUserExperience.details.push({
      step: 'Return user authentication',
      status: returnUserResponse.status,
      noSignInPrompt: returnUserResponse.status === 200,
      userData: returnUserResponse.data
    });

    // Test immediate access to protected resources
    const protectedResponse = await newClient.get(`${BASE_URL}/api/platform-connections`);
    report.tests.returnUserExperience.details.push({
      step: 'Immediate protected resource access',
      status: protectedResponse.status,
      immediateAccess: protectedResponse.status === 200,
      data: protectedResponse.data
    });

    report.tests.returnUserExperience.status = 
      returnUserResponse.status === 200 && protectedResponse.status === 200 ? 'PASS' : 'FAIL';

  } catch (error) {
    report.tests.returnUserExperience.status = 'FAIL';
    report.tests.returnUserExperience.details.push({
      step: 'Return user experience test',
      error: error.message,
      status: error.response?.status || 'ERROR'
    });
  }

  // Test 5: Session Restoration
  console.log('\n🔄 TEST 5: Session Restoration');
  try {
    // Test multiple concurrent requests
    const concurrentRequests = Promise.all([
      client.get(`${BASE_URL}/api/user`),
      client.get(`${BASE_URL}/api/user-status`),
      client.get(`${BASE_URL}/api/platform-connections`)
    ]);

    const responses = await concurrentRequests;
    report.tests.sessionRestoration.details.push({
      step: 'Concurrent request handling',
      allSuccessful: responses.every(r => r.status === 200),
      responses: responses.map(r => ({
        status: r.status,
        hasUserId: r.data.id || r.data.userId || false
      }))
    });

    // Test session consistency
    const sessionConsistency = responses.every(r => 
      r.data.id === 2 || r.data.userId === 2 || r.data.user?.id === 2
    );

    report.tests.sessionRestoration.details.push({
      step: 'Session consistency check',
      consistent: sessionConsistency,
      userIdMatches: sessionConsistency
    });

    report.tests.sessionRestoration.status = sessionConsistency ? 'PASS' : 'FAIL';

  } catch (error) {
    report.tests.sessionRestoration.status = 'FAIL';
    report.tests.sessionRestoration.details.push({
      step: 'Session restoration test',
      error: error.message
    });
  }

  // Generate Summary
  const testResults = Object.values(report.tests);
  const passedTests = testResults.filter(t => t.status === 'PASS').length;
  const failedTests = testResults.filter(t => t.status === 'FAIL').length;
  const partialTests = testResults.filter(t => t.status === 'PARTIAL').length;

  report.summary.overallStatus = failedTests === 0 ? 'EXCELLENT' : 
                                 passedTests >= 3 ? 'GOOD' : 'NEEDS_IMPROVEMENT';

  // Critical Issues
  if (report.tests.browserRecognition.status === 'FAIL') {
    report.summary.criticalIssues.push('Browser not recognized on return - users must sign in repeatedly');
  }
  if (report.tests.sessionCookies.status === 'FAIL') {
    report.summary.criticalIssues.push('Session cookies not properly set or transmitted');
  }
  if (report.tests.authGuardPersistence.status === 'FAIL') {
    report.summary.criticalIssues.push('AuthGuard causing 401 errors for authenticated users');
  }

  // Recommendations
  if (report.tests.returnUserExperience.status === 'FAIL') {
    report.summary.recommendations.push('Implement seamless return user experience without sign-in prompts');
  }
  if (report.tests.sessionRestoration.status === 'FAIL') {
    report.summary.recommendations.push('Fix session consistency across concurrent requests');
  }

  return report;
}

// Run analysis and generate report
async function runAnalysis() {
  try {
    const report = await generateSessionPersistenceReport();
    
    console.log('\n📊 FINAL REPORT SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Overall Status: ${report.summary.overallStatus}`);
    console.log(`Tests Passed: ${Object.values(report.tests).filter(t => t.status === 'PASS').length}/5`);
    console.log(`Critical Issues: ${report.summary.criticalIssues.length}`);
    
    // Save detailed report
    const reportPath = `SESSION_PERSISTENCE_REPORT_${Date.now()}.json`;
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📋 Detailed report saved to: ${reportPath}`);
    
    return report;
    
  } catch (error) {
    console.error('Analysis failed:', error);
    return { error: error.message };
  }
}

// Execute if run directly
runAnalysis().then(report => {
  process.exit(0);
});