/**
 * Test Updated LinkedIn Token
 * Validates the new LinkedIn access token and posting capabilities
 */

async function testLinkedInTokenUpdated() {
  console.log('Testing updated LinkedIn access token...\n');
  
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('❌ No LinkedIn access token found');
    return;
  }
  
  console.log(`Token length: ${accessToken.length}`);
  console.log(`Token prefix: ${accessToken.substring(0, 20)}...`);
  
  // Test 1: Basic profile access
  console.log('\nTest 1: Profile access');
  try {
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Status: ${profileResponse.status}`);
    const profileData = await profileResponse.json();
    
    if (profileData.error) {
      console.log(`❌ Profile access failed: ${profileData.message}`);
    } else {
      console.log(`✅ Profile access success: ${profileData.localizedFirstName} ${profileData.localizedLastName}`);
      console.log(`User ID: ${profileData.id}`);
    }
  } catch (error) {
    console.log(`❌ Profile access error: ${error.message}`);
  }
  
  // Test 2: UGC Posts endpoint (actual posting)
  console.log('\nTest 2: UGC Posts capability');
  try {
    const testPost = {
      author: 'urn:li:person:me',
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text: 'TEST: TheAgencyIQ LinkedIn integration test - please ignore and delete' },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };
    
    const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(testPost)
    });
    
    console.log(`Post Status: ${postResponse.status}`);
    const postData = await postResponse.json();
    
    if (postData.error) {
      console.log(`❌ Post failed: ${postData.message}`);
    } else {
      console.log(`✅ Post success: ${postData.id}`);
      return { success: true, postId: postData.id };
    }
  } catch (error) {
    console.log(`❌ Post error: ${error.message}`);
  }
  
  // Test 3: Check token permissions
  console.log('\nTest 3: Token introspection');
  try {
    const introspectResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,localizedFirstName,localizedLastName)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Introspect Status: ${introspectResponse.status}`);
    const introspectData = await introspectResponse.json();
    
    if (introspectData.error) {
      console.log(`❌ Introspection failed: ${introspectData.message}`);
    } else {
      console.log(`✅ Token is valid and active`);
    }
  } catch (error) {
    console.log(`❌ Introspection error: ${error.message}`);
  }
  
  return { success: false };
}

testLinkedInTokenUpdated()
  .then(result => {
    console.log('\n📊 RESULT:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });