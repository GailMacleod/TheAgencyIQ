/**
 * FINAL LAUNCH READINESS TEST - 9:00 AM JST PREPARATION
 * Comprehensive test of all social media platforms
 */

async function testXPlatform() {
  console.log('🐦 Testing X Platform...');
  
  try {
    const response = await fetch('http://localhost:5000/api/test-x-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ X: OPERATIONAL');
      console.log(`   Tweet posted: ${result.postId}`);
      return { platform: 'X', status: 'OPERATIONAL', details: `Tweet ID: ${result.postId}` };
    } else {
      console.log('❌ X: FAILED');
      console.log(`   Error: ${result.error}`);
      return { platform: 'X', status: 'FAILED', error: result.error };
    }
  } catch (error) {
    console.log('❌ X: CONNECTION ERROR');
    console.log(`   Error: ${error.message}`);
    return { platform: 'X', status: 'FAILED', error: error.message };
  }
}

async function testFacebookPlatform() {
  console.log('📘 Testing Facebook Platform...');
  
  try {
    const response = await fetch('http://localhost:5000/api/test-facebook-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Facebook: OPERATIONAL');
      console.log(`   Post ID: ${result.postId}`);
      return { platform: 'Facebook', status: 'OPERATIONAL', details: `Post ID: ${result.postId}` };
    } else {
      console.log('❌ Facebook: FAILED');
      console.log(`   Error: ${result.error}`);
      return { platform: 'Facebook', status: 'FAILED', error: result.error };
    }
  } catch (error) {
    console.log('❌ Facebook: CONNECTION ERROR');
    console.log(`   Error: ${error.message}`);
    return { platform: 'Facebook', status: 'FAILED', error: error.message };
  }
}

async function testLinkedInPlatform() {
  console.log('💼 Testing LinkedIn Platform...');
  
  try {
    const response = await fetch('http://localhost:5000/api/test-linkedin-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ LinkedIn: OPERATIONAL');
      console.log(`   Post ID: ${result.postId}`);
      return { platform: 'LinkedIn', status: 'OPERATIONAL', details: `Post ID: ${result.postId}` };
    } else {
      console.log('❌ LinkedIn: FAILED');
      console.log(`   Error: ${result.error}`);
      return { platform: 'LinkedIn', status: 'FAILED', error: result.error };
    }
  } catch (error) {
    console.log('❌ LinkedIn: CONNECTION ERROR');
    console.log(`   Error: ${error.message}`);
    return { platform: 'LinkedIn', status: 'FAILED', error: error.message };
  }
}

async function testInstagramPlatform() {
  console.log('📷 Testing Instagram Platform...');
  
  try {
    const response = await fetch('http://localhost:5000/api/test-instagram-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      }
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Instagram: OPERATIONAL');
      console.log(`   Post ID: ${result.postId}`);
      return { platform: 'Instagram', status: 'OPERATIONAL', details: `Post ID: ${result.postId}` };
    } else {
      console.log('❌ Instagram: FAILED');
      console.log(`   Error: ${result.error}`);
      return { platform: 'Instagram', status: 'FAILED', error: result.error };
    }
  } catch (error) {
    console.log('❌ Instagram: CONNECTION ERROR');
    console.log(`   Error: ${error.message}`);
    return { platform: 'Instagram', status: 'FAILED', error: error.message };
  }
}

async function generateLaunchReport() {
  console.log('🚀 FINAL LAUNCH READINESS TEST');
  console.log('==============================');
  console.log('Target: 9:00 AM JST Launch');
  console.log('Time:', new Date().toISOString());
  console.log('');

  const results = [];
  
  // Test all platforms
  results.push(await testXPlatform());
  results.push(await testFacebookPlatform());
  results.push(await testLinkedInPlatform());
  results.push(await testInstagramPlatform());

  // Generate summary
  const operational = results.filter(r => r.status === 'OPERATIONAL');
  const failed = results.filter(r => r.status === 'FAILED');
  const coverage = Math.round((operational.length / results.length) * 100);

  console.log('');
  console.log('📊 LAUNCH READINESS REPORT');
  console.log('==========================');
  console.log(`Platform Coverage: ${operational.length}/${results.length} operational (${coverage}%)`);
  
  if (operational.length > 0) {
    console.log('');
    console.log('✅ OPERATIONAL PLATFORMS:');
    operational.forEach(r => {
      console.log(`   ${r.platform}: ${r.details}`);
    });
  }

  if (failed.length > 0) {
    console.log('');
    console.log('❌ FAILED PLATFORMS:');
    failed.forEach(r => {
      console.log(`   ${r.platform}: ${r.error}`);
    });
  }

  console.log('');
  console.log('🎯 LAUNCH RECOMMENDATION:');
  if (coverage >= 75) {
    console.log('✅ PROCEED WITH LAUNCH');
    console.log('   Sufficient platform coverage for successful launch');
  } else if (coverage >= 50) {
    console.log('⚠️  PROCEED WITH CAUTION');
    console.log('   Limited platform coverage - consider fixing failed platforms');
  } else {
    console.log('❌ POSTPONE LAUNCH');
    console.log('   Insufficient platform coverage - fix failed platforms first');
  }

  console.log('');
  console.log('⏰ LAUNCH STATUS FOR 9:00 AM JST:');
  console.log(`Current readiness: ${coverage}%`);
  
  return { coverage, operational: operational.length, failed: failed.length, results };
}

generateLaunchReport();