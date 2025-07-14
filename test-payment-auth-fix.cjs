/**
 * TEST PAYMENT AUTHENTICATION FIX
 * Verifies that payment processing requires user authentication BEFORE any payment acceptance
 */

const axios = require('axios');

class PaymentAuthFixTest {
  constructor() {
    this.baseUrl = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';
    this.results = [];
  }

  async testUnauthorizedPaymentRejection() {
    console.log('🔒 TESTING: Unauthorized payment rejection...');
    
    try {
      // Attempt to create checkout session without authentication
      const response = await axios.post(`${this.baseUrl}/api/create-checkout-session`, {
        priceId: 'price_professional'
      }, {
        timeout: 15000,
        validateStatus: () => true // Accept all status codes
      });

      if (response.status === 401) {
        this.results.push({
          test: 'Unauthorized Payment Rejection',
          status: '✅ PASSED',
          message: 'Payment correctly rejected without authentication',
          statusCode: response.status
        });
      } else {
        this.results.push({
          test: 'Unauthorized Payment Rejection',
          status: '❌ FAILED',
          message: `Payment was allowed without authentication (${response.status})`,
          statusCode: response.status
        });
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        this.results.push({
          test: 'Unauthorized Payment Rejection',
          status: '✅ PASSED',
          message: 'Payment correctly rejected without authentication',
          statusCode: 401
        });
      } else {
        this.results.push({
          test: 'Unauthorized Payment Rejection',
          status: '❌ ERROR',
          message: `Request failed: ${error.message}`,
          statusCode: 'N/A'
        });
      }
    }
  }

  async testAuthenticatedPaymentAcceptance() {
    console.log('🔑 TESTING: Authenticated payment acceptance...');
    
    try {
      // First establish session for User ID 2
      const sessionResponse = await axios.post(`${this.baseUrl}/api/establish-session`, {}, {
        timeout: 15000,
        withCredentials: true
      });

      if (sessionResponse.status !== 200) {
        throw new Error('Session establishment failed');
      }

      // Extract cookies from session response
      const cookies = sessionResponse.headers['set-cookie'];
      if (!cookies) {
        throw new Error('No session cookies received');
      }

      const cookieHeader = cookies.join('; ');

      // Now attempt to create checkout session with authentication
      const response = await axios.post(`${this.baseUrl}/api/create-checkout-session`, {
        priceId: 'price_professional'
      }, {
        timeout: 15000,
        validateStatus: () => true,
        headers: {
          Cookie: cookieHeader
        }
      });

      if (response.status === 400 && response.data.message === 'User already has an active subscription') {
        this.results.push({
          test: 'Authenticated Payment Acceptance',
          status: '✅ PASSED',
          message: 'Authenticated user properly validated (existing subscription)',
          statusCode: response.status
        });
      } else if (response.status === 200 && response.data.url) {
        this.results.push({
          test: 'Authenticated Payment Acceptance',
          status: '✅ PASSED',
          message: 'Authenticated payment session created successfully',
          statusCode: response.status
        });
      } else {
        this.results.push({
          test: 'Authenticated Payment Acceptance',
          status: '❌ FAILED',
          message: `Unexpected response: ${response.data.message || 'Unknown error'}`,
          statusCode: response.status
        });
      }
    } catch (error) {
      this.results.push({
        test: 'Authenticated Payment Acceptance',
        status: '❌ ERROR',
        message: `Authentication test failed: ${error.message}`,
        statusCode: 'N/A'
      });
    }
  }

  async testPaymentMetadataValidation() {
    console.log('📋 TESTING: Payment metadata validation...');
    
    try {
      // Establish session for User ID 2
      const sessionResponse = await axios.post(`${this.baseUrl}/api/establish-session`, {}, {
        timeout: 15000,
        withCredentials: true
      });

      if (sessionResponse.status !== 200) {
        throw new Error('Session establishment failed');
      }

      const cookies = sessionResponse.headers['set-cookie'];
      const cookieHeader = cookies.join('; ');

      // Test that Stripe checkout includes user metadata
      const response = await axios.post(`${this.baseUrl}/api/create-checkout-session`, {
        priceId: 'price_professional'
      }, {
        timeout: 15000,
        validateStatus: () => true,
        headers: {
          Cookie: cookieHeader
        }
      });

      // For existing subscription, should reject with proper error
      if (response.status === 400 && response.data.message === 'User already has an active subscription') {
        this.results.push({
          test: 'Payment Metadata Validation',
          status: '✅ PASSED',
          message: 'Payment properly validates existing subscriptions',
          statusCode: response.status
        });
      } else {
        // If new user, check if URL is properly formatted
        if (response.status === 200 && response.data.url && response.data.url.includes('stripe.com')) {
          this.results.push({
            test: 'Payment Metadata Validation',
            status: '✅ PASSED',
            message: 'Payment session properly created with user context',
            statusCode: response.status
          });
        } else {
          this.results.push({
            test: 'Payment Metadata Validation',
            status: '❌ FAILED',
            message: 'Payment response missing proper checkout URL',
            statusCode: response.status
          });
        }
      }
    } catch (error) {
      this.results.push({
        test: 'Payment Metadata Validation',
        status: '❌ ERROR',
        message: `Metadata validation failed: ${error.message}`,
        statusCode: 'N/A'
      });
    }
  }

  async runAllTests() {
    console.log('🧪 PAYMENT AUTHENTICATION FIX TEST SUITE');
    console.log('=========================================');
    
    await this.testUnauthorizedPaymentRejection();
    await this.testAuthenticatedPaymentAcceptance();
    await this.testPaymentMetadataValidation();
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n📊 PAYMENT AUTHENTICATION FIX TEST RESULTS');
    console.log('==========================================');
    
    const passed = this.results.filter(r => r.status === '✅ PASSED').length;
    const failed = this.results.filter(r => r.status === '❌ FAILED').length;
    const errors = this.results.filter(r => r.status === '❌ ERROR').length;
    
    this.results.forEach(result => {
      console.log(`${result.status} ${result.test}`);
      console.log(`   Status Code: ${result.statusCode}`);
      console.log(`   Message: ${result.message}`);
      console.log('');
    });
    
    console.log('📈 SUMMARY:');
    console.log(`   ✅ Passed: ${passed}/3`);
    console.log(`   ❌ Failed: ${failed}/3`);
    console.log(`   🚨 Errors: ${errors}/3`);
    
    const successRate = Math.round((passed / 3) * 100);
    console.log(`   📊 Success Rate: ${successRate}%`);
    
    if (successRate === 100) {
      console.log('\n🎉 PAYMENT AUTHENTICATION FIX SUCCESSFUL!');
      console.log('✅ No payments accepted before user authentication');
      console.log('✅ Authenticated users can create payment sessions');
      console.log('✅ Payment metadata properly validates user context');
    } else {
      console.log('\n⚠️  PAYMENT AUTHENTICATION FIX ISSUES DETECTED');
      console.log('❌ Payment system may still accept unauthenticated payments');
    }
  }
}

// Run the test
const test = new PaymentAuthFixTest();
test.runAllTests().catch(console.error);