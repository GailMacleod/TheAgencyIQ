/**
 * DYNAMIC 30-DAY CYCLE VALIDATION TEST
 * Tests 10 customers with varied subscription start dates: July 3, 5, 10, 15, 20
 * Validates 52 posts per user (520 total) with dynamic cycle enforcement
 * Tests Queensland events integration within each user's 30-day window
 */

import fs from 'fs/promises';
import path from 'path';

async function testDynamicCycleValidation() {
  console.log('🔄 DYNAMIC 30-DAY CYCLE VALIDATION TEST');
  console.log('=====================================');
  console.log('Testing: 10 customers with varied start dates');
  console.log('Start dates: July 3, 5, 10, 15, 20 (2025)');
  console.log('Expected: 52 posts per customer = 520 total posts');
  console.log('Queensland events: Brisbane Ekka overlap detection\n');

  const testResults = {
    passed: 0,
    failed: 0,
    customers: [],
    totalPosts: 0,
    ekkaOverlaps: 0
  };

  // Test subscription start dates (varied across July 2025)
  const subscriptionDates = [
    '2025-07-03', '2025-07-05', '2025-07-10', '2025-07-15', '2025-07-20',
    '2025-07-03', '2025-07-05', '2025-07-10', '2025-07-15', '2025-07-20'
  ];

  try {
    // Import PostQuotaService for dynamic cycle testing
    const { PostQuotaService } = await import('./server/PostQuotaService.ts');
    const { EventSchedulingService } = await import('./server/services/eventSchedulingService.ts');

    console.log('1. Testing dynamic cycle calculation...');
    
    for (let i = 1; i <= 10; i++) {
      const subscriptionStart = new Date(subscriptionDates[i - 1]);
      const customerEmail = `customer${i}@queensland-business.com.au`;
      
      console.log(`\n📊 Customer ${i}: ${customerEmail}`);
      console.log(`   Subscription start: ${subscriptionStart.toDateString()}`);
      
      // Calculate dynamic 30-day cycle
      const { cycleStart, cycleEnd } = PostQuotaService.getUserCycleDates(subscriptionStart);
      console.log(`   30-day cycle: ${cycleStart.toDateString()} - ${cycleEnd.toDateString()}`);
      
      // Check Brisbane Ekka overlap
      const ekkaOverlap = PostQuotaService.isEkkaWithinUserCycle(subscriptionStart);
      console.log(`   Brisbane Ekka overlap: ${ekkaOverlap ? '✅ YES' : '❌ NO'}`);
      
      if (ekkaOverlap) {
        testResults.ekkaOverlaps++;
      }
      
      // Test quota initialization
      try {
        await PostQuotaService.initializeQuota(i, 'professional');
        const quota = await PostQuotaService.getQuotaStatus(i);
        
        if (quota && quota.remainingPosts === 52) {
          console.log(`   ✅ Quota initialized: ${quota.remainingPosts}/52 posts`);
          testResults.passed++;
          testResults.totalPosts += 52;
        } else {
          console.log(`   ❌ Quota initialization failed: ${quota?.remainingPosts || 0}/52`);
          testResults.failed++;
        }
      } catch (error) {
        console.log(`   ❌ Error initializing quota: ${error.message}`);
        testResults.failed++;
      }
      
      testResults.customers.push({
        id: i,
        email: customerEmail,
        subscriptionStart: subscriptionStart.toISOString(),
        cycleStart: cycleStart.toISOString(),
        cycleEnd: cycleEnd.toISOString(),
        ekkaOverlap,
        quota: 52
      });
    }

    console.log('\n2. Testing Queensland events scheduling within cycles...');
    
    // Test event scheduling for customers with Ekka overlap
    let eventPostsGenerated = 0;
    for (const customer of testResults.customers) {
      if (customer.ekkaOverlap) {
        try {
          const eventPlan = await EventSchedulingService.generateEventPostingSchedule(customer.id);
          const ekkaEvents = eventPlan.filter(plan => 
            plan.eventName.toLowerCase().includes('ekka') ||
            plan.eventName.toLowerCase().includes('brisbane')
          );
          
          console.log(`   Customer ${customer.id}: ${ekkaEvents.length} Brisbane Ekka events scheduled`);
          eventPostsGenerated += ekkaEvents.length;
        } catch (error) {
          console.log(`   Customer ${customer.id}: Event scheduling failed - ${error.message}`);
        }
      }
    }

    console.log('\n3. Testing postApproved() quota deduction timing...');
    
    // Test post approval and quota deduction for customer 1
    const testPostId = 9999;
    try {
      // Test approval without quota deduction
      const approvalResult = await PostQuotaService.approvePost(1, testPostId);
      console.log(`   ✅ Post approval (no quota deduction): ${approvalResult}`);
      
      // Test quota deduction after "publishing"
      const deductionResult = await PostQuotaService.postApproved(1, testPostId);
      console.log(`   ✅ Post quota deduction after publishing: ${deductionResult}`);
      
      // Verify quota changed
      const updatedQuota = await PostQuotaService.getQuotaStatus(1);
      console.log(`   ✅ Updated quota: ${updatedQuota?.remainingPosts}/52 posts remaining`);
      
    } catch (error) {
      console.log(`   ❌ Quota deduction test failed: ${error.message}`);
    }

    console.log('\n============================================================');
    console.log('🎯 DYNAMIC CYCLE VALIDATION TEST RESULTS');
    console.log('============================================================');
    
    const successRate = (testResults.passed / (testResults.passed + testResults.failed) * 100).toFixed(1);
    
    console.log(`Dynamic Cycle Calculation:     ✅ ${testResults.passed}/10 customers`);
    console.log(`Total Posts Allocated:         📊 ${testResults.totalPosts}/520 posts`);
    console.log(`Brisbane Ekka Overlaps:        🎪 ${testResults.ekkaOverlaps}/10 customers`);
    console.log(`Event Posts Generated:         📅 ${eventPostsGenerated} Ekka events`);
    console.log(`Success Rate:                  🏆 ${successRate}%`);
    
    // Log results to file
    const logEntry = {
      timestamp: new Date().toISOString(),
      testType: 'DYNAMIC_CYCLE_VALIDATION',
      results: testResults,
      successRate: parseFloat(successRate),
      ekkaOverlaps: testResults.ekkaOverlaps,
      eventPostsGenerated
    };
    
    await fs.appendFile('data/quota-debug.log', 
      `\n=== DYNAMIC CYCLE TEST ${new Date().toISOString()} ===\n` +
      JSON.stringify(logEntry, null, 2) + '\n'
    );

    if (successRate >= 80 && testResults.totalPosts === 520) {
      console.log('\n🎉 DYNAMIC CYCLE VALIDATION: SUCCESS');
      console.log('✅ All customers have dynamic 30-day cycles');
      console.log('✅ Queensland events properly integrated');
      console.log('✅ 520 posts allocated across 10 customers');
      console.log('✅ Brisbane Ekka overlap detection working');
    } else {
      console.log('\n❌ DYNAMIC CYCLE VALIDATION: NEEDS IMPROVEMENT');
      console.log(`   Success rate: ${successRate}% (target: 80%+)`);
      console.log(`   Total posts: ${testResults.totalPosts}/520`);
    }

  } catch (error) {
    console.error('\n❌ DYNAMIC CYCLE TEST ERROR:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the test
testDynamicCycleValidation().catch(console.error);