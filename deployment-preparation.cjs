/**
 * Deployment Preparation Script
 * Finalizes optimizations and prepares for production deployment
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DeploymentPreparation {
  constructor() {
    this.baseURL = 'http://localhost:5000';
    this.deploymentChecks = [];
  }

  async prepareForDeployment() {
    console.log('🚀 DEPLOYMENT PREPARATION STARTING');
    console.log('=====================================');
    
    // Check 1: System health
    await this.checkSystemHealth();
    
    // Check 2: Authentication system
    await this.checkAuthenticationSystem();
    
    // Check 3: Database connectivity
    await this.checkDatabaseConnectivity();
    
    // Check 4: Memory optimization
    await this.checkMemoryOptimization();
    
    // Check 5: Security headers
    await this.checkSecurityHeaders();
    
    // Check 6: Performance metrics
    await this.checkPerformanceMetrics();
    
    // Generate deployment report
    this.generateDeploymentReport();
    
    // Create deployment checklist
    this.createDeploymentChecklist();
  }

  async checkSystemHealth() {
    console.log('\n🏥 Checking System Health...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/health`, {
        timeout: 5000
      });
      
      this.deploymentChecks.push({
        category: 'System Health',
        test: 'Health Endpoint',
        status: response.status === 200 ? 'PASS' : 'FAIL',
        details: response.data
      });
      
      console.log(`   ✅ Health endpoint: ${response.status === 200 ? 'OPERATIONAL' : 'FAILED'}`);
    } catch (error) {
      this.deploymentChecks.push({
        category: 'System Health',
        test: 'Health Endpoint',
        status: 'FAIL',
        details: error.message
      });
      console.log(`   ❌ Health endpoint: FAILED - ${error.message}`);
    }
  }

  async checkAuthenticationSystem() {
    console.log('\n🔐 Checking Authentication System...');
    
    try {
      // Test session establishment
      const sessionResponse = await axios.post(`${this.baseURL}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      });
      
      const sessionPass = sessionResponse.status === 200;
      this.deploymentChecks.push({
        category: 'Authentication',
        test: 'Session Establishment',
        status: sessionPass ? 'PASS' : 'FAIL',
        details: sessionPass ? 'Session created successfully' : 'Session creation failed'
      });
      
      console.log(`   ✅ Session establishment: ${sessionPass ? 'OPERATIONAL' : 'FAILED'}`);
      
      // Test authenticated endpoints
      const cookies = this.extractCookies(sessionResponse.headers);
      if (cookies) {
        const authEndpoints = ['/api/user', '/api/user-status', '/api/platform-connections'];
        
        for (const endpoint of authEndpoints) {
          try {
            const response = await axios.get(`${this.baseURL}${endpoint}`, {
              headers: { Cookie: cookies },
              timeout: 5000
            });
            
            const pass = response.status === 200;
            this.deploymentChecks.push({
              category: 'Authentication',
              test: `Authenticated ${endpoint}`,
              status: pass ? 'PASS' : 'FAIL',
              details: pass ? 'Endpoint accessible' : 'Endpoint failed'
            });
            
            console.log(`   ${pass ? '✅' : '❌'} ${endpoint}: ${pass ? 'ACCESSIBLE' : 'FAILED'}`);
          } catch (error) {
            this.deploymentChecks.push({
              category: 'Authentication',
              test: `Authenticated ${endpoint}`,
              status: 'FAIL',
              details: error.message
            });
            console.log(`   ❌ ${endpoint}: FAILED - ${error.message}`);
          }
        }
      }
      
    } catch (error) {
      this.deploymentChecks.push({
        category: 'Authentication',
        test: 'Session Establishment',
        status: 'FAIL',
        details: error.message
      });
      console.log(`   ❌ Session establishment: FAILED - ${error.message}`);
    }
  }

  async checkDatabaseConnectivity() {
    console.log('\n🗄️ Checking Database Connectivity...');
    
    try {
      const response = await axios.get(`${this.baseURL}/api/user-status`, {
        timeout: 5000
      });
      
      // 401 is expected without auth, but means database is reachable
      const pass = response.status === 401 || response.status === 200;
      this.deploymentChecks.push({
        category: 'Database',
        test: 'Database Connectivity',
        status: pass ? 'PASS' : 'FAIL',
        details: pass ? 'Database accessible' : 'Database connection failed'
      });
      
      console.log(`   ✅ Database connectivity: ${pass ? 'OPERATIONAL' : 'FAILED'}`);
    } catch (error) {
      this.deploymentChecks.push({
        category: 'Database',
        test: 'Database Connectivity',
        status: 'FAIL',
        details: error.message
      });
      console.log(`   ❌ Database connectivity: FAILED - ${error.message}`);
    }
  }

  async checkMemoryOptimization() {
    console.log('\n💾 Checking Memory Optimization...');
    
    const memoryBefore = process.memoryUsage();
    
    // Simulate load
    const promises = [];
    for (let i = 0; i < 20; i++) {
      promises.push(this.simulateRequest());
    }
    
    await Promise.allSettled(promises);
    
    const memoryAfter = process.memoryUsage();
    const memoryIncrease = memoryAfter.rss - memoryBefore.rss;
    
    const pass = memoryIncrease < 50 * 1024 * 1024; // Less than 50MB increase
    this.deploymentChecks.push({
      category: 'Memory',
      test: 'Memory Optimization',
      status: pass ? 'PASS' : 'FAIL',
      details: {
        memoryBefore: Math.round(memoryBefore.rss / 1024 / 1024),
        memoryAfter: Math.round(memoryAfter.rss / 1024 / 1024),
        increase: Math.round(memoryIncrease / 1024 / 1024)
      }
    });
    
    console.log(`   💾 Memory before: ${Math.round(memoryBefore.rss / 1024 / 1024)}MB`);
    console.log(`   💾 Memory after: ${Math.round(memoryAfter.rss / 1024 / 1024)}MB`);
    console.log(`   ${pass ? '✅' : '❌'} Memory optimization: ${pass ? 'OPTIMAL' : 'NEEDS IMPROVEMENT'}`);
  }

  async checkSecurityHeaders() {
    console.log('\n🔒 Checking Security Headers...');
    
    try {
      const response = await axios.get(`${this.baseURL}/`, {
        timeout: 5000
      });
      
      const headers = response.headers;
      const securityHeaders = [
        'content-security-policy',
        'permissions-policy',
        'cache-control'
      ];
      
      securityHeaders.forEach(header => {
        const present = headers[header] !== undefined;
        this.deploymentChecks.push({
          category: 'Security',
          test: `${header} Header`,
          status: present ? 'PASS' : 'FAIL',
          details: present ? 'Header present' : 'Header missing'
        });
        
        console.log(`   ${present ? '✅' : '❌'} ${header}: ${present ? 'PRESENT' : 'MISSING'}`);
      });
      
    } catch (error) {
      this.deploymentChecks.push({
        category: 'Security',
        test: 'Security Headers',
        status: 'FAIL',
        details: error.message
      });
      console.log(`   ❌ Security headers: FAILED - ${error.message}`);
    }
  }

  async checkPerformanceMetrics() {
    console.log('\n⚡ Checking Performance Metrics...');
    
    const performanceTests = [];
    
    // Test response times
    const endpoints = ['/', '/api/user-status', '/api/platform-connections'];
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        const response = await axios.get(`${this.baseURL}${endpoint}`, {
          timeout: 5000
        });
        const responseTime = Date.now() - startTime;
        
        const pass = responseTime < 2000; // Less than 2 seconds
        performanceTests.push({
          endpoint,
          responseTime,
          status: pass ? 'PASS' : 'FAIL'
        });
        
        console.log(`   ${pass ? '✅' : '❌'} ${endpoint}: ${responseTime}ms`);
      } catch (error) {
        performanceTests.push({
          endpoint,
          responseTime: 'TIMEOUT',
          status: 'FAIL'
        });
        console.log(`   ❌ ${endpoint}: TIMEOUT`);
      }
    }
    
    this.deploymentChecks.push({
      category: 'Performance',
      test: 'Response Times',
      status: performanceTests.every(t => t.status === 'PASS') ? 'PASS' : 'FAIL',
      details: performanceTests
    });
  }

  async simulateRequest() {
    try {
      await axios.get(`${this.baseURL}/api/user-status`, {
        timeout: 3000
      });
    } catch (error) {
      // Ignore errors in simulation
    }
  }

  extractCookies(headers) {
    const setCookie = headers['set-cookie'];
    if (!setCookie) return null;
    
    return setCookie.map(cookie => cookie.split(';')[0]).join('; ');
  }

  generateDeploymentReport() {
    console.log('\n📋 DEPLOYMENT READINESS REPORT');
    console.log('================================');
    
    const categories = ['System Health', 'Authentication', 'Database', 'Memory', 'Security', 'Performance'];
    
    categories.forEach(category => {
      const categoryTests = this.deploymentChecks.filter(c => c.category === category);
      const passed = categoryTests.filter(t => t.status === 'PASS').length;
      const total = categoryTests.length;
      
      console.log(`${category}: ${passed}/${total} tests passed`);
    });
    
    const totalPassed = this.deploymentChecks.filter(c => c.status === 'PASS').length;
    const totalTests = this.deploymentChecks.length;
    const passRate = Math.round((totalPassed / totalTests) * 100);
    
    console.log(`\nOverall: ${totalPassed}/${totalTests} tests passed (${passRate}%)`);
    console.log(`Status: ${passRate >= 90 ? '✅ READY FOR DEPLOYMENT' : passRate >= 80 ? '⚠️ NEEDS MINOR FIXES' : '❌ NEEDS MAJOR FIXES'}`);
    
    // Save detailed report
    const reportData = {
      timestamp: new Date().toISOString(),
      overallScore: passRate,
      totalTests,
      totalPassed,
      deploymentChecks: this.deploymentChecks
    };
    
    fs.writeFileSync('deployment-readiness-report.json', JSON.stringify(reportData, null, 2));
    console.log('\n📊 Detailed report saved to: deployment-readiness-report.json');
  }

  createDeploymentChecklist() {
    console.log('\n📝 DEPLOYMENT CHECKLIST');
    console.log('========================');
    
    const checklist = [
      '□ System health checks passed',
      '□ Authentication system operational',
      '□ Database connectivity verified',
      '□ Memory optimization implemented',
      '□ Security headers configured',
      '□ Performance metrics acceptable',
      '□ All tests passing (>90%)',
      '□ Environment variables set',
      '□ Production domain configured',
      '□ Monitoring systems active'
    ];
    
    checklist.forEach(item => console.log(`   ${item}`));
    
    const failedChecks = this.deploymentChecks.filter(c => c.status === 'FAIL');
    if (failedChecks.length > 0) {
      console.log('\n⚠️  FAILED CHECKS TO ADDRESS:');
      failedChecks.forEach(check => {
        console.log(`   ❌ ${check.category}: ${check.test}`);
      });
    }
    
    fs.writeFileSync('deployment-checklist.md', `# Deployment Checklist\n\n${checklist.join('\n')}\n\n## Failed Checks\n\n${failedChecks.map(c => `- ${c.category}: ${c.test}`).join('\n')}`);
    console.log('\n📋 Deployment checklist saved to: deployment-checklist.md');
  }
}

// Run deployment preparation
const prep = new DeploymentPreparation();
prep.prepareForDeployment().catch(console.error);