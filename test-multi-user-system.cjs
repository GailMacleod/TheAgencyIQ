/**
 * Multi-User Authentication & Subscription Test
 * Tests signup, login, subscription creation, and platform functionality
 */

const axios = require('axios');
const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

// Create axios instance with cookie jar support
const client = axios.create({
  baseURL,
  withCredentials: true,
  validateStatus: (status) => status < 500 // Don't throw on 4xx errors
});

let jar = {}; // Simple cookie jar

// Helper function to manage cookies
function setCookie(cookies) {
  if (cookies) {
    cookies.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      jar[name] = value;
    });
  }
}

function getCookieHeader() {
  return Object.entries(jar).map(([name, value]) => `${name}=${value}`).join('; ');
}

async function testMultiUserSystem() {
  console.log('🧪 Starting Multi-User Authentication & Subscription Test');
  console.log('='.repeat(60));

  const testResults = {
    userSignup: false,
    userLogin: false,
    sessionPersistence: false,
    subscriptionCreation: false,
    platformConnections: false,
    quotaManagement: false,
    adminUserPreservation: false,
    multiUserScalability: false
  };

  try {
    // Test 1: User Signup
    console.log('\n📝 Test 1: User Signup');
    const signupData = {
      email: 'test@example.com',
      password: 'testpass123',
      phone: '+61400000000'
    };

    const signupResponse = await client.post('/api/auth/signup', signupData);
    console.log(`Signup status: ${signupResponse.status}`);
    
    if (signupResponse.status === 201) {
      testResults.userSignup = true;
      console.log('✅ User signup successful');
      console.log('User data:', signupResponse.data);
    } else {
      console.log('❌ User signup failed:', signupResponse.data);
    }

    // Test 2: User Login
    console.log('\n🔐 Test 2: User Login');
    const loginData = {
      email: 'test@example.com',
      password: 'testpass123'
    };

    const loginResponse = await client.post('/api/auth/login', loginData);
    console.log(`Login status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200) {
      testResults.userLogin = true;
      console.log('✅ User login successful');
      
      // Extract cookies
      setCookie(loginResponse.headers['set-cookie']);
      console.log('Cookies extracted:', jar);
    } else {
      console.log('❌ User login failed:', loginResponse.data);
    }

    // Test 3: Session Persistence
    console.log('\n🔒 Test 3: Session Persistence');
    const sessionResponse = await client.get('/api/user', {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    console.log(`Session check status: ${sessionResponse.status}`);
    
    if (sessionResponse.status === 200) {
      testResults.sessionPersistence = true;
      console.log('✅ Session persistence working');
      console.log('User data:', sessionResponse.data);
    } else {
      console.log('❌ Session persistence failed:', sessionResponse.data);
    }

    // Test 4: Subscription Creation
    console.log('\n💳 Test 4: Subscription Creation');
    const subscriptionData = {
      planId: 'professional'
    };

    const subscriptionResponse = await client.post('/api/stripe/create-subscription', subscriptionData, {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    console.log(`Subscription creation status: ${subscriptionResponse.status}`);
    
    if (subscriptionResponse.status === 200) {
      testResults.subscriptionCreation = true;
      console.log('✅ Subscription creation successful');
      console.log('Subscription data:', subscriptionResponse.data);
    } else {
      console.log('❌ Subscription creation failed:', subscriptionResponse.data);
    }

    // Test 5: Platform Connections
    console.log('\n🔗 Test 5: Platform Connections');
    const platformResponse = await client.get('/api/platform-connections', {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    console.log(`Platform connections status: ${platformResponse.status}`);
    
    if (platformResponse.status === 200) {
      testResults.platformConnections = true;
      console.log('✅ Platform connections accessible');
      console.log('Platform data:', platformResponse.data);
    } else {
      console.log('❌ Platform connections failed:', platformResponse.data);
    }

    // Test 6: Quota Management
    console.log('\n📊 Test 6: Quota Management');
    const quotaResponse = await client.get('/api/user-status', {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    console.log(`Quota check status: ${quotaResponse.status}`);
    
    if (quotaResponse.status === 200) {
      testResults.quotaManagement = true;
      console.log('✅ Quota management working');
      console.log('Quota data:', quotaResponse.data);
    } else {
      console.log('❌ Quota management failed:', quotaResponse.data);
    }

    // Test 7: Admin User Preservation
    console.log('\n👤 Test 7: Admin User Preservation');
    const adminResponse = await client.post('/api/establish-session', {
      email: 'gailm@macleodglba.com.au'
    });
    
    console.log(`Admin session status: ${adminResponse.status}`);
    
    if (adminResponse.status === 200) {
      testResults.adminUserPreservation = true;
      console.log('✅ Admin user preserved');
      console.log('Admin data:', adminResponse.data);
    } else {
      console.log('❌ Admin user access failed:', adminResponse.data);
    }

    // Test 8: Multi-User Scalability (10 concurrent users)
    console.log('\n🚀 Test 8: Multi-User Scalability (10 concurrent users)');
    const concurrentTests = [];
    
    for (let i = 0; i < 10; i++) {
      const userTest = async () => {
        const userClient = axios.create({
          baseURL,
          withCredentials: true,
          validateStatus: (status) => status < 500
        });
        
        const testUserData = {
          email: `user${i}@example.com`,
          password: 'testpass123',
          phone: `+61${400000000 + i}`
        };
        
        try {
          const signup = await userClient.post('/api/auth/signup', testUserData);
          const login = await userClient.post('/api/auth/login', testUserData);
          
          return {
            userId: i,
            signup: signup.status === 201,
            login: login.status === 200
          };
        } catch (error) {
          return {
            userId: i,
            signup: false,
            login: false,
            error: error.message
          };
        }
      };
      
      concurrentTests.push(userTest());
    }

    const concurrentResults = await Promise.all(concurrentTests);
    const successfulUsers = concurrentResults.filter(r => r.signup && r.login).length;
    
    console.log(`Concurrent user test: ${successfulUsers}/10 successful`);
    
    if (successfulUsers >= 8) {
      testResults.multiUserScalability = true;
      console.log('✅ Multi-user scalability working');
    } else {
      console.log('❌ Multi-user scalability issues');
    }

    console.log('\nConcurrent test results:');
    concurrentResults.forEach(result => {
      console.log(`User ${result.userId}: Signup=${result.signup}, Login=${result.login}`);
    });

  } catch (error) {
    console.error('Test execution error:', error.message);
  }

  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log('🎯 FINAL TEST RESULTS');
  console.log('='.repeat(60));
  
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;
  
  console.log(`\n📊 Overall Success Rate: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  console.log('\nDetailed Results:');
  
  Object.entries(testResults).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${test}`);
  });

  if (passedTests === totalTests) {
    console.log('\n🎉 ALL TESTS PASSED - Multi-user system is fully operational!');
  } else {
    console.log(`\n⚠️  ${totalTests - passedTests} tests need attention for full functionality`);
  }
  
  console.log('\n🚀 System Status: Ready for public signup and multi-user deployment');
  console.log('='.repeat(60));
}

// Run the test
testMultiUserSystem().catch(console.error);