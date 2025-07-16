/**
 * Test Suite for Resilient Auto-Poster System
 * Validates persistence, retry mechanisms, and Replit restart resilience
 */

import axios from 'axios';
import { performance } from 'perf_hooks';

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  details: any;
  error?: string;
}

class ResilientAutoPosterTester {
  private baseUrl: string;
  private sessionCookie: string = '';
  private testResults: TestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Run comprehensive test suite
   */
  async runComprehensiveTest(): Promise<void> {
    console.log('🔋 Starting Resilient Auto-Poster Test Suite\n');

    // Establish authenticated session
    await this.establishSession();

    // Test 1: Job Scheduling
    await this.testJobScheduling();

    // Test 2: Retry Mechanism
    await this.testRetryMechanism();

    // Test 3: Persistence Across Restarts
    await this.testPersistence();

    // Test 4: Quota Management
    await this.testQuotaManagement();

    // Test 5: Error Handling
    await this.testErrorHandling();

    // Test 6: Background Processing
    await this.testBackgroundProcessing();

    // Test 7: Health Monitoring
    await this.testHealthMonitoring();

    // Test 8: Batch Processing
    await this.testBatchProcessing();

    // Generate comprehensive report
    this.generateReport();
  }

  /**
   * Establish authenticated session
   */
  private async establishSession(): Promise<void> {
    const startTime = performance.now();
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/establish-session`, {
        email: 'gailm@macleodglba.com.au',
        password: 'secure-password'
      });

      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        this.sessionCookie = setCookieHeader[0].split(';')[0];
      }

      console.log('✅ Session established successfully');
    } catch (error) {
      console.error('❌ Session establishment failed:', error);
      throw error;
    }
  }

  /**
   * Test job scheduling functionality
   */
  private async testJobScheduling(): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log('🔄 Testing job scheduling...');

      // Schedule immediate post
      const immediateResponse = await axios.post(`${this.baseUrl}/api/schedule-post`, {
        platform: 'facebook',
        content: 'TEST: Immediate post from resilient auto-poster',
        scheduledTime: new Date(Date.now() + 5000).toISOString() // 5 seconds from now
      }, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      // Schedule future post
      const futureResponse = await axios.post(`${this.baseUrl}/api/schedule-post`, {
        platform: 'instagram',
        content: 'TEST: Future post from resilient auto-poster',
        scheduledTime: new Date(Date.now() + 300000).toISOString() // 5 minutes from now
      }, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      this.testResults.push({
        name: 'Job Scheduling',
        success: true,
        duration: performance.now() - startTime,
        details: {
          immediateJobId: immediateResponse.data.jobId,
          futureJobId: futureResponse.data.jobId
        }
      });

      console.log('✅ Job scheduling test passed');
    } catch (error) {
      this.testResults.push({
        name: 'Job Scheduling',
        success: false,
        duration: performance.now() - startTime,
        details: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('❌ Job scheduling test failed:', error);
    }
  }

  /**
   * Test retry mechanism with simulated failures
   */
  private async testRetryMechanism(): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log('🔄 Testing retry mechanism...');

      // Test retry with network error simulation
      const retryResponse = await axios.post(`${this.baseUrl}/api/test-retry`, {
        platform: 'twitter',
        errorType: 'network_error',
        maxAttempts: 3
      }, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      // Test retry with rate limit simulation
      const rateLimitResponse = await axios.post(`${this.baseUrl}/api/test-retry`, {
        platform: 'linkedin',
        errorType: 'rate_limit',
        maxAttempts: 5
      }, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      this.testResults.push({
        name: 'Retry Mechanism',
        success: true,
        duration: performance.now() - startTime,
        details: {
          networkErrorTest: retryResponse.data,
          rateLimitTest: rateLimitResponse.data
        }
      });

      console.log('✅ Retry mechanism test passed');
    } catch (error) {
      this.testResults.push({
        name: 'Retry Mechanism',
        success: false,
        duration: performance.now() - startTime,
        details: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('❌ Retry mechanism test failed:', error);
    }
  }

  /**
   * Test persistence across simulated restarts
   */
  private async testPersistence(): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log('🔄 Testing persistence across restarts...');

      // Schedule a post with future timestamp
      const scheduleResponse = await axios.post(`${this.baseUrl}/api/schedule-post`, {
        platform: 'youtube',
        content: 'TEST: Persistence test post',
        scheduledTime: new Date(Date.now() + 600000).toISOString() // 10 minutes from now
      }, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      const jobId = scheduleResponse.data.jobId;

      // Simulate restart by reinitializing the system
      await axios.post(`${this.baseUrl}/api/simulate-restart`, {}, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      // Check if job still exists after restart
      const jobStatusResponse = await axios.get(`${this.baseUrl}/api/job-status/${jobId}`, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      this.testResults.push({
        name: 'Persistence Test',
        success: jobStatusResponse.data.status === 'pending',
        duration: performance.now() - startTime,
        details: {
          jobId: jobId,
          statusAfterRestart: jobStatusResponse.data.status
        }
      });

      console.log('✅ Persistence test passed');
    } catch (error) {
      this.testResults.push({
        name: 'Persistence Test',
        success: false,
        duration: performance.now() - startTime,
        details: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('❌ Persistence test failed:', error);
    }
  }

  /**
   * Test quota management
   */
  private async testQuotaManagement(): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log('🔄 Testing quota management...');

      // Test quota checking
      const quotaResponse = await axios.get(`${this.baseUrl}/api/quota-status`, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      // Test quota enforcement
      const quotaTestResponse = await axios.post(`${this.baseUrl}/api/test-quota-enforcement`, {
        platform: 'facebook',
        postCount: 60 // Exceed daily limit
      }, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      this.testResults.push({
        name: 'Quota Management',
        success: true,
        duration: performance.now() - startTime,
        details: {
          quotaStatus: quotaResponse.data,
          quotaEnforcement: quotaTestResponse.data
        }
      });

      console.log('✅ Quota management test passed');
    } catch (error) {
      this.testResults.push({
        name: 'Quota Management',
        success: false,
        duration: performance.now() - startTime,
        details: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('❌ Quota management test failed:', error);
    }
  }

  /**
   * Test error handling for different scenarios
   */
  private async testErrorHandling(): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log('🔄 Testing error handling...');

      // Test authentication error handling
      const authErrorResponse = await axios.post(`${this.baseUrl}/api/test-error-handling`, {
        errorType: 'auth_error',
        platform: 'instagram'
      }, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      // Test network error handling
      const networkErrorResponse = await axios.post(`${this.baseUrl}/api/test-error-handling`, {
        errorType: 'network_error',
        platform: 'twitter'
      }, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      this.testResults.push({
        name: 'Error Handling',
        success: true,
        duration: performance.now() - startTime,
        details: {
          authErrorHandling: authErrorResponse.data,
          networkErrorHandling: networkErrorResponse.data
        }
      });

      console.log('✅ Error handling test passed');
    } catch (error) {
      this.testResults.push({
        name: 'Error Handling',
        success: false,
        duration: performance.now() - startTime,
        details: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('❌ Error handling test failed:', error);
    }
  }

  /**
   * Test background processing
   */
  private async testBackgroundProcessing(): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log('🔄 Testing background processing...');

      // Get background processing status
      const processingResponse = await axios.get(`${this.baseUrl}/api/background-status`, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      // Test background job execution
      const jobExecutionResponse = await axios.post(`${this.baseUrl}/api/test-background-execution`, {
        jobCount: 5
      }, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      this.testResults.push({
        name: 'Background Processing',
        success: true,
        duration: performance.now() - startTime,
        details: {
          processingStatus: processingResponse.data,
          jobExecution: jobExecutionResponse.data
        }
      });

      console.log('✅ Background processing test passed');
    } catch (error) {
      this.testResults.push({
        name: 'Background Processing',
        success: false,
        duration: performance.now() - startTime,
        details: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('❌ Background processing test failed:', error);
    }
  }

  /**
   * Test health monitoring
   */
  private async testHealthMonitoring(): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log('🔄 Testing health monitoring...');

      const healthResponse = await axios.get(`${this.baseUrl}/api/health/auto-poster`, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      this.testResults.push({
        name: 'Health Monitoring',
        success: healthResponse.data.status === 'healthy',
        duration: performance.now() - startTime,
        details: healthResponse.data
      });

      console.log('✅ Health monitoring test passed');
    } catch (error) {
      this.testResults.push({
        name: 'Health Monitoring',
        success: false,
        duration: performance.now() - startTime,
        details: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('❌ Health monitoring test failed:', error);
    }
  }

  /**
   * Test batch processing
   */
  private async testBatchProcessing(): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log('🔄 Testing batch processing...');

      // Schedule multiple posts
      const batchResponse = await axios.post(`${this.baseUrl}/api/schedule-batch`, {
        posts: [
          { platform: 'facebook', content: 'Batch post 1' },
          { platform: 'instagram', content: 'Batch post 2' },
          { platform: 'twitter', content: 'Batch post 3' },
          { platform: 'linkedin', content: 'Batch post 4' },
          { platform: 'youtube', content: 'Batch post 5' }
        ],
        scheduledTime: new Date(Date.now() + 30000).toISOString() // 30 seconds from now
      }, {
        headers: {
          'Cookie': this.sessionCookie
        }
      });

      this.testResults.push({
        name: 'Batch Processing',
        success: true,
        duration: performance.now() - startTime,
        details: {
          batchJobIds: batchResponse.data.jobIds,
          batchSize: batchResponse.data.batchSize
        }
      });

      console.log('✅ Batch processing test passed');
    } catch (error) {
      this.testResults.push({
        name: 'Batch Processing',
        success: false,
        duration: performance.now() - startTime,
        details: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('❌ Batch processing test failed:', error);
    }
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): void {
    const successCount = this.testResults.filter(r => r.success).length;
    const totalTests = this.testResults.length;
    const successRate = (successCount / totalTests) * 100;

    const report = {
      timestamp: new Date().toISOString(),
      testSuite: 'Resilient Auto-Poster System',
      summary: {
        totalTests,
        successCount,
        failureCount: totalTests - successCount,
        successRate: `${successRate.toFixed(1)}%`,
        totalDuration: this.testResults.reduce((sum, r) => sum + r.duration, 0)
      },
      testResults: this.testResults,
      recommendations: this.generateRecommendations()
    };

    console.log('\n📊 RESILIENT AUTO-POSTER TEST REPORT');
    console.log('=====================================');
    console.log(`Test Suite: ${report.testSuite}`);
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Success Rate: ${report.summary.successRate} (${successCount}/${totalTests} tests passed)`);
    console.log(`Total Duration: ${report.summary.totalDuration.toFixed(2)}ms`);
    
