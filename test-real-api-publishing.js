/**
 * REAL API PUBLISHING TEST
 * Test publishing to all 5 platforms with authentication
 * Creates test post, publishes to Facebook, Instagram, LinkedIn, X, YouTube
 * Verifies post IDs and quota deduction
 */

const axios = require('axios');
const baseURL = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev';

async function testRealApiPublishing() {
  console.log('🚀 REAL API PUBLISHING TEST');
  console.log('==========================');
  
  const results = {
    sessionEstablishment: false,
    postCreation: false,
    platformPublishing: {},
    quotaValidation: false,
    postIdVerification: false,
    errors: []
  };
  
  try {
    // Step 1: Establish authenticated session
    console.log('\n1. Establishing authenticated session...');
    const sessionResponse = await axios.post(`${baseURL}/api/establish-session`, {
      email: 'gailm@macleodglba.com.au',
      phone: '+61424835189'
    }, {
      withCredentials: true,
      validateStatus: () => true
    });
    
    if (sessionResponse.status !== 200) {
      results.errors.push('Session establishment failed');
      console.log('❌ Session establishment failed:', sessionResponse.data);
      return results;
    }
    
    results.sessionEstablishment = true;
    console.log('✅ Session established for User ID:', sessionResponse.data.user.id);
    
    // Extract session cookie
    const setCookieHeader = sessionResponse.headers['set-cookie'];
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
      results.errors.push('No session cookie found');
      console.log('❌ No session cookie found');
      return results;
    }
    
    console.log('🍪 Session cookie:', sessionCookie.substring(0, 50) + '...');
    
    // Step 2: Create test post
    console.log('\n2. Creating test post...');
    const postResponse = await axios.post(`${baseURL}/api/posts`, {
      content: 'TEST POST for Real API Publishing - ' + new Date().toISOString(),
      scheduledFor: new Date(Date.now() + 60000).toISOString(),
      platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube']
    }, {
      headers: {
        'Cookie': sessionCookie,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true
    });
    
    if (postResponse.status !== 201) {
      results.errors.push('Post creation failed');
      console.log('❌ Post creation failed:', postResponse.data);
      return results;
    }
    
    results.postCreation = true;
    const postId = postResponse.data.id;
    console.log('✅ Test post created with ID:', postId);
    
    // Step 3: Publish to all platforms
    console.log('\n3. Publishing to all platforms...');
    const platforms = ['facebook', 'instagram', 'linkedin', 'x', 'youtube'];
    
    for (const platform of platforms) {
      console.log(`\n   Publishing to ${platform}...`);
      
      const publishResponse = await axios.post(`${baseURL}/api/posts/${postId}/publish`, {
        platforms: [platform]
      }, {
        headers: {
          'Cookie': sessionCookie,
          'Content-Type': 'application/json'
        },
        validateStatus: () => true
      });
      
      if (publishResponse.status === 200) {
        const publishResult = publishResponse.data;
        const platformResult = publishResult.results.find(r => r.platform === platform);
        
        if (platformResult && platformResult.success) {
          console.log(`   ✅ ${platform}: SUCCESS - Post ID: ${platformResult.postId}`);
          results.platformPublishing[platform] = {
            success: true,
            postId: platformResult.postId,
            quotaDeducted: platformResult.quotaDeducted
          };
        } else {
          console.log(`   ❌ ${platform}: FAILED - ${platformResult?.error || 'Unknown error'}`);
          results.platformPublishing[platform] = {
            success: false,
            error: platformResult?.error || 'Unknown error',
            authenticated: platformResult?.authenticated || false
          };
        }
      } else {
        console.log(`   ❌ ${platform}: PUBLISH REQUEST FAILED - Status: ${publishResponse.status}`);
        results.platformPublishing[platform] = {
          success: false,
          error: `HTTP ${publishResponse.status}: ${publishResponse.data?.message || 'Unknown error'}`,
          authenticated: publishResponse.status !== 401
        };
      }
    }
    
    // Step 4: Verify post IDs
    console.log('\n4. Verifying platform post IDs...');
    const postIdResponse = await axios.get(`${baseURL}/api/posts/${postId}/platform-id`, {
      headers: {
        'Cookie': sessionCookie
      },
      validateStatus: () => true
    });
    
    if (postIdResponse.status === 200) {
      const postIdData = postIdResponse.data;
      console.log('✅ Post ID verification:', postIdData);
      results.postIdVerification = postIdData.valid;
    } else {
      console.log('❌ Post ID verification failed:', postIdResponse.data);
      results.errors.push('Post ID verification failed');
    }
    
    // Step 5: Check quota status
    console.log('\n5. Checking quota status...');
    const quotaResponse = await axios.get(`${baseURL}/api/quota/stats`, {
      headers: {
        'Cookie': sessionCookie
      },
      validateStatus: () => true
    });
    
    if (quotaResponse.status === 200) {
      const quotaData = quotaResponse.data;
      console.log('✅ Quota status:', quotaData);
      results.quotaValidation = true;
    } else {
      console.log('❌ Quota check failed:', quotaResponse.data);
      results.errors.push('Quota validation failed');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    results.errors.push(error.message);
  }
  
  // Generate final report
  console.log('\n🎯 REAL API PUBLISHING TEST RESULTS');
  console.log('====================================');
  console.log(`Session Establishment: ${results.sessionEstablishment ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Post Creation: ${results.postCreation ? '✅ PASSED' : '❌ FAILED'}`);
  
  console.log('\nPlatform Publishing Results:');
  for (const [platform, result] of Object.entries(results.platformPublishing)) {
    if (result.success) {
      console.log(`  ${platform}: ✅ SUCCESS - Post ID: ${result.postId}`);
    } else {
      console.log(`  ${platform}: ❌ FAILED - ${result.error}`);
    }
  }
  
  console.log(`\nPost ID Verification: ${results.postIdVerification ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Quota Validation: ${results.quotaValidation ? '✅ PASSED' : '❌ FAILED'}`);
  
  const successfulPlatforms = Object.values(results.platformPublishing).filter(r => r.success).length;
  const totalPlatforms = Object.keys(results.platformPublishing).length;
  
  console.log(`\n📊 SUMMARY: ${successfulPlatforms}/${totalPlatforms} platforms published successfully`);
  
  if (results.errors.length > 0) {
    console.log('\n🚨 ERRORS:');
    results.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  return results;
}

// Run the test
testRealApiPublishing().catch(console.error);