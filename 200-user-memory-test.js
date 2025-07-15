/**
 * 200-User Memory Test for TheAgencyIQ
 * Tests memory usage with 200 concurrent users within Replit's 512MB limit
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

class MemoryLoadTest {
  constructor() {
    this.baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
    this.results = [];
    this.startTime = Date.now();
    this.memorySnapshots = [];
  }

  // Get memory snapshot
  getMemorySnapshot() {
    const usage = process.memoryUsage();
    return {
      timestamp: new Date().toISOString(),
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100,
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100,
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100
    };
  }

  // Simulate individual user session
  async simulateUser(userId) {
    const startTime = performance.now();
    
    try {
      // Step 1: Establish session
      const sessionResponse = await axios.post(`${this.baseUrl}/api/auth/establish-session`, {
        email: `loadtest${userId}@theagencyiq.ai`,
        testMode: true
      }, {
        timeout: 10000,
        validateStatus: () => true
      });

      if (sessionResponse.status !== 200) {
        throw new Error(`Session establishment failed: ${sessionResponse.status}`);
      }

      // Extract session cookie
      const cookies = sessionResponse.headers['set-cookie'];
      let sessionCookie = null;
      
      if (cookies) {
        for (const cookie of cookies) {
          if (cookie.includes('s%3A')) {
            sessionCookie = cookie.split(';')[0];
            break;
          }
        }
      }

      if (!sessionCookie) {
        throw new Error('No session cookie found');
      }

      // Step 2: Make multiple authenticated requests
      const requests = [
        axios.get(`${this.baseUrl}/api/user`, {
          headers: { 'Cookie': sessionCookie },
          timeout: 5000,
          validateStatus: () => true
        }),
        axios.get(`${this.baseUrl}/api/user-status`, {
          headers: { 'Cookie': sessionCookie },
          timeout: 5000,
          validateStatus: () => true
        }),
        axios.get(`${this.baseUrl}/api/platform-connections`, {
          headers: { 'Cookie': sessionCookie },
          timeout: 5000,
          validateStatus: () => true
        })
      ];

      const responses = await Promise.all(requests);
      
      // Validate responses
      const validResponses = responses.filter(r => r.status === 200 || r.status === 401).length;
      
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      return {
        userId,
        success: true,
        duration,
        sessionCookie: sessionCookie.substring(0, 20) + '...',
        validResponses,
        totalRequests: responses.length + 1 // +1 for session establishment
      };
      
    } catch (error) {
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      return {
        userId,
        success: false,
        duration,
        error: error.message,
        totalRequests: 1
      };
    }
  }

  // Run load test with different user counts
  async runLoadTest() {
    console.log('🚀 Starting 200-User Memory Load Test');
    console.log('=====================================');
    
    // Initial memory snapshot
    this.memorySnapshots.push({
      label: 'Initial',
      users: 0,
      ...this.getMemorySnapshot()
    });

    // Test with increasing user loads
    const testSizes = [10, 25, 50, 100, 150, 200];
    
    for (const userCount of testSizes) {
      console.log(`\n📊 Testing ${userCount} concurrent users...`);
      
      const testStartTime = performance.now();
      const promises = [];
      
      // Create concurrent user sessions
      for (let i = 0; i < userCount; i++) {
        promises.push(this.simulateUser(i));
      }
      
      // Wait for all users to complete
      const results = await Promise.all(promises);
      const testEndTime = performance.now();
      
      // Analyze results
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      const avgDuration = Math.round(results.reduce((sum, r) => sum + r.duration, 0) / results.length);
      const totalRequests = results.reduce((sum, r) => sum + r.totalRequests, 0);
      const testDuration = Math.round(testEndTime - testStartTime);
      
      // Memory snapshot after test
      const memorySnapshot = {
        label: `After ${userCount} users`,
        users: userCount,
        ...this.getMemorySnapshot()
      };
      this.memorySnapshots.push(memorySnapshot);
      
      // Log results
      console.log(`   ✅ Success: ${successful}/${userCount} users (${Math.round(successful/userCount*100)}%)`);
      console.log(`   ❌ Failed: ${failed} users`);
      console.log(`   ⏱️ Average Duration: ${avgDuration}ms`);
      console.log(`   🚀 Total Requests: ${totalRequests}`);
      console.log(`   📊 Test Duration: ${testDuration}ms`);
      console.log(`   💾 Memory Usage: ${memorySnapshot.rss}MB RSS, ${memorySnapshot.heapUsed}MB Heap`);
      
      // Check if we're approaching Replit limits
      if (memorySnapshot.rss > 450) {
        console.log(`   ⚠️ WARNING: Approaching memory limit (${memorySnapshot.rss}MB / 512MB)`);
      }
      
      // Save incremental results
      this.results.push({
        userCount,
        successful,
        failed,
        avgDuration,
        totalRequests,
        testDuration,
        memory: memorySnapshot
      });
      
      // Brief pause between tests to allow cleanup
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Generate final report
    this.generateReport();
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📋 200-User Memory Load Test Report');
    console.log('====================================');
    
    // Memory growth analysis
    const initial = this.memorySnapshots[0];
    const final = this.memorySnapshots[this.memorySnapshots.length - 1];
    
    console.log(`\n💾 Memory Usage Analysis:`);
    console.log(`   Initial: ${initial.rss}MB RSS, ${initial.heapUsed}MB Heap`);
    console.log(`   Final: ${final.rss}MB RSS, ${final.heapUsed}MB Heap`);
    console.log(`   Growth: +${(final.rss - initial.rss).toFixed(1)}MB RSS, +${(final.heapUsed - initial.heapUsed).toFixed(1)}MB Heap`);
    
    // Memory per user calculation
    const memoryPerUser = (final.rss - initial.rss) / 200;
    console.log(`   Per User: ~${memoryPerUser.toFixed(2)}MB`);
    
    // Replit limits check
    const replitLimit = 512;
    const usagePercent = Math.round(final.rss / replitLimit * 100);
    console.log(`   Replit Usage: ${final.rss}MB / ${replitLimit}MB (${usagePercent}%)`);
    
    if (usagePercent > 90) {
      console.log(`   🚨 CRITICAL: Memory usage exceeds 90% of Replit limit!`);
    } else if (usagePercent > 75) {
      console.log(`   ⚠️ WARNING: Memory usage exceeds 75% of Replit limit`);
    } else {
      console.log(`   ✅ GOOD: Memory usage within acceptable limits`);
    }
    
    // Performance analysis
    console.log(`\n🚀 Performance Analysis:`);
    this.results.forEach(result => {
      const successRate = Math.round(result.successful / result.userCount * 100);
      console.log(`   ${result.userCount} users: ${successRate}% success, ${result.avgDuration}ms avg, ${result.memory.rss}MB`);
    });
    
    // Final assessment
    const finalResult = this.results[this.results.length - 1];
    const overallSuccess = finalResult.successful / finalResult.userCount;
    
    console.log(`\n📊 Final Assessment:`);
    console.log(`   200-User Test: ${finalResult.successful}/200 users successful (${Math.round(overallSuccess*100)}%)`);
    console.log(`   Memory Efficiency: ${memoryPerUser.toFixed(2)}MB per user`);
    console.log(`   Replit Compatibility: ${usagePercent < 90 ? 'PASS' : 'FAIL'}`);
    
    // Recommendations
    console.log(`\n💡 Recommendations:`);
    if (usagePercent > 90) {
      console.log(`   - CRITICAL: Implement aggressive memory optimization`);
      console.log(`   - Consider upgrading to Replit Pro for more memory`);
    } else if (usagePercent > 75) {
      console.log(`   - Implement memory optimization strategies`);
      console.log(`   - Monitor memory usage in production`);
    } else {
      console.log(`   - Current memory usage is acceptable`);
      console.log(`   - Continue monitoring for growth`);
    }
    
    if (overallSuccess < 0.95) {
      console.log(`   - Improve error handling and retry logic`);
      console.log(`   - Investigate timeout and connection issues`);
    }
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      testDuration: Date.now() - this.startTime,
      memorySnapshots: this.memorySnapshots,
      results: this.results,
      summary: {
        finalMemoryUsage: final.rss,
        memoryPerUser,
        replitUsagePercent: usagePercent,
        overallSuccessRate: overallSuccess,
        recommendation: usagePercent < 90 ? 'PRODUCTION_READY' : 'NEEDS_OPTIMIZATION'
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync(`200-user-memory-test-report-${Date.now()}.json`, JSON.stringify(report, null, 2));
    console.log(`\n✅ Detailed report saved to 200-user-memory-test-report-${Date.now()}.json`);
    
    return report;
  }
}

// Run the test
const test = new MemoryLoadTest();
test.runLoadTest().catch(console.error);