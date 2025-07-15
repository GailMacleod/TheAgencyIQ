/**
 * Memory Profiler for TheAgencyIQ
 * Analyzes memory usage patterns and identifies potential leaks
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

class MemoryProfiler {
  constructor() {
    this.baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
    this.memorySnapshots = [];
    this.startTime = Date.now();
  }

  // Get current memory usage
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      timestamp: new Date().toISOString(),
      rss: Math.round(usage.rss / 1024 / 1024 * 100) / 100, // MB
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(usage.external / 1024 / 1024 * 100) / 100, // MB
      arrayBuffers: Math.round(usage.arrayBuffers / 1024 / 1024 * 100) / 100 // MB
    };
  }

  // Take memory snapshot
  takeSnapshot(label) {
    const snapshot = {
      label,
      ...this.getMemoryUsage(),
      runtime: Math.round((Date.now() - this.startTime) / 1000)
    };
    this.memorySnapshots.push(snapshot);
    console.log(`📊 Memory Snapshot [${label}]:`, snapshot);
    return snapshot;
  }

  // Simulate user load
  async simulateUserLoad(userCount = 50) {
    console.log(`🔥 Simulating ${userCount} concurrent users...`);
    
    const requests = [];
    for (let i = 0; i < userCount; i++) {
      requests.push(this.simulateUserSession(i));
    }
    
    const results = await Promise.allSettled(requests);
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`📈 Load test results: ${successful} successful, ${failed} failed`);
    return { successful, failed, total: userCount };
  }

  // Simulate individual user session
  async simulateUserSession(userId) {
    try {
      // Establish session
      const sessionResponse = await axios.post(`${this.baseUrl}/api/auth/establish-session`, {
        email: `user${userId}@test.com`
      }, {
        timeout: 5000,
        validateStatus: () => true
      });

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

      // Make authenticated requests
      const requests = [
        axios.get(`${this.baseUrl}/api/user`, {
          headers: { 'Cookie': sessionCookie },
          timeout: 3000,
          validateStatus: () => true
        }),
        axios.get(`${this.baseUrl}/api/user-status`, {
          headers: { 'Cookie': sessionCookie },
          timeout: 3000,
          validateStatus: () => true
        }),
        axios.get(`${this.baseUrl}/api/platform-connections`, {
          headers: { 'Cookie': sessionCookie },
          timeout: 3000,
          validateStatus: () => true
        })
      ];

      await Promise.all(requests);
      return true;
    } catch (error) {
      console.error(`❌ User ${userId} session failed:`, error.message);
      return false;
    }
  }

  // Analyze memory leaks
  analyzeMemoryLeaks() {
    if (this.memorySnapshots.length < 2) {
      console.log('⚠️ Need at least 2 snapshots to analyze leaks');
      return;
    }

    console.log('\n📋 Memory Analysis Report');
    console.log('=========================');
    
    const first = this.memorySnapshots[0];
    const last = this.memorySnapshots[this.memorySnapshots.length - 1];
    
    const rssGrowth = last.rss - first.rss;
    const heapGrowth = last.heapUsed - first.heapUsed;
    const externalGrowth = last.external - first.external;
    
    console.log(`📊 Memory Growth Analysis:`);
    console.log(`   RSS: ${first.rss}MB → ${last.rss}MB (${rssGrowth > 0 ? '+' : ''}${rssGrowth}MB)`);
    console.log(`   Heap: ${first.heapUsed}MB → ${last.heapUsed}MB (${heapGrowth > 0 ? '+' : ''}${heapGrowth}MB)`);
    console.log(`   External: ${first.external}MB → ${last.external}MB (${externalGrowth > 0 ? '+' : ''}${externalGrowth}MB)`);
    console.log(`   Runtime: ${last.runtime}s`);
    
    // Calculate memory growth rate
    const growthRate = rssGrowth / (last.runtime / 60); // MB per minute
    console.log(`   Growth Rate: ${growthRate.toFixed(2)} MB/min`);
    
    // Memory leak indicators
    const leakIndicators = [];
    if (rssGrowth > 50) leakIndicators.push('High RSS growth');
    if (heapGrowth > 30) leakIndicators.push('High heap growth');
    if (externalGrowth > 20) leakIndicators.push('High external memory growth');
    if (growthRate > 5) leakIndicators.push('Fast growth rate');
    
    if (leakIndicators.length > 0) {
      console.log(`⚠️ Potential Memory Leaks:`);
      leakIndicators.forEach(indicator => console.log(`   - ${indicator}`));
    } else {
      console.log(`✅ No significant memory leaks detected`);
    }
    
    // Replit limits check
    const replitLimit = 512; // MB
    const projectedUsage = last.rss + (growthRate * 10); // 10 minutes projection
    
    console.log(`\n📋 Replit Limits Analysis:`);
    console.log(`   Current Usage: ${last.rss}MB / ${replitLimit}MB (${Math.round(last.rss / replitLimit * 100)}%)`);
    console.log(`   Projected (10min): ${projectedUsage.toFixed(1)}MB`);
    
    if (projectedUsage > replitLimit * 0.9) {
      console.log(`⚠️ WARNING: Approaching Replit memory limit`);
    } else {
      console.log(`✅ Within Replit memory limits`);
    }
  }

  // Generate comprehensive report
  generateReport() {
    console.log('\n📋 Memory Profiling Report');
    console.log('===========================');
    
    this.memorySnapshots.forEach((snapshot, index) => {
      console.log(`${index + 1}. [${snapshot.label}] ${snapshot.timestamp}`);
      console.log(`   RSS: ${snapshot.rss}MB, Heap: ${snapshot.heapUsed}MB, External: ${snapshot.external}MB`);
    });
    
    this.analyzeMemoryLeaks();
    
    return {
      snapshots: this.memorySnapshots,
      summary: {
        totalSnapshots: this.memorySnapshots.length,
        runtime: Math.round((Date.now() - this.startTime) / 1000),
        currentUsage: this.getMemoryUsage(),
        replitLimit: 512,
        usagePercentage: Math.round(this.getMemoryUsage().rss / 512 * 100)
      }
    };
  }
}

// Main profiling function
async function runMemoryProfile() {
  const profiler = new MemoryProfiler();
  
  console.log('🚀 Starting Memory Profiling...');
  profiler.takeSnapshot('Initial');
  
  // Simulate light load
  await profiler.simulateUserLoad(10);
  profiler.takeSnapshot('After 10 users');
  
  // Wait and check for memory cleanup
  await new Promise(resolve => setTimeout(resolve, 2000));
  profiler.takeSnapshot('After 2s cleanup');
  
  // Simulate medium load
  await profiler.simulateUserLoad(50);
  profiler.takeSnapshot('After 50 users');
  
  // Wait and check for memory cleanup
  await new Promise(resolve => setTimeout(resolve, 3000));
  profiler.takeSnapshot('After 3s cleanup');
  
  // Simulate heavy load
  await profiler.simulateUserLoad(100);
  profiler.takeSnapshot('After 100 users');
  
  // Final cleanup check
  await new Promise(resolve => setTimeout(resolve, 5000));
  profiler.takeSnapshot('Final cleanup');
  
  // Generate report
  const report = profiler.generateReport();
  
  // Save report to file
  const fs = await import('fs');
  fs.writeFileSync('memory-profile-report.json', JSON.stringify(report, null, 2));
  console.log('\n✅ Memory profile report saved to memory-profile-report.json');
}

// Run the profiler
runMemoryProfile().catch(console.error);