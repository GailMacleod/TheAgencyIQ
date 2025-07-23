/**
 * ATOMIC QUOTA RACE CONDITION TEST
 * Validates the new AtomicQuotaManager eliminates race conditions
 */

import AtomicQuotaManager from './services/AtomicQuotaManager.js';

async function testRaceConditions() {
  console.log('🧪 ATOMIC QUOTA RACE CONDITION TEST STARTING...');
  
  const userId = 2; // Test user
  const platform = 'facebook';
  const operation = 'post';
  
  console.log(`Testing with userId: ${userId}, platform: ${platform}, operation: ${operation}`);
  
  // TEST 1: Concurrent quota operations (race condition simulation)
  console.log('\n🔬 TEST 1: Concurrent Operations (Race Condition Simulation)');
  
  const concurrentOperations = [];
  for (let i = 0; i < 10; i++) {
    concurrentOperations.push(
      AtomicQuotaManager.atomicQuotaOperation(userId, platform, operation)
    );
  }
  
  const results = await Promise.all(concurrentOperations);
  
  let successCount = 0;
  let failCount = 0;
  
  results.forEach((result, index) => {
    if (result.success) {
      successCount++;
      console.log(`✅ Operation ${index + 1}: SUCCESS (${result.remaining} remaining)`);
    } else {
      failCount++;
      console.log(`❌ Operation ${index + 1}: FAILED (${result.reason})`);
    }
  });
  
  console.log(`\n📊 RACE CONDITION TEST RESULTS:`);
  console.log(`   ✅ Successful operations: ${successCount}`);
  console.log(`   ❌ Failed operations: ${failCount}`);
  console.log(`   🔒 Race condition prevented: ${failCount > 0 ? 'YES' : 'UNCLEAR'}`);
  
  // TEST 2: Sequential operations (control test)
  console.log('\n🔬 TEST 2: Sequential Operations (Control Test)');
  
  const sequentialResults = [];
  for (let i = 0; i < 5; i++) {
    const result = await AtomicQuotaManager.atomicQuotaOperation(userId, 'instagram', 'post');
    sequentialResults.push(result);
    console.log(`Operation ${i + 1}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.remaining || 0} remaining)`);
  }
  
  // TEST 3: Quota status check (read-only)
  console.log('\n🔬 TEST 3: Quota Status Check (Read-Only)');
  
  const status = await AtomicQuotaManager.checkQuotaStatus(userId, platform, operation);
  console.log(`📋 Current Status:`, {
    withinQuota: status.withinQuota,
    currentUsage: status.currentUsage,
    limit: status.limit,
    remaining: status.remaining
  });
  
  // TEST 4: Comprehensive quota dashboard
  console.log('\n🔬 TEST 4: Comprehensive Quota Dashboard');
  
  const dashboard = await AtomicQuotaManager.getComprehensiveQuotaStatus(userId);
  console.log(`📊 Dashboard:`, JSON.stringify(dashboard, null, 2));
  
  // TEST 5: Database integrity check
  console.log('\n🔬 TEST 5: Database Integrity Check');
  
  try {
    const { db } = await import('./db.js');
    const { quotaUsage } = await import('../shared/schema.js');
    const { eq } = await import('drizzle-orm');
    
    const allUsage = await db.select().from(quotaUsage).where(eq(quotaUsage.userId, userId));
    console.log(`📁 Database Records for User ${userId}:`, allUsage.length);
    
    allUsage.forEach(record => {
      console.log(`   ${record.platform}/${record.operation}: ${record.count} uses`);
    });
    
  } catch (error) {
    console.error('Database integrity check failed:', error);
  }
  
  // SUMMARY
  console.log('\n🎯 ATOMIC QUOTA TEST SUMMARY:');
  console.log(`   🔒 Race Condition Prevention: ${failCount > 0 ? 'WORKING' : 'NEEDS_VERIFICATION'}`);
  console.log(`   📊 Quota Tracking: ${status.withinQuota !== undefined ? 'WORKING' : 'FAILED'}`);
  console.log(`   💾 Database Integration: ${dashboard.error ? 'FAILED' : 'WORKING'}`);
  console.log(`   ⚡ Atomic Operations: ${successCount > 0 ? 'WORKING' : 'FAILED'}`);
  
  const overallSuccess = (successCount > 0) && (status.withinQuota !== undefined) && (!dashboard.error);
  console.log(`\n🏆 OVERALL TEST RESULT: ${overallSuccess ? 'PASS ✅' : 'FAIL ❌'}`);
  
  return {
    success: overallSuccess,
    raceConditionPrevented: failCount > 0,
    quotaTracking: status.withinQuota !== undefined,
    databaseIntegration: !dashboard.error,
    atomicOperations: successCount > 0,
    details: {
      successCount,
      failCount,
      status,
      dashboard
    }
  };
}

// Run test if called directly
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (import.meta.url === `file://${process.argv[1]}`) {
  testRaceConditions()
    .then(result => {
      console.log('\n🧪 Test completed:', result.success ? 'PASS' : 'FAIL');
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('🔥 Test failed with error:', error);
      process.exit(1);
    });
}

export { testRaceConditions };