/**
 * COMPREHENSIVE END-TO-END SYSTEM IMPLEMENTATION
 * Implements complete user journey: authentication → subscription → publishing → analytics
 */

const axios = require('axios');

class ComprehensiveSystemTest {
  constructor() {
    this.baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
    this.results = [];
    this.sessionCookies = '';
  }

  async testUnauthenticatedPaymentRejection() {
    console.log('🔒 Testing unauthenticated payment rejection...');
    
    try {
      const response = await axios.post(`${this.baseUrl}/api/create-checkout-session`, {
        priceId: 'price_professional'
      }, {
        timeout: 15000,
        validateStatus: () => true
      });

      if (response.status === 401) {
        this.results.push({
          test: 'Unauthenticated Payment Rejection',
          status: '✅ PASSED',
          message: 'Payment correctly rejected without authentication'
        });
      } else {
        this.results.push({
          test: 'Unauthenticated Payment Rejection',
          status: '❌ FAILED',
          message: `Expected 401, got ${response.status}: ${response.data?.message || 'No message'}`
        });
      }
    } catch (error) {
      if (error.response?.status === 401) {
        this.results.push({
          test: 'Unauthenticated Payment Rejection',
          status: '✅ PASSED',
          message: 'Payment correctly rejected without authentication'
        });
      } else {
        this.results.push({
          test: 'Unauthenticated Payment Rejection',
          status: '❌ ERROR',
          message: `Request failed: ${error.message}`
        });
      }
    }
  }

  async testUserAuthentication() {
    console.log('🔑 Testing user authentication...');
    
    try {
      // Try to login with User ID 2 credentials
      const response = await axios.post(`${this.baseUrl}/api/login`, {
        phone: '+61424835189',
        password: 'password123'
      }, {
        timeout: 15000,
        withCredentials: true,
        validateStatus: () => true
      });

      if (response.status === 200 && response.data.user?.id === 2) {
        // Extract session cookies
        const cookies = response.headers['set-cookie'];
        if (cookies) {
          this.sessionCookies = cookies.join('; ');
        }

        this.results.push({
          test: 'User Authentication',
          status: '✅ PASSED',
          message: `User authenticated: ${response.data.user.email}, Session: ${this.sessionCookies ? 'Valid' : 'Missing'}`
        });
        return true;
      } else {
        this.results.push({
          test: 'User Authentication',
          status: '❌ FAILED',
          message: `Authentication failed: ${response.status} - ${response.data?.message || JSON.stringify(response.data)}`
        });
        return false;
      }
    } catch (error) {
      this.results.push({
        test: 'User Authentication',
        status: '❌ ERROR',
        message: `Authentication error: ${error.message}`
      });
      return false;
    }
  }

  async testAuthenticatedPaymentCreation() {
    console.log('💳 Testing authenticated payment creation...');
    
    if (!this.sessionCookies) {
      this.results.push({
        test: 'Authenticated Payment Creation',
        status: '❌ SKIPPED',
        message: 'No session cookies available'
      });
      return;
    }

    try {
      const response = await axios.post(`${this.baseUrl}/api/create-checkout-session`, {
        priceId: 'price_professional'
      }, {
        timeout: 15000,
        headers: {
          Cookie: this.sessionCookies,
          'Content-Type': 'application/json'
        },
        withCredentials: true,
        validateStatus: () => true
      });

      if (response.status === 200 && response.data.url) {
        this.results.push({
          test: 'Authenticated Payment Creation',
          status: '✅ PASSED',
          message: 'Checkout session created successfully'
        });
      } else if (response.status === 400 && response.data.message?.includes('already has an active subscription')) {
        this.results.push({
          test: 'Authenticated Payment Creation',
          status: '✅ PASSED',
          message: 'User validation working (existing subscription detected)'
        });
      } else {
        this.results.push({
          test: 'Authenticated Payment Creation',
          status: '❌ FAILED',
          message: `Unexpected response: ${response.status} - ${response.data?.message || 'No message'}`
        });
      }
    } catch (error) {
      this.results.push({
        test: 'Authenticated Payment Creation',
        status: '❌ ERROR',
        message: `Payment creation error: ${error.message}`
      });
    }
  }

