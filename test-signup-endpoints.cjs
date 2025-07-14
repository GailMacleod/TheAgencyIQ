/**
 * Test All Signup Endpoints for Blocking
 * Verifies that all signup/registration endpoints are completely blocked
 */

const axios = require('axios');
const BASE_URL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testSignupEndpoints() {
  console.log('🔒 TESTING ALL SIGNUP ENDPOINTS FOR BLOCKING');
  console.log('==============================================');
  
  const endpointsToTest = [
    '/api/signup',
    '/api/register',
    '/api/auth/signup',
    '/api/verify-and-signup',
    '/api/send-verification-code',
    '/api/redeem-gift-certificate',
    '/api/create-account',
    '/api/complete-phone-verification'
  ];
  
  let blockedCount = 0;
  let totalEndpoints = endpointsToTest.length;
  
  for (const endpoint of endpointsToTest) {
    console.log(`\n🧪 Testing: ${endpoint}`);
    
    try {
      const response = await axios.post(`${BASE_URL}${endpoint}`, {
        email: 'test@guest.com',
        password: 'password123',
        phone: '+1234567890'
      }, {
        validateStatus: () => true // Don't throw on 4xx/5xx
      });
      
      if (response.status === 403) {
        console.log(`✅ ${endpoint} - BLOCKED (403)`);
        blockedCount++;
      } else if (response.status === 404) {
        console.log(`✅ ${endpoint} - NOT FOUND (404)`);
        blockedCount++;
      } else {
        console.log(`❌ ${endpoint} - NOT BLOCKED (${response.status})`);
        console.log(`Response: ${JSON.stringify(response.data, null, 2)}`);
      }
    } catch (error) {
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.log(`❌ ${endpoint} - CONNECTION ERROR`);
      } else {
        console.log(`❌ ${endpoint} - ERROR: ${error.message}`);
      }
    }
  }
  
  console.log('\n============================================================');
  console.log('🔒 SIGNUP ENDPOINT BLOCKING TEST RESULTS');
  console.log('============================================================');
  
  const blockingRate = Math.round((blockedCount / totalEndpoints) * 100);
  console.log(`🎯 Blocking Rate: ${blockingRate}% (${blockedCount}/${totalEndpoints})`);
  console.log(`✅ Blocked: ${blockedCount}`);
  console.log(`❌ Not Blocked: ${totalEndpoints - blockedCount}`);
  
  if (blockingRate === 100) {
    console.log('\n🔐 SYSTEM STATUS: FULLY SECURED');
    console.log('All signup endpoints are properly blocked');
  } else {
    console.log('\n🚨 SYSTEM STATUS: SECURITY GAPS DETECTED');
    console.log('Some signup endpoints may still be accessible');
  }
}

if (require.main === module) {
  testSignupEndpoints().catch(console.error);
}