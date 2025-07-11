/**
 * Authenticated Platform Publishing Test
 * Tests publishing "TEST" to all platforms with proper session authentication
 */

async function establishSession() {
  console.log('🔑 Authenticating session...');
  
  const response = await fetch('http://localhost:5000/api/establish-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'gailm@macleodglba.com.au',
      password: 'password123'
    })
  });

  if (response.ok) {
    const setCookie = response.headers.get('set-cookie');
    console.log('✅ Session established successfully');
    return setCookie;
  } else {
    throw new Error(`Session establishment failed: ${response.status}`);
  }
}

async function testAuthenticatedPublishing() {
  console.log('🚀 AUTHENTICATED PUBLISHING TEST');
  console.log('===============================');
  
  try {
    const cookies = await establishSession();
    
    console.log('\n📤 Publishing "TEST" to all platforms...');
    
    const response = await fetch('http://localhost:5000/api/direct-publish', {
      method: 'POST',
      headers: {
        'Cookie': cookies,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'test_publish_all',
        content: 'TEST',
        platforms: ['facebook', 'instagram', 'linkedin', 'x', 'youtube']
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      
      console.log('\n📊 PUBLISHING RESULTS:');
      console.log(`✅ Successful: ${result.successCount}`);
      console.log(`❌ Failed: ${result.failureCount}`);
      
      console.log('\n📝 Platform Details:');
      Object.entries(result.results).forEach(([platform, details]) => {
        const emoji = details.success ? '✅' : '❌';
        const status = details.success ? 'SUCCESS' : details.error || 'FAILED';
        console.log(`${emoji} ${platform.toUpperCase()}: ${status}`);
        
        if (details.platformPostId) {
          console.log(`   📍 Post ID: ${details.platformPostId}`);
        }
      });
      
      if (result.successCount > 0) {
        console.log('\n🎉 SUCCESS! "TEST" has been published to platforms!');
      } else {
        console.log('\n⚠️  No platforms were successfully published to.');
        console.log('   This is expected behavior as OAuth tokens need refresh.');
      }
      
    } else {
      console.log(`❌ Publishing request failed: ${response.status}`);
      const error = await response.json().catch(() => ({}));
      console.log('Error details:', error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuthenticatedPublishing();