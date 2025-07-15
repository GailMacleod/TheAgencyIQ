/**
 * Comprehensive Multi-User System Test
 * Tests full workflow: signup, login, subscription, quota management, and platform features
 */

const axios = require('axios');
const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

// Enhanced axios client with cookie jar
const client = axios.create({
  baseURL,
  withCredentials: true,
  validateStatus: (status) => status < 500
});

// Simple cookie jar for session management
let cookieJar = {};

// Helper to set cookies from response
function extractCookies(response) {
  const setCookieHeader = response.headers['set-cookie'];
  if (setCookieHeader) {
    setCookieHeader.forEach(cookie => {
      const [nameValue] = cookie.split(';');
      const [name, value] = nameValue.split('=');
      if (name && value) {
        cookieJar[name] = value;
      }
    });
  }
}

// Helper to get cookie header
function getCookieHeader() {
  return Object.entries(cookieJar)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
}

async function testComprehensiveMultiUser() {
  console.log('🧪 COMPREHENSIVE MULTI-USER SYSTEM TEST');
  console.log('='.repeat(60));

  const results = {
    userSignup: false,
    userLogin: false,
    sessionPersistence: false,
    subscriptionPlans: false,
    subscriptionCreation: false,
    quotaInitialization: false,
    platformAccess: false,
    adminPreservation: false,
    multiUserConcurrency: false
  };

  let testUserId = null;
  let sessionCookie = null;

  try {
    // Test 1: User Signup
    console.log('\n📝 Test 1: User Signup');
    console.log('-'.repeat(30));

    const signupData = {
      email: 'newuser@example.com',
      password: 'securepass123',
      phone: '+61400999000'
    };

    const signupResponse = await client.post('/api/auth/signup', signupData);
    console.log(`Status: ${signupResponse.status}`);
    
    if (signupResponse.status === 200) {
      results.userSignup = true;
      testUserId = signupResponse.data.user.id;
      extractCookies(signupResponse);
      console.log('✅ User signup successful');
      console.log(`   User ID: ${testUserId}`);
      console.log(`   Email: ${signupResponse.data.user.email}`);
    } else {
      console.log('❌ User signup failed:', signupResponse.data);
    }

    // Test 2: User Login
    console.log('\n🔐 Test 2: User Login');
    console.log('-'.repeat(30));

    const loginData = {
      email: 'newuser@example.com',
      password: 'securepass123'
    };

    const loginResponse = await client.post('/api/auth/login', loginData, {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    console.log(`Status: ${loginResponse.status}`);
    
    if (loginResponse.status === 200) {
      results.userLogin = true;
      extractCookies(loginResponse);
      console.log('✅ User login successful');
      console.log(`   User ID: ${loginResponse.data.user.id}`);
    } else {
      console.log('❌ User login failed:', loginResponse.data);
    }

    // Test 3: Session Persistence
    console.log('\n🔒 Test 3: Session Persistence');
    console.log('-'.repeat(30));

    const authStatusResponse = await client.get('/api/auth/status', {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    console.log(`Status: ${authStatusResponse.status}`);
    console.log('Cookie header:', getCookieHeader());
    
    if (authStatusResponse.status === 200 && authStatusResponse.data.authenticated) {
      results.sessionPersistence = true;
      console.log('✅ Session persistence working');
      console.log(`   User ID: ${authStatusResponse.data.userId}`);
    } else {
      console.log('❌ Session persistence failed:', authStatusResponse.data);
    }

    // Test 4: Subscription Plans
    console.log('\n💰 Test 4: Subscription Plans');
    console.log('-'.repeat(30));

    const plansResponse = await client.get('/api/stripe/plans');
    console.log(`Status: ${plansResponse.status}`);
    
    if (plansResponse.status === 200) {
      results.subscriptionPlans = true;
      console.log('✅ Subscription plans available');
      console.log(`   Plans: ${plansResponse.data.plans.map(p => p.name).join(', ')}`);
    } else {
      console.log('❌ Subscription plans failed:', plansResponse.data);
    }

    // Test 5: Subscription Creation
    console.log('\n💳 Test 5: Subscription Creation');
    console.log('-'.repeat(30));

    const subscriptionData = {
      planId: 'professional'
    };

    const subscriptionResponse = await client.post('/api/stripe/create-subscription', subscriptionData, {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    console.log(`Status: ${subscriptionResponse.status}`);
    
    if (subscriptionResponse.status === 200) {
      results.subscriptionCreation = true;
      console.log('✅ Subscription creation successful');
      console.log(`   Subscription ID: ${subscriptionResponse.data.subscription.id}`);
    } else {
      console.log('❌ Subscription creation failed:', subscriptionResponse.data);
    }

    // Test 6: Quota Initialization
    console.log('\n📊 Test 6: Quota Initialization');
    console.log('-'.repeat(30));

    const quotaResponse = await client.get('/api/user-status', {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    console.log(`Status: ${quotaResponse.status}`);
    
    if (quotaResponse.status === 200) {
      results.quotaInitialization = true;
      console.log('✅ Quota system working');
      console.log(`   Remaining posts: ${quotaResponse.data.remainingPosts}`);
      console.log(`   Total posts: ${quotaResponse.data.totalPosts}`);
    } else {
      console.log('❌ Quota system failed:', quotaResponse.data);
    }

    // Test 7: Platform Access
    console.log('\n🔗 Test 7: Platform Access');
    console.log('-'.repeat(30));

    const platformsResponse = await client.get('/api/platform-connections', {
      headers: {
        'Cookie': getCookieHeader()
      }
    });
    
    console.log(`Status: ${platformsResponse.status}`);
    
    if (platformsResponse.status === 200) {
      results.platformAccess = true;
      console.log('✅ Platform access working');
      console.log(`   Available platforms: ${platformsResponse.data.length}`);
    } else {
      console.log('❌ Platform access failed:', platformsResponse.data);
    }

    // Test 8: Admin User Preservation
    console.log('\n👤 Test 8: Admin User Preservation');
    console.log('-'.repeat(30));

    const adminResponse = await client.post('/api/establish-session', {
      email: 'gailm@macleodglba.com.au'
    });
    
    console.log(`Status: ${adminResponse.status}`);
    
    if (adminResponse.status === 200) {
      results.adminPreservation = true;
      console.log('✅ Admin user preserved');
      console.log(`   Admin ID: ${adminResponse.data.user.id}`);
      console.log(`   Admin plan: ${adminResponse.data.user.subscriptionPlan}`);
    } else {
      console.log('❌ Admin user access failed:', adminResponse.data);
    }

    // Test 9: Multi-User Concurrency (5 users)
    console.log('\n🚀 Test 9: Multi-User Concurrency (5 users)');
    console.log('-'.repeat(30));

    const concurrentTests = [];
    
    for (let i = 0; i < 5; i++) {
      const userTest = async () => {
        const userClient = axios.create({
          baseURL,
          withCredentials: true,
          validateStatus: (status) => status < 500
        });
        
        const testUserData = {
          email: `concurrent${i}@example.com`,
          password: 'testpass123',
          phone: `+61${500000000 + i}`
        };
        
        try {
          const signup = await userClient.post('/api/auth/signup', testUserData);
          const login = await userClient.post('/api/auth/login', testUserData);
          
          return {
            userId: i,
            signup: signup.status === 200,
            login: login.status === 200,
            signupData: signup.data,
            loginData: login.data
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
    
    console.log(`Concurrent users: ${successfulUsers}/5 successful`);
    
    if (successfulUsers >= 4) {
      results.multiUserConcurrency = true;
      console.log('✅ Multi-user concurrency working');
    } else {
      console.log('❌ Multi-user concurrency issues');
    }

    concurrentResults.forEach(result => {
      console.log(`   User ${result.userId}: Signup=${result.signup}, Login=${result.login}`);
    });

  } catch (error) {
    console.error('Test execution error:', error.message);
  }

  // Final Results
  console.log('\n' + '='.repeat(60));
  console.log('🎯 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(60));
  
  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n📊 Overall Success Rate: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
  console.log('\nDetailed Results:');
  
  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${test}`);
  });

  console.log('\n🎯 DEPLOYMENT READINESS:');
  if (passedTests >= 7) {
    console.log('🚀 PRODUCTION READY - Multi-user system operational');
  } else if (passedTests >= 5) {
    console.log('⚠️  PARTIAL READY - Core features working, minor fixes needed');
  } else {
    console.log('❌ NOT READY - Major issues need resolution');
  }
  
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Complete OAuth platform configurations');
  console.log('2. Implement 30-day quota reset system');
  console.log('3. Add comprehensive error handling');
  console.log('4. Deploy to production environment');
  
  console.log('\n' + '='.repeat(60));
}

// Run the comprehensive test
testComprehensiveMultiUser().catch(console.error);