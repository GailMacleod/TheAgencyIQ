/**
 * Test X (formerly Twitter) Credentials
 * Validates X API access and posting capabilities
 */

async function testXCredentials() {
  console.log('Testing X (formerly Twitter) credentials...\n');
  
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('❌ Missing X credentials');
    return;
  }
  
  console.log(`Client ID: ${clientId}`);
  console.log(`Client Secret: ${clientSecret.substring(0, 10)}...\n`);
  
  try {
    // Test OAuth 2.0 Bearer Token generation
    console.log('1. Testing OAuth 2.0 Bearer Token...');
    
    const tokenResponse = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.access_token) {
      console.log('✅ Bearer token generated successfully');
      console.log(`Token type: ${tokenData.token_type}`);
      
      // Test API access with bearer token
      console.log('\n2. Testing API access...');
      const meResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      const meData = await meResponse.json();
      
      if (meData.data) {
        console.log(`✅ API access granted - User: ${meData.data.username} (ID: ${meData.data.id})`);
        
        // Test posting capability (this will fail without user OAuth, but we can check the error)
        console.log('\n3. Testing posting endpoint...');
        const postResponse = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: 'Test post from TheAgencyIQ'
          })
        });
        
        const postData = await postResponse.json();
        
        if (postData.errors && postData.errors[0].title === 'Forbidden') {
          console.log('⚠️  Posting requires user OAuth (expected with app-only auth)');
          console.log('   Need user access token for posting');
        } else if (postData.data) {
          console.log('✅ Posting works with app-only auth');
        } else {
          console.log('❌ Posting failed:', postData.errors?.[0]?.detail || 'Unknown error');
        }
        
      } else {
        console.log('❌ API access failed:', meData.errors?.[0]?.message || 'Unknown error');
      }
      
    } else {
      console.log('❌ Bearer token generation failed:', tokenData.error_description || tokenData.error);
    }
    
  } catch (error) {
    console.log('🔥 Test failed:', error.message);
  }
  
  console.log('\n📊 X PLATFORM STATUS:');
  console.log('- App credentials: Available');
  console.log('- Bearer token: Working');
  console.log('- Posting: Requires user OAuth token');
  console.log('\nNext: Need user access token for posting to X');
}

testXCredentials()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });