/**
 * 200-User Scalability Test for TheAgencyIQ
 * Tests authenticated publishing with 200 concurrent users
 * Each user publishes to all 5 platforms with real API integration
 */

const axios = require('axios');
const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class ScalabilityTest {
  constructor() {
    this.totalUsers = 200;
    this.successfulUsers = 0;
    this.failedUsers = 0;
    this.totalPublishAttempts = 0;
    this.successfulPublishAttempts = 0;
    this.userResults = [];
    this.platformStats = {
      facebook: { success: 0, failure: 0 },
      instagram: { success: 0, failure: 0 },
      linkedin: { success: 0, failure: 0 },
      x: { success: 0, failure: 0 },
      youtube: { success: 0, failure: 0 }
    };
    this.startTime = Date.now();
  }

  async simulateUser(userId) {
    const userResult = {
      userId,
      authenticated: false,
      postCreated: false,
      publishResults: {},
      totalPublishAttempts: 0,
      successfulPublishAttempts: 0,
      errors: []
    };

    try {
      // Step 1: Authenticate user
      const email = `testuser${userId}@example.com`;
      const phone = `+61400000${userId.toString().padStart(3, '0')}`;
      
      const authResponse = await axios.post(`${baseURL}/api/establish-session`, {
        email,
        phone
      }, {
        withCredentials: true,
        timeout: 30000,
        validateStatus: () => true
      });

      if (authResponse.status !== 200) {
        userResult.errors.push('Authentication failed');
        return userResult;
      }

      userResult.authenticated = true;
      
      // Extract session cookie
      const setCookieHeader = authResponse.headers['set-cookie'];
      let sessionCookie = '';
      if (setCookieHeader) {
        for (const cookie of setCookieHeader) {
          if (cookie.includes('theagencyiq.session=')) {
            sessionCookie = cookie.split(';')[0];
            break;
          }
        }
      }

      if (!sessionCookie) {
        userResult.errors.push('No session cookie found');
        return userResult;
      }

      // Step 2: Create test post
      const postResponse = await axios.post(`${baseURL}/api/posts`, {
        content: `Scalability test post from User ${userId} - ${new Date().toISOString()}`,
        scheduledFor: new Date(Date.now() + 60000).toISOString(),
        platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube']
      }, {
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/json'
        },
        timeout: 30000,
        validateStatus: () => true
      });

      if (postResponse.status !== 201) {
        userResult.errors.push('Post creation failed');
        return userResult;
      }

      userResult.postCreated = true;
      const postId = postResponse.data.id;

      // Step 3: Publish to all platforms
      const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
      
      for (const platform of platforms) {
        userResult.totalPublishAttempts++;
        this.totalPublishAttempts++;
        
        try {
          const publishResponse = await axios.post(`${baseURL}/api/posts/${postId}/publish`, {
            platforms: [platform]
          }, {
            headers: {
              'Cookie': sessionCookie,
              'Content-Type': 'application/json'
            },
            timeout: 30000,
            validateStatus: () => true
          });

          if (publishResponse.status === 200) {
            const publishResult = publishResponse.data;
            const platformResult = publishResult.results.find(r => r.platform === platform);
            
            if (platformResult && platformResult.success) {
              userResult.publishResults[platform] = {
                success: true,
                postId: platformResult.postId,
                quotaDeducted: platformResult.quotaDeducted
              };
              userResult.successfulPublishAttempts++;
              this.successfulPublishAttempts++;
              this.platformStats[platform].success++;
            } else {
              userResult.publishResults[platform] = {
                success: false,
                error: platformResult?.error || 'Unknown error'
              };
              this.platformStats[platform].failure++;
            }
          } else {
            userResult.publishResults[platform] = {
              success: false,
              error: `HTTP ${publishResponse.status}`
            };
            this.platformStats[platform].failure++;
          }
        } catch (error) {
          userResult.publishResults[platform] = {
            success: false,
            error: error.message
          };
          this.platformStats[platform].failure++;
        }
      }

      // User is successful if they published to at least 3 platforms
      if (userResult.successfulPublishAttempts >= 3) {
        this.successfulUsers++;
      } else {
        this.failedUsers++;
      }

    } catch (error) {
      userResult.errors.push(error.message);
      this.failedUsers++;
    }

    return userResult;
  }

  async runScalabilityTest() {
    console.log(`🚀 Starting 200-User Scalability Test`);
    console.log(`Testing ${this.totalUsers} concurrent users`);
    console.log(`Each user will publish to 5 platforms`);
    console.log(`Expected total publish attempts: ${this.totalUsers * 5}`);
    console.log('=====================================');

    // Create promises for all users
    const userPromises = [];
    for (let i = 1; i <= this.totalUsers; i++) {
      userPromises.push(this.simulateUser(i));
    }

    // Execute all users concurrently
    console.log(`📊 Processing ${this.totalUsers} users concurrently...`);
    const results = await Promise.all(userPromises);
    
    this.userResults = results;
    const duration = Date.now() - this.startTime;

    // Generate comprehensive report
    this.generateReport(duration);
    
    return {
      success: this.successfulUsers >= (this.totalUsers * 0.8), // 80% success rate
      totalUsers: this.totalUsers,
      successfulUsers: this.successfulUsers,
      failedUsers: this.failedUsers,
      totalPublishAttempts: this.totalPublishAttempts,
      successfulPublishAttempts: this.successfulPublishAttempts,
      platformStats: this.platformStats,
      duration,
      averageResponseTime: duration / this.totalUsers,
      report: this.generateReport(duration)
    };
  }

  generateReport(duration) {
    console.log('\n📈 200-USER SCALABILITY TEST RESULTS');
    console.log('====================================');
    console.log(`Total Users: ${this.totalUsers}`);
    console.log(`Successful Users: ${this.successfulUsers} (${Math.round(this.successfulUsers/this.totalUsers*100)}%)`);
    console.log(`Failed Users: ${this.failedUsers} (${Math.round(this.failedUsers/this.totalUsers*100)}%)`);
    console.log(`Test Duration: ${Math.round(duration/1000)}s`);
    console.log(`Average Response Time: ${Math.round(duration/this.totalUsers)}ms per user`);
    
    console.log('\n🎯 PUBLISHING PERFORMANCE:');
    console.log(`Total Publish Attempts: ${this.totalPublishAttempts}`);
    console.log(`Successful Publishes: ${this.successfulPublishAttempts} (${Math.round(this.successfulPublishAttempts/this.totalPublishAttempts*100)}%)`);
    console.log(`Failed Publishes: ${this.totalPublishAttempts - this.successfulPublishAttempts} (${Math.round((this.totalPublishAttempts - this.successfulPublishAttempts)/this.totalPublishAttempts*100)}%)`);
    
    console.log('\n📊 PLATFORM-SPECIFIC RESULTS:');
    for (const [platform, stats] of Object.entries(this.platformStats)) {
      const total = stats.success + stats.failure;
      const successRate = total > 0 ? Math.round(stats.success / total * 100) : 0;
      console.log(`  ${platform}: ${stats.success}/${total} (${successRate}% success)`);
    }
    
    console.log('\n⚡ PERFORMANCE METRICS:');
    console.log(`Concurrent Users Handled: ${this.totalUsers}`);
    console.log(`Total API Calls: ${this.totalUsers * 7} (auth + post + 5 platforms)`);
    console.log(`Average API Response Time: ${Math.round(duration / (this.totalUsers * 7))}ms`);
    
    // Calculate production readiness
    const overallSuccessRate = this.successfulPublishAttempts / this.totalPublishAttempts;
    const userSuccessRate = this.successfulUsers / this.totalUsers;
    const isProductionReady = overallSuccessRate >= 0.8 && userSuccessRate >= 0.8;
    
    console.log('\n🎪 PRODUCTION READINESS:');
    console.log(`Overall Success Rate: ${Math.round(overallSuccessRate * 100)}%`);
    console.log(`User Success Rate: ${Math.round(userSuccessRate * 100)}%`);
    console.log(`Production Ready: ${isProductionReady ? '✅ YES' : '❌ NO'}`);
    
    if (!isProductionReady) {
      console.log('\n⚠️  PRODUCTION READINESS ISSUES:');
      if (overallSuccessRate < 0.8) {
        console.log('  - Overall success rate below 80%');
      }
      if (userSuccessRate < 0.8) {
        console.log('  - User success rate below 80%');
      }
    }
    
    // Save detailed results
    const reportData = {
      timestamp: new Date().toISOString(),
      totalUsers: this.totalUsers,
      successfulUsers: this.successfulUsers,
      failedUsers: this.failedUsers,
      totalPublishAttempts: this.totalPublishAttempts,
      successfulPublishAttempts: this.successfulPublishAttempts,
      platformStats: this.platformStats,
      duration,
      averageResponseTime: duration / this.totalUsers,
      overallSuccessRate,
      userSuccessRate,
      isProductionReady,
      userResults: this.userResults
    };
    
    const fs = require('fs');
    const reportFilename = `200_USER_SCALABILITY_TEST_REPORT_${Date.now()}.json`;
    fs.writeFileSync(reportFilename, JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Detailed report saved: ${reportFilename}`);
    
    return reportData;
  }
}

// Run the test
async function runTest() {
  const test = new ScalabilityTest();
  const results = await test.runScalabilityTest();
  
  if (results.success) {
    console.log('\n🎉 SCALABILITY TEST PASSED - System ready for 200+ users!');
    process.exit(0);
  } else {
    console.log('\n❌ SCALABILITY TEST FAILED - System needs optimization');
    process.exit(1);
  }
}

runTest().catch(console.error);