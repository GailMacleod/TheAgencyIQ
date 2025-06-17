/**
 * Test Auto-Posting Enforcer
 * Verifies the system can successfully publish posts within 30-day subscription
 */

async function testAutoPostingEnforcer() {
  console.log('Testing Auto-Posting Enforcer System...');
  
  try {
    // Test the auto-posting enforcer endpoint
    const response = await fetch('http://localhost:5000/api/enforce-auto-posting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({})
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('Auto-posting enforcer response status:', response.status);
      console.log('Response body:', errorText);
      return false;
    }
    
    const result = await response.json();
    
    console.log('Auto-posting enforcer results:');
    console.log('- Success:', result.success);
    console.log('- Posts processed:', result.postsProcessed);
    console.log('- Posts published:', result.postsPublished);
    console.log('- Posts failed:', result.postsFailed);
    console.log('- Connection repairs:', result.connectionRepairs?.length || 0);
    console.log('- Errors:', result.errors?.length || 0);
    
    if (result.errors && result.errors.length > 0) {
      console.log('Error details:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (result.connectionRepairs && result.connectionRepairs.length > 0) {
      console.log('Connection repairs performed:');
      result.connectionRepairs.forEach((repair, index) => {
        console.log(`  ${index + 1}. ${repair}`);
      });
    }
    
    return result.success;
    
  } catch (error) {
    console.error('Auto-posting enforcer test failed:', error.message);
    return false;
  }
}

// Run test
testAutoPostingEnforcer().then(success => {
  console.log('\nTest Result:', success ? 'PASSED' : 'FAILED');
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});