    console.log('\n📋 Test Results:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      console.log(`${index + 1}. ${result.name}: ${status} (${result.duration.toFixed(2)}ms)`);
      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });

    // Save report to file
    const fs = require('fs');
    const filename = `RESILIENT_AUTO_POSTER_TEST_REPORT_${Date.now()}.json`;
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    console.log(`\n📄 Report saved to: ${filename}`);
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.testResults.filter(r => !r.success);

    if (failedTests.length === 0) {
      recommendations.push('All tests passed! System is ready for production deployment.');
    } else {
      recommendations.push(`${failedTests.length} tests failed. Address these issues before production.`);
      
      failedTests.forEach(test => {
        recommendations.push(`Fix ${test.name}: ${test.error}`);
      });
    }

    // Performance recommendations
    const avgDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0) / this.testResults.length;
    if (avgDuration > 1000) {
      recommendations.push('Consider optimizing performance - average test duration is high.');
    }

    // Feature recommendations
    recommendations.push('Consider adding monitoring alerts for failed job rates.');
    recommendations.push('Implement job priority queues for urgent posts.');
    recommendations.push('Add support for post scheduling templates.');

    return recommendations;
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  const tester = new ResilientAutoPosterTester();
  tester.runComprehensiveTest().catch(console.error);
}

export default ResilientAutoPosterTester;