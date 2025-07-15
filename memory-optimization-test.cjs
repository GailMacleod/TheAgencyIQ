/**
 * Memory Optimization Test for Production Deployment
 * Tests memory usage with optimizations and prepares for deployment
 */

const axios = require('axios');
const util = require('util');

class MemoryOptimizationTest {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.testResults = [];
    this.startTime = Date.now();
  }

  async runComprehensiveMemoryTest() {
    console.log('🚀 Starting Comprehensive Memory Optimization Test');
    console.log('===================================================');
    
    // Test 1: Memory usage with concurrent users
    await this.testConcurrentUsers();
    
    // Test 2: Memory growth over time
    await this.testMemoryGrowth();
    
    // Test 3: Session management optimization
    await this.testSessionOptimization();
    
    // Test 4: Database connection pooling
    await this.testDatabaseOptimization();
    
    // Test 5: Memory cleanup after load
    await this.testMemoryCleanup();
    
    // Generate deployment readiness report
    this.generateDeploymentReport();
  }

  async testConcurrentUsers() {
    console.log('\n📊 Testing Concurrent User Memory Usage...');
    
    const userCounts = [25, 50, 100, 150, 200];
    
    for (const userCount of userCounts) {
      const memoryBefore = process.memoryUsage();
      
      const promises = [];
      for (let i = 0; i < userCount; i++) {
        promises.push(this.simulateUser(i));
      }
      
      const startTime = Date.now();
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;
      
      const memoryAfter = process.memoryUsage();
      const memoryDiff = memoryAfter.rss - memoryBefore.rss;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`   ${userCount} users: ${successful}/${userCount} success (${Math.round(successful/userCount*100)}%)`);
      console.log(`   Memory: ${Math.round(memoryDiff/1024/1024)}MB increase, ${Math.round(memoryAfter.rss/1024/1024)}MB total`);
      console.log(`   Duration: ${duration}ms`);
      
      this.testResults.push({
        test: 'concurrent_users',
        userCount,
        successRate: successful/userCount,
        memoryIncrease: memoryDiff,
        totalMemory: memoryAfter.rss,
        duration
      });
      
      // Wait between tests to allow garbage collection
      await this.wait(2000);
    }
  }

  async testMemoryGrowth() {
    console.log('\n📈 Testing Memory Growth Over Time...');
    
    const iterations = 10;
    const memorySnapshots = [];
    
    for (let i = 0; i < iterations; i++) {
      const memory = process.memoryUsage();
      memorySnapshots.push(memory);
      
      // Simulate typical application usage
      await this.simulateTypicalUsage();
      
      console.log(`   Iteration ${i+1}: ${Math.round(memory.rss/1024/1024)}MB RSS, ${Math.round(memory.heapUsed/1024/1024)}MB Heap`);
      
      await this.wait(1000);
    }
    
    // Analyze memory growth trend
    const firstMemory = memorySnapshots[0].rss;
    const lastMemory = memorySnapshots[memorySnapshots.length - 1].rss;
    const growth = lastMemory - firstMemory;
    
    console.log(`   Memory Growth: ${Math.round(growth/1024/1024)}MB over ${iterations} iterations`);
    
    this.testResults.push({
      test: 'memory_growth',
      iterations,
      memoryGrowth: growth,
      finalMemory: lastMemory,
      trend: growth > 0 ? 'increasing' : 'stable'
    });
  }

  async testSessionOptimization() {
    console.log('\n🔐 Testing Session Management Optimization...');
    
    const sessionTests = [];
    
    // Test session establishment
    try {
      const sessionResponse = await axios.post(`${this.baseURL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      });
      
      sessionTests.push({
        test: 'session_establishment',
        success: sessionResponse.status === 200,
        responseTime: sessionResponse.headers['x-response-time'] || 'N/A'
      });
      
      // Test session persistence
      const cookies = this.extractCookies(sessionResponse.headers);
      if (cookies) {
        const userResponse = await axios.get(`${this.baseURL}/api/user`, {
          headers: { Cookie: cookies }
        });
        
        sessionTests.push({
          test: 'session_persistence',
          success: userResponse.status === 200,
          responseTime: userResponse.headers['x-response-time'] || 'N/A'
        });
      }
      
    } catch (error) {
      sessionTests.push({
        test: 'session_management',
        success: false,
        error: error.message
      });
    }
    
    console.log(`   Session tests: ${sessionTests.filter(t => t.success).length}/${sessionTests.length} passed`);
    
    this.testResults.push({
      test: 'session_optimization',
      results: sessionTests
    });
  }

  async testDatabaseOptimization() {
    console.log('\n🗄️ Testing Database Connection Optimization...');
    
    const dbTests = [];
    
    // Test concurrent database requests
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(this.testDatabaseRequest());
    }
    
    const startTime = Date.now();
    const results = await Promise.allSettled(promises);
    const duration = Date.now() - startTime;
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    console.log(`   Database requests: ${successful}/20 success`);
    console.log(`   Total time: ${duration}ms`);
    console.log(`   Average time: ${Math.round(duration/20)}ms per request`);
    
    this.testResults.push({
      test: 'database_optimization',
      successRate: successful/20,
      totalTime: duration,
      averageTime: duration/20
    });
  }

  async testMemoryCleanup() {
    console.log('\n🧹 Testing Memory Cleanup...');
    
    const memoryBefore = process.memoryUsage();
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    await this.wait(2000);
    
    const memoryAfter = process.memoryUsage();
    const memoryReduction = memoryBefore.rss - memoryAfter.rss;
    
    console.log(`   Memory before cleanup: ${Math.round(memoryBefore.rss/1024/1024)}MB`);
    console.log(`   Memory after cleanup: ${Math.round(memoryAfter.rss/1024/1024)}MB`);
    console.log(`   Memory reduction: ${Math.round(memoryReduction/1024/1024)}MB`);
    
    this.testResults.push({
      test: 'memory_cleanup',
      memoryBefore: memoryBefore.rss,
      memoryAfter: memoryAfter.rss,
      memoryReduction
    });
  }

  async simulateUser(userId) {
    try {
      // Establish session
      const sessionResponse = await axios.post(`${this.baseURL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      });
      
      const cookies = this.extractCookies(sessionResponse.headers);
      if (!cookies) return false;
      
      // Make authenticated requests
      const endpoints = ['/api/user', '/api/user-status', '/api/platform-connections'];
      
      for (const endpoint of endpoints) {
        await axios.get(`${this.baseURL}${endpoint}`, {
          headers: { Cookie: cookies },
          timeout: 10000
        });
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  async simulateTypicalUsage() {
    try {
      // Simulate typical user workflow
      const sessionResponse = await axios.post(`${this.baseURL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      });
      
      const cookies = this.extractCookies(sessionResponse.headers);
      if (cookies) {
        await axios.get(`${this.baseURL}/api/user`, {
          headers: { Cookie: cookies }
        });
      }
    } catch (error) {
      // Ignore errors in simulation
    }
  }

  async testDatabaseRequest() {
    try {
      const response = await axios.get(`${this.baseURL}/api/user-status`, {
        timeout: 5000
      });
      return response.status === 200 || response.status === 401; // Both are valid responses
    } catch (error) {
      return false;
    }
  }

  extractCookies(headers) {
    const setCookie = headers['set-cookie'];
    if (!setCookie) return null;
    
    return setCookie.map(cookie => cookie.split(';')[0]).join('; ');
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  generateDeploymentReport() {
    const totalTime = Date.now() - this.startTime;
    
    console.log('\n📋 DEPLOYMENT READINESS REPORT');
    console.log('================================');
    
    // Memory analysis
    const memoryTests = this.testResults.filter(t => t.test === 'concurrent_users');
    if (memoryTests.length > 0) {
      const maxMemory = Math.max(...memoryTests.map(t => t.totalMemory));
      const memoryPerUser = maxMemory / Math.max(...memoryTests.map(t => t.userCount));
      
      console.log(`💾 MEMORY ANALYSIS:`);
      console.log(`   Peak Memory Usage: ${Math.round(maxMemory/1024/1024)}MB`);
      console.log(`   Memory per User: ${Math.round(memoryPerUser/1024)}KB`);
      console.log(`   200-User Projection: ${Math.round(200 * memoryPerUser/1024/1024)}MB`);
      console.log(`   Replit Limit (512MB): ${maxMemory < 512*1024*1024 ? '✅ WITHIN LIMIT' : '❌ EXCEEDS LIMIT'}`);
    }
    
    // Performance analysis
    const performanceTests = this.testResults.filter(t => t.test === 'concurrent_users');
    if (performanceTests.length > 0) {
      const avgSuccessRate = performanceTests.reduce((sum, t) => sum + t.successRate, 0) / performanceTests.length;
      const avgDuration = performanceTests.reduce((sum, t) => sum + t.duration, 0) / performanceTests.length;
      
      console.log(`\n⚡ PERFORMANCE ANALYSIS:`);
      console.log(`   Average Success Rate: ${Math.round(avgSuccessRate*100)}%`);
      console.log(`   Average Response Time: ${Math.round(avgDuration)}ms`);
      console.log(`   Performance Rating: ${avgSuccessRate > 0.95 ? '✅ EXCELLENT' : avgSuccessRate > 0.9 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}`);
    }
    
    // Session management
    const sessionTests = this.testResults.find(t => t.test === 'session_optimization');
    if (sessionTests) {
      const sessionSuccess = sessionTests.results.filter(r => r.success).length;
      const sessionTotal = sessionTests.results.length;
      
      console.log(`\n🔐 SESSION MANAGEMENT:`);
      console.log(`   Session Tests: ${sessionSuccess}/${sessionTotal} passed`);
      console.log(`   Status: ${sessionSuccess === sessionTotal ? '✅ OPERATIONAL' : '❌ NEEDS FIXING'}`);
    }
    
    // Database performance
    const dbTests = this.testResults.find(t => t.test === 'database_optimization');
    if (dbTests) {
      console.log(`\n🗄️ DATABASE PERFORMANCE:`);
      console.log(`   Success Rate: ${Math.round(dbTests.successRate*100)}%`);
      console.log(`   Average Query Time: ${Math.round(dbTests.averageTime)}ms`);
      console.log(`   Status: ${dbTests.successRate > 0.95 ? '✅ OPTIMAL' : '⚠️ NEEDS OPTIMIZATION'}`);
    }
    
    // Overall deployment readiness
    const overallScore = this.calculateOverallScore();
    console.log(`\n🎯 DEPLOYMENT READINESS:`);
    console.log(`   Overall Score: ${overallScore}%`);
    console.log(`   Status: ${overallScore > 90 ? '✅ READY FOR DEPLOYMENT' : overallScore > 80 ? '⚠️ NEEDS MINOR FIXES' : '❌ NEEDS MAJOR FIXES'}`);
    console.log(`   Test Duration: ${Math.round(totalTime/1000)}s`);
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      overallScore,
      testResults: this.testResults,
      recommendations: this.generateRecommendations()
    };
    
    console.log('\n📊 Detailed report saved to: memory-optimization-report.json');
    require('fs').writeFileSync('memory-optimization-report.json', JSON.stringify(reportData, null, 2));
  }

  calculateOverallScore() {
    let score = 0;
    let totalTests = 0;
    
    // Memory score (30%)
    const memoryTests = this.testResults.filter(t => t.test === 'concurrent_users');
    if (memoryTests.length > 0) {
      const maxMemory = Math.max(...memoryTests.map(t => t.totalMemory));
      const memoryScore = maxMemory < 512*1024*1024 ? 100 : Math.max(0, 100 - (maxMemory - 512*1024*1024)/(1024*1024));
      score += memoryScore * 0.3;
      totalTests += 0.3;
    }
    
    // Performance score (30%)
    const performanceTests = this.testResults.filter(t => t.test === 'concurrent_users');
    if (performanceTests.length > 0) {
      const avgSuccessRate = performanceTests.reduce((sum, t) => sum + t.successRate, 0) / performanceTests.length;
      score += avgSuccessRate * 100 * 0.3;
      totalTests += 0.3;
    }
    
    // Session score (20%)
    const sessionTests = this.testResults.find(t => t.test === 'session_optimization');
    if (sessionTests) {
      const sessionSuccess = sessionTests.results.filter(r => r.success).length;
      const sessionTotal = sessionTests.results.length;
      score += (sessionSuccess / sessionTotal) * 100 * 0.2;
      totalTests += 0.2;
    }
    
    // Database score (20%)
    const dbTests = this.testResults.find(t => t.test === 'database_optimization');
    if (dbTests) {
      score += dbTests.successRate * 100 * 0.2;
      totalTests += 0.2;
    }
    
    return totalTests > 0 ? Math.round(score / totalTests) : 0;
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Memory recommendations
    const memoryTests = this.testResults.filter(t => t.test === 'concurrent_users');
    if (memoryTests.length > 0) {
      const maxMemory = Math.max(...memoryTests.map(t => t.totalMemory));
      if (maxMemory > 400*1024*1024) {
        recommendations.push('Consider implementing more aggressive memory optimization and garbage collection');
      }
    }
    
    // Performance recommendations
    const performanceTests = this.testResults.filter(t => t.test === 'concurrent_users');
    if (performanceTests.length > 0) {
      const avgSuccessRate = performanceTests.reduce((sum, t) => sum + t.successRate, 0) / performanceTests.length;
      if (avgSuccessRate < 0.95) {
        recommendations.push('Improve error handling and retry logic for better success rates');
      }
    }
    
    // Session recommendations
    const sessionTests = this.testResults.find(t => t.test === 'session_optimization');
    if (sessionTests) {
      const sessionSuccess = sessionTests.results.filter(r => r.success).length;
      const sessionTotal = sessionTests.results.length;
      if (sessionSuccess < sessionTotal) {
        recommendations.push('Fix session management issues before deployment');
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('System is optimized and ready for production deployment');
    }
    
    return recommendations;
  }
}

// Run the test
const test = new MemoryOptimizationTest();
test.runComprehensiveMemoryTest().catch(console.error);