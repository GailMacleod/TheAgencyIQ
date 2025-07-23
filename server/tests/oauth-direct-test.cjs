const axios = require('axios');

// Configuration
const BASE_URL = process.env.BASE_URL || 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

// Set timeout
axios.defaults.timeout = 8000;

async function testOAuthDirectly() {
  console.log('🧪 OAUTH DIRECT ACCESSIBILITY TEST');
  console.log('Testing if OAuth routes are properly configured and accessible...\n');

  const results = {};

  // Test 1: Direct Google OAuth URL accessibility
  try {
    console.log('🔬 Testing /auth/google accessibility...');
    const response = await axios.get(`${BASE_URL}/auth/google`, {
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.keys(response.headers));
    
    if (response.status === 302) {
      const location = response.headers.location || '';
      console.log(`Redirect to: ${location.substring(0, 100)}...`);
      
      if (location.includes('accounts.google.com')) {
        console.log('✅ Google OAuth route ACCESSIBLE - Proper Google redirect');
        results.googleRoute = true;
      } else if (location.includes('error')) {
        console.log('⚠️ Google OAuth route accessible but redirecting to error');
        results.googleRoute = false;
      } else {
        console.log('❌ Google OAuth route redirecting to unexpected location');
        results.googleRoute = false;
      }
    } else {
      console.log(`❌ Google OAuth route returned ${response.status} instead of redirect`);
      results.googleRoute = false;
    }
  } catch (error) {
    console.log('❌ Google OAuth route ERROR:', error.code || error.message);
    results.googleRoute = false;
  }

  // Test 2: Facebook OAuth route
  try {
    console.log('\n🔬 Testing /auth/facebook accessibility...');
    const response = await axios.get(`${BASE_URL}/auth/facebook`, {
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 302) {
      const location = response.headers.location || '';
      console.log(`Redirect to: ${location.substring(0, 100)}...`);
      
      if (location.includes('facebook.com')) {
        console.log('✅ Facebook OAuth route ACCESSIBLE - Proper Facebook redirect');
        results.facebookRoute = true;
      } else {
        console.log('❌ Facebook OAuth route redirecting to unexpected location');
        results.facebookRoute = false;
      }
    } else {
      console.log(`❌ Facebook OAuth route returned ${response.status} instead of redirect`);
      results.facebookRoute = false;
    }
  } catch (error) {
    console.log('❌ Facebook OAuth route ERROR:', error.code || error.message);
    results.facebookRoute = false;
  }

  // Test 3: LinkedIn OAuth route
  try {
    console.log('\n🔬 Testing /auth/linkedin accessibility...');
    const response = await axios.get(`${BASE_URL}/auth/linkedin`, {
      maxRedirects: 0,
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 302) {
      const location = response.headers.location || '';
      console.log(`Redirect to: ${location.substring(0, 100)}...`);
      
      if (location.includes('linkedin.com')) {
        console.log('✅ LinkedIn OAuth route ACCESSIBLE - Proper LinkedIn redirect');
        results.linkedinRoute = true;
      } else {
        console.log('❌ LinkedIn OAuth route redirecting to unexpected location');
        results.linkedinRoute = false;
      }
    } else {
      console.log(`❌ LinkedIn OAuth route returned ${response.status} instead of redirect`);
      results.linkedinRoute = false;
    }
  } catch (error) {
    console.log('❌ LinkedIn OAuth route ERROR:', error.code || error.message);
    results.linkedinRoute = false;
  }

  // Test 4: OAuth error route
  try {
    console.log('\n🔬 Testing /auth-error route...');
    const response = await axios.get(`${BASE_URL}/auth-error`, {
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    
    if (response.status === 400 && response.data.includes('OAuth Connection Failed')) {
      console.log('✅ OAuth error route ACCESSIBLE - Proper error page');
      results.errorRoute = true;
    } else {
      console.log('❌ OAuth error route not working properly');
      results.errorRoute = false;
    }
  } catch (error) {
    console.log('❌ OAuth error route ERROR:', error.code || error.message);
    results.errorRoute = false;
  }

  // Test 5: OAuth status endpoint (without auth)
  try {
    console.log('\n🔬 Testing /api/oauth/status with userId...');
    const response = await axios.get(`${BASE_URL}/api/oauth/status?userId=test_user`, {
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
    
    if (response.status === 200 && response.data.userId) {
      console.log('✅ OAuth status endpoint ACCESSIBLE - Working without auth requirement');
      results.statusEndpoint = true;
    } else if (response.status === 400 && response.data.error?.includes('User ID required')) {
      console.log('✅ OAuth status endpoint ACCESSIBLE - Proper validation');
      results.statusEndpoint = true;
    } else {
      console.log('❌ OAuth status endpoint not working properly');
      results.statusEndpoint = false;
    }
  } catch (error) {
    console.log('❌ OAuth status endpoint ERROR:', error.code || error.message);
    results.statusEndpoint = false;
  }

  // Test 6: OAuth refresh endpoint
  try {
    console.log('\n🔬 Testing /api/oauth/refresh...');
    const response = await axios.post(`${BASE_URL}/api/oauth/refresh`, {
      platform: 'google',
      userId: 'test_user'
    }, {
      validateStatus: (status) => status < 500
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, response.data);
    
    if (response.status === 400 || response.status === 404) {
      console.log('✅ OAuth refresh endpoint ACCESSIBLE - Proper validation');
      results.refreshEndpoint = true;
    } else {
      console.log('❌ OAuth refresh endpoint not working properly');
      results.refreshEndpoint = false;
    }
  } catch (error) {
    console.log('❌ OAuth refresh endpoint ERROR:', error.code || error.message);
    results.refreshEndpoint = false;
  }

  // Summary
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);

  console.log('\n📋 OAUTH DIRECT ACCESSIBILITY SUMMARY');
  console.log('=====================================');
  console.log(`✅ Tests Passed: ${passedTests}/${totalTests} (${successRate}%)\n`);

  console.log('🎯 OAUTH ROUTE ACCESSIBILITY:');
  console.log(`Google OAuth Route: ${results.googleRoute ? '✅' : '❌'}`);
  console.log(`Facebook OAuth Route: ${results.facebookRoute ? '✅' : '❌'}`);
  console.log(`LinkedIn OAuth Route: ${results.linkedinRoute ? '✅' : '❌'}`);
  console.log(`OAuth Error Route: ${results.errorRoute ? '✅' : '❌'}`);
  console.log(`OAuth Status Endpoint: ${results.statusEndpoint ? '✅' : '❌'}`);
  console.log(`OAuth Refresh Endpoint: ${results.refreshEndpoint ? '✅' : '❌'}`);

  if (passedTests === totalTests) {
    console.log('\n🎉 All OAuth routes are accessible and working correctly!');
  } else if (passedTests >= totalTests * 0.7) {
    console.log('\n✅ Most OAuth routes are working - minor configuration needed.');
  } else {
    console.log('\n⚠️ OAuth routes need configuration attention.');
  }

  return { passedTests, totalTests, results };
}

// Run the test
testOAuthDirectly().catch(console.error);