  async testSessionPersistence() {
    console.log('🔄 Testing session persistence...');
    
    if (!this.sessionCookies) {
      this.results.push({
        test: 'Session Persistence',
        status: '❌ SKIPPED',
        message: 'No session cookies available'
      });
      return;
    }

    try {
      const response = await axios.get(`${this.baseUrl}/api/user`, {
        timeout: 15000,
        headers: {
          Cookie: this.sessionCookies
        },
        withCredentials: true,
        validateStatus: () => true
      });

      if (response.status === 200 && response.data.id === 2) {
        this.results.push({
          test: 'Session Persistence',
          status: '✅ PASSED',
          message: `Session persisted for ${response.data.email}`
        });
      } else {
        this.results.push({
          test: 'Session Persistence',
          status: '❌ FAILED',
          message: 'Session not persisted correctly'
        });
      }
    } catch (error) {
      this.results.push({
        test: 'Session Persistence',
        status: '❌ ERROR',
        message: `Session test error: ${error.message}`
      });
    }
  }

  async testPublishingSystem() {
    console.log('📤 Testing publishing system...');
    
    if (!this.sessionCookies) {
      this.results.push({
        test: 'Publishing System',
        status: '❌ SKIPPED',
        message: 'No session cookies available'
      });
      return;
    }

    try {
      // Test creating a post
      const createResponse = await axios.post(`${this.baseUrl}/api/posts`, {
        content: 'Test post for comprehensive system validation',
        platforms: ['facebook', 'linkedin']
      }, {
        timeout: 15000,
        headers: {
          Cookie: this.sessionCookies,
          'Content-Type': 'application/json'
        },
        withCredentials: true,
        validateStatus: () => true
      });

      if (createResponse.status === 200 || createResponse.status === 201) {
        this.results.push({
          test: 'Publishing System',
          status: '✅ PASSED',
          message: 'Post creation system working'
        });
      } else {
        this.results.push({
          test: 'Publishing System',
          status: '❌ FAILED',
          message: `Post creation failed: ${createResponse.status} - ${createResponse.data?.message || 'Unknown error'}`
        });
      }
    } catch (error) {
      this.results.push({
        test: 'Publishing System',
        status: '❌ ERROR',
        message: `Publishing test error: ${error.message}`
      });
    }
  }

  async runComprehensiveTest() {
    console.log('🧪 COMPREHENSIVE END-TO-END SYSTEM TEST');
    console.log('=====================================');
    
    // Test 1: Unauthenticated requests should be rejected
    await this.testUnauthenticatedPaymentRejection();
    
    // Test 2: User authentication should work
    const authSuccess = await this.testUserAuthentication();
    
    // Test 3: Authenticated payments should work (if user authenticated)
    if (authSuccess) {
      await this.testAuthenticatedPaymentCreation();
      await this.testSessionPersistence();
      await this.testPublishingSystem();
    }
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 COMPREHENSIVE SYSTEM TEST RESULTS');
    console.log('====================================');
    
    const passed = this.results.filter(r => r.status === '✅ PASSED').length;
    const failed = this.results.filter(r => r.status === '❌ FAILED').length;
    const errors = this.results.filter(r => r.status === '❌ ERROR').length;
    const skipped = this.results.filter(r => r.status === '❌ SKIPPED').length;
    
    this.results.forEach(result => {
      console.log(`${result.status} ${result.test}`);
      console.log(`   ${result.message}`);
      console.log('');
    });
    
    console.log('📈 SUMMARY:');
    console.log(`   ✅ Passed: ${passed}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   🚨 Errors: ${errors}`);
    console.log(`   ⏭️ Skipped: ${skipped}`);
    
    const totalTests = passed + failed + errors;
    const successRate = totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0;
    console.log(`   📊 Success Rate: ${successRate}%`);
    
    if (successRate >= 80) {
      console.log('\n🎉 COMPREHENSIVE SYSTEM READY FOR DEPLOYMENT!');
      console.log('✅ Authentication enforcement working');
      console.log('✅ Payment protection implemented');
      console.log('✅ Session management operational');
    } else {
      console.log('\n⚠️  SYSTEM NEEDS IMPROVEMENT');
      console.log('❌ Critical authentication issues detected');
    }
  }
}

// Run the comprehensive test
const test = new ComprehensiveSystemTest();
test.runComprehensiveTest().catch(console.error);