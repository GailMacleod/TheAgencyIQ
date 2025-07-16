/**
 * TARGETED COOKIE TRANSMISSION TEST
 * Tests the exact issue with cookie transmission between requests
 */

const axios = require('axios');

const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class CookieTransmissionTest {
  constructor() {
    this.cookies = '';
    this.testResults = [];
  }

  async runTest() {
    console.log('🔍 TARGETED COOKIE TRANSMISSION TEST');
    console.log('====================================');
    
    try {
      // Step 1: Establish session
      await this.establishSession();
      
      // Step 2: Test cookie transmission 
      await this.testCookieTransmission();
      
      // Step 3: Test with manual cookie header
      await this.testManualCookie();
      
    } catch (error) {
      console.error('❌ Test failed:', error.message);
      this.testResults.push({
        step: 'ERROR',
        status: 'FAILED',
        error: error.message
      });
    }
    
    this.generateReport();
  }

  async establishSession() {
    console.log('\n📡 Step 1: Establishing session...');
    
    const response = await axios.post(`${BASE_URL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      withCredentials: true
    });

    if (response.status === 200) {
      // Extract cookies from response
      this.cookies = response.headers['set-cookie']?.[0] || '';
      const sessionMatch = this.cookies.match(/theagencyiq\.session=([^;]+)/);
      this.sessionId = sessionMatch ? sessionMatch[1] : null;
      
      // Create clean cookie header without metadata
      this.cleanCookie = `theagencyiq.session=${this.sessionId}`;
      
      console.log('✅ Session established successfully');
      console.log('📋 Session ID:', this.sessionId);
      console.log('🍪 Cookie:', this.cookies);
      
      this.testResults.push({
        step: 'Session Establishment',
        status: 'SUCCESS',
        sessionId: this.sessionId,
        cookie: this.cookies
      });
    } else {
      throw new Error(`Session establishment failed: ${response.status}`);
    }
  }

  async testCookieTransmission() {
    console.log('\n🔍 Step 2: Testing automatic cookie transmission...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/user`, {
        withCredentials: true,
        headers: {
          'Accept': 'application/json',
          'Cookie': this.cleanCookie
        }
      });
      
      if (response.status === 200) {
        console.log('✅ Cookie transmission successful');
        console.log('📋 User:', response.data.email);
        
        this.testResults.push({
          step: 'Cookie Transmission',
          status: 'SUCCESS',
          user: response.data.email
        });
      } else {
        throw new Error(`Cookie transmission failed: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Cookie transmission failed:', error.response?.status, error.response?.data?.message);
      
      this.testResults.push({
        step: 'Cookie Transmission',
        status: 'FAILED',
        error: error.response?.data?.message || error.message,
        statusCode: error.response?.status
      });
    }
  }

  async testManualCookie() {
    console.log('\n🔧 Step 3: Testing manual cookie header...');
    
    try {
      const response = await axios.get(`${BASE_URL}/api/user`, {
        headers: {
          'Accept': 'application/json',
          'Cookie': this.cleanCookie
        }
      });
      
      if (response.status === 200) {
        console.log('✅ Manual cookie successful');
        console.log('📋 User:', response.data.email);
        
        this.testResults.push({
          step: 'Manual Cookie',
          status: 'SUCCESS',
          user: response.data.email
        });
      } else {
        throw new Error(`Manual cookie failed: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Manual cookie failed:', error.response?.status, error.response?.data?.message);
      
      this.testResults.push({
        step: 'Manual Cookie',
        status: 'FAILED',
        error: error.response?.data?.message || error.message,
        statusCode: error.response?.status
      });
    }
  }

  generateReport() {
    console.log('\n📊 FINAL REPORT');
    console.log('================');
    
    this.testResults.forEach(result => {
      const status = result.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`${status} ${result.step}: ${result.status}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.sessionId) {
        console.log(`   Session ID: ${result.sessionId}`);
      }
      
      if (result.user) {
        console.log(`   User: ${result.user}`);
      }
    });
    
    const successCount = this.testResults.filter(r => r.status === 'SUCCESS').length;
    const totalCount = this.testResults.length;
    
    console.log(`\n📈 Overall Success Rate: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);
    
    if (successCount === totalCount) {
      console.log('🎉 All tests passed - cookie transmission is working!');
    } else {
      console.log('⚠️ Some tests failed - cookie transmission needs fixes');
    }
  }
}

// Run the test
const test = new CookieTransmissionTest();
test.runTest().catch(console.error);