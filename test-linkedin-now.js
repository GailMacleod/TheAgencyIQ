/**
 * Test LinkedIn with Available Token
 */

async function testLinkedInNow() {
  console.log('Testing LinkedIn with Available Tokens');
  console.log('=====================================');
  
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN || process.env.LINKEDIN_USER_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.log('No LinkedIn access token found');
    return;
  }
  
  console.log('Access token found, testing...');
  
  try {
    // Test profile access
    const profileResponse = await fetch('https://api.linkedin.com/v2/people/~:(id,firstName,lastName)', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    
    if (profileResponse.ok) {
      const profile = await profileResponse.json();
      console.log(`✅ Profile access successful: ${profile.firstName?.localized?.en_US} ${profile.lastName?.localized?.en_US}`);
      
      // Test posting capability
      console.log('Testing posting capability...');
      const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0'
        },
        body: JSON.stringify({
          author: `urn:li:person:${profile.id}`,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: {
                text: 'LinkedIn integration test successful - TheAgencyIQ ready for posting'
              },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
          }
        })
      });
      
      if (postResponse.ok) {
        const postResult = await postResponse.json();
        console.log(`✅ Test post created successfully: ${postResult.id}`);
        console.log('LinkedIn posting capability confirmed');
      } else {
        const postError = await postResponse.text();
        console.log('❌ Posting failed:', postError);
      }
      
    } else {
      const profileError = await profileResponse.text();
      console.log('❌ Profile access failed:', profileError);
    }
    
  } catch (error) {
    console.log('❌ LinkedIn test error:', error.message);
  }
}

testLinkedInNow();