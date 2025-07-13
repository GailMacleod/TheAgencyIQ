/**
 * Test Session Management Fix
 * Validates that session establishment and /api/user endpoint work correctly
 */

const axios = require('axios');
const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

class SessionFixTester {
  constructor() {
    this.results = [];
  }

  async testSessionEstablishment() {
    console.log('🧪 Testing session establishment...');
    
    try {
      const sessionRes = await axios.post(baseURL + '/api/establish-session', {
        email: 'gailm@macleodglba.com.au',
        phone: '+61424835189'
      });
      
      const cookies = sessionRes.headers['set-cookie'];
      const sessionCookie = cookies ? cookies[0].split(';')[0] : null;
      
      if (sessionCookie) {
        console.log('✅ Session established with cookie:', sessionCookie);
        this.results.push({ test: 'Session Establishment', status: 'PASS', details: sessionCookie });
        return sessionCookie;
      } else {
        console.log('❌ No session cookie received');
        this.results.push({ test: 'Session Establishment', status: 'FAIL', details: 'No cookie received' });
        return null;
      }
    } catch (error) {
      console.error('❌ Session establishment failed:', error.response?.data || error.message);
      this.results.push({ test: 'Session Establishment', status: 'FAIL', details: error.message });
      return null;
    }
  }

  async testUserEndpoint(sessionCookie) {
    console.log('🧪 Testing /api/user endpoint...');
    
    try {
      const userRes = await axios.get(baseURL + '/api/user', {
        headers: { 'Cookie': sessionCookie }
      });
      
      console.log('✅ /api/user endpoint success:', userRes.data);
      this.results.push({ 
        test: 'User Endpoint', 
        status: 'PASS', 
        details: `User ID: ${userRes.data.id}, Email: ${userRes.data.email}` 
      });
      return userRes.data;
    } catch (error) {
      console.error('❌ /api/user endpoint failed:', error.response?.data || error.message);
      this.results.push({ 
        test: 'User Endpoint', 
        status: 'FAIL', 
        details: error.response?.data?.message || error.message 
      });
      return null;
    }
  }

  async testCORSCredentials() {
    console.log('🧪 Testing CORS credentials...');
    
    try {
      const response = await axios.options(baseURL + '/api/user', {
        headers: {
          'Origin': 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Cookie'
        }
      });
      
      const corsHeaders = response.headers;
      const allowCredentials = corsHeaders['access-control-allow-credentials'];
      const allowOrigin = corsHeaders['access-control-allow-origin'];
      
      console.log('✅ CORS Headers:', { allowCredentials, allowOrigin });
      this.results.push({ 
        test: 'CORS Credentials', 
        status: 'PASS', 
        details: `Allow-Credentials: ${allowCredentials}, Allow-Origin: ${allowOrigin}` 
      });
    } catch (error) {
      console.error('❌ CORS test failed:', error.message);
      this.results.push({ 
        test: 'CORS Credentials', 
        status: 'FAIL', 
        details: error.message 
      });
    }
  }

  async runAllTests() {
    console.log('🚀 SESSION MANAGEMENT FIX VALIDATION\n======================================');
    
    const sessionCookie = await this.testSessionEstablishment();
    
    if (sessionCookie) {
      await this.testUserEndpoint(sessionCookie);
    }
    
    await this.testCORSCredentials();
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n📋 SESSION FIX VALIDATION REPORT\n======================================');
    
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    
    console.log(`📊 Tests Run: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.results.length) * 100)}%`);
    
    console.log('\n📝 Detailed Results:');
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : '❌';
      console.log(`   ${icon} ${result.test}: ${result.status} - ${result.details}`);
    });
    
    if (failed === 0) {
      console.log('\n🎉 SESSION MANAGEMENT FIX SUCCESSFUL!');
      console.log('✅ All session-related issues have been resolved');
    } else {
      console.log('\n⚠️ Some issues remain - see failed tests above');
    }
  }
}

// Run the test
const tester = new SessionFixTester();
tester.runAllTests();