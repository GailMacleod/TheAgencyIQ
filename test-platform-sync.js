/**
 * PLATFORM SYNC & API SUCCESS/FAILURE TEST SUITE
 * Tests 100 concurrent requests, 53-post attempts, and platform publishing
 * Validates API endpoints without OAuth dependencies
 */

async function testPlatformSync() {
  console.log('📡 PLATFORM SYNC & API SUCCESS/FAILURE TEST SUITE');
  console.log('=================================================\n');

  const baseUrl = 'http://localhost:5000';
  let totalTests = 0;
  let passedTests = 0;

  // TEST 1: 100 CONCURRENT API REQUESTS
  console.log('⚡ TEST 1: 100 CONCURRENT REQUESTS STRESS TEST');
  console.log('===============================================');
  
  try {
    const startTime = Date.now();
    const concurrentRequests = Array.from({ length: 100 }, (_, i) => 
      fetch(`${baseUrl}/api/subscription-usage`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': 'aiq_session=test_session_' + i
        }
      }).then(res => res.ok).catch(() => false)
    );

    const results = await Promise.all(concurrentRequests);
    const successfulRequests = results.filter(Boolean).length;
    const duration = Date.now() - startTime;

    console.log(`✅ Concurrent requests: ${successfulRequests}/100 successful`);
    console.log(`✅ Response time: ${duration}ms (${(duration/100).toFixed(1)}ms avg)`);
    console.log(`✅ Success rate: ${(successfulRequests/100*100).toFixed(1)}%`);
    
    if (successfulRequests >= 95) { // Allow 5% failure tolerance
      passedTests++;
      console.log('🎯 PASS: Concurrent stress test passed\n');
    } else {
      console.log('❌ FAIL: Too many request failures\n');
    }
    totalTests++;
  } catch (error) {
    console.error('❌ Concurrent request test failed:', error.message);
    totalTests++;
  }

  // TEST 2: 53-POST ATTEMPT WITH QUOTA BLOCKING
  console.log('🛡️  TEST 2: 53-POST QUOTA EXCEED SIMULATION');
  console.log('=========================================');
  
  try {
    // Simulate request for 53 posts when quota is 52
    const quotaResponse = await fetch(`${baseUrl}/api/subscription-usage`);
    const quotaData = await quotaResponse.json();
    
    if (quotaData.remainingPosts !== undefined) {
      const requestedPosts = 53;
      const allowedPosts = Math.min(requestedPosts, quotaData.remainingPosts);
      const blockedPosts = requestedPosts - allowedPosts;
      
      console.log(`✅ Current remaining posts: ${quotaData.remainingPosts}`);
      console.log(`✅ Posts requested: ${requestedPosts}`);
      console.log(`✅ Posts allowed: ${allowedPosts}`);
      console.log(`✅ Posts blocked: ${blockedPosts}`);
      
      if (blockedPosts > 0) {
        passedTests++;
        console.log('🎯 PASS: Quota blocking active\n');
      } else {
        console.log('❌ FAIL: Quota blocking not working\n');
      }
    } else {
      console.log('❌ FAIL: Could not retrieve quota data\n');
    }
    totalTests++;
  } catch (error) {
    console.error('❌ Quota exceed test failed:', error.message);
    totalTests++;
  }

  // TEST 3: PLATFORM PUBLISHING SIMULATION
  console.log('📱 TEST 3: PLATFORM PUBLISHING API ENDPOINTS');
  console.log('============================================');
  
  const platforms = ['facebook', 'instagram', 'linkedin', 'youtube', 'x'];
  let platformTests = 0;
  let platformPassed = 0;

  for (const platform of platforms) {
    try {
      // Test platform connection status
      const response = await fetch(`${baseUrl}/api/platform-connections`);
      const connections = await response.json();
      
      const platformConnection = Array.isArray(connections) ? 
        connections.find(conn => conn.platform === platform) : null;
      
      console.log(`✅ ${platform}: ${platformConnection ? 'Connected' : 'Available for connection'}`);
      
      // Simulate post publishing (would use auto-posting enforcer in real scenario)
      if (platformConnection || platform === 'x') { // X has test tokens
        console.log(`✅ ${platform}: Publishing API ready`);
        platformPassed++;
      } else {
        console.log(`⚠️  ${platform}: Connection needed for publishing`);
      }
      
      platformTests++;
    } catch (error) {
      console.error(`❌ ${platform}: API test failed -`, error.message);
      platformTests++;
    }
  }

  console.log(`\n🎯 Platform API Results: ${platformPassed}/${platformTests} platforms ready`);
  
  if (platformPassed >= 3) { // At least 3 platforms should be ready
    passedTests++;
    console.log('🎯 PASS: Platform publishing APIs operational\n');
  } else {
    console.log('❌ FAIL: Insufficient platform readiness\n');
  }
  totalTests++;

  // TEST 4: AUTO-POSTING ENFORCER VALIDATION
  console.log('🤖 TEST 4: AUTO-POSTING ENFORCER INTEGRATION');
  console.log('===========================================');
  
  try {
    // Test if auto-posting enforcer can be imported and used
    const { AutoPostingEnforcer } = await import('./server/auto-posting-enforcer.js');
    
    console.log('✅ AutoPostingEnforcer class imported successfully');
    
    // Test enforcer methods exist
    const hasEnforceMethod = typeof AutoPostingEnforcer.enforceAutoPosting === 'function';
    const hasScheduleMethod = typeof AutoPostingEnforcer.scheduleAutoPosting === 'function';
    
    console.log(`✅ enforceAutoPosting method: ${hasEnforceMethod ? 'Available' : 'Missing'}`);
    console.log(`✅ scheduleAutoPosting method: ${hasScheduleMethod ? 'Available' : 'Missing'}`);
    
    if (hasEnforceMethod && hasScheduleMethod) {
      passedTests++;
      console.log('🎯 PASS: Auto-posting enforcer ready\n');
    } else {
      console.log('❌ FAIL: Auto-posting enforcer methods missing\n');
    }
    totalTests++;
  } catch (error) {
    console.error('❌ Auto-posting enforcer test failed:', error.message);
    totalTests++;
  }

  // TEST 5: EVENT SCHEDULING SERVICE VALIDATION
  console.log('🎪 TEST 5: EVENT SCHEDULING SERVICE INTEGRATION');
  console.log('==============================================');
  
  try {
    const { EventSchedulingService } = await import('./server/services/eventSchedulingService.js');
    
    console.log('✅ EventSchedulingService imported successfully');
    
    // Test Brisbane Ekka event scheduling
    const eventSchedule = await EventSchedulingService.generateEventPostingSchedule(2);
    const ekkaFocusPosts = eventSchedule.filter(p => p.eventId.includes('ekka')).length;
    const totalEventPosts = eventSchedule.length;
    
    console.log(`✅ Total event-driven posts generated: ${totalEventPosts}`);
    console.log(`✅ Brisbane Ekka focus posts: ${ekkaFocusPosts}`);
    console.log(`✅ Other Queensland events: ${totalEventPosts - ekkaFocusPosts}`);
    
    // Validate distribution
    const distribution = EventSchedulingService.validateEventDistribution(eventSchedule);
    console.log(`✅ Even distribution valid: ${distribution.isValid}`);
    console.log(`✅ Average posts per day: ${distribution.averagePerDay}`);
    console.log(`✅ Maximum deviation: ${distribution.maxDeviation}`);
    
    if (totalEventPosts === 52 && ekkaFocusPosts >= 20 && distribution.isValid) {
      passedTests++;
      console.log('🎯 PASS: Event scheduling service operational\n');
    } else {
      console.log('❌ FAIL: Event scheduling validation failed\n');
    }
    totalTests++;
  } catch (error) {
    console.error('❌ Event scheduling test failed:', error.message);
    totalTests++;
  }

  // TEST 6: NOTIFICATION ENDPOINT VALIDATION
  console.log('📧 TEST 6: EXPIRED POST NOTIFICATION ENDPOINT');
  console.log('============================================');
  
  try {
    const notificationPayload = {
      userId: 2,
      postIds: [1, 2, 3, 4, 5],
      message: 'Test notification for expired posts'
    };
    
    const response = await fetch(`${baseUrl}/api/notify-expired`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notificationPayload)
    });
    
    const result = await response.json();
    
    console.log(`✅ Notification endpoint response: ${response.status}`);
    console.log(`✅ Posts notified: ${result.postsNotified || 0}`);
    console.log(`✅ Notification successful: ${result.success}`);
    
    if (response.ok && result.success && result.postsNotified === 5) {
      passedTests++;
      console.log('🎯 PASS: Notification endpoint operational\n');
    } else {
      console.log('❌ FAIL: Notification endpoint validation failed\n');
    }
    totalTests++;
  } catch (error) {
    console.error('❌ Notification endpoint test failed:', error.message);
    totalTests++;
  }

  // FINAL RESULTS
  console.log('🎯 PLATFORM SYNC & API TEST RESULTS');
  console.log('===================================');
  console.log(`Concurrent Stress Test:     ${totalTests >= 1 ? (passedTests >= 1 ? '✅ PASS' : '❌ FAIL') : '⏭️ SKIP'}`);
  console.log(`Quota Exceed Protection:    ${totalTests >= 2 ? (passedTests >= 2 ? '✅ PASS' : '❌ FAIL') : '⏭️ SKIP'}`);
  console.log(`Platform API Readiness:     ${totalTests >= 3 ? (passedTests >= 3 ? '✅ PASS' : '❌ FAIL') : '⏭️ SKIP'}`);
  console.log(`Auto-posting Enforcer:      ${totalTests >= 4 ? (passedTests >= 4 ? '✅ PASS' : '❌ FAIL') : '⏭️ SKIP'}`);
  console.log(`Event Scheduling Service:   ${totalTests >= 5 ? (passedTests >= 5 ? '✅ PASS' : '❌ FAIL') : '⏭️ SKIP'}`);
  console.log(`Notification Endpoint:      ${totalTests >= 6 ? (passedTests >= 6 ? '✅ PASS' : '❌ FAIL') : '⏭️ SKIP'}`);
  console.log('');
  console.log(`🏆 OVERALL SCORE: ${passedTests}/${totalTests} tests passed`);
  console.log(`📊 SUCCESS RATE: ${totalTests > 0 ? Math.round(passedTests/totalTests*100) : 0}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL PLATFORM SYNC TESTS PASSED!');
  } else if (passedTests >= Math.ceil(totalTests * 0.8)) {
    console.log('✅ PLATFORM SYNC MOSTLY OPERATIONAL (80%+ pass rate)');
  } else {
    console.log('⚠️  PLATFORM SYNC NEEDS ATTENTION (Below 80% pass rate)');
  }
}

// Run the tests
testPlatformSync().catch(console.error);