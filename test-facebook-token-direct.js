/**
 * Direct Facebook Token Test
 * Tests Facebook token without app secret proof to identify token issues
 */

async function testFacebookTokenDirect() {
  console.log('🔧 Testing Facebook token directly...\n');
  
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN;
  const userToken = process.env.FACEBOOK_USER_ACCESS_TOKEN;
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  
  console.log(`Available tokens:`);
  console.log(`- FACEBOOK_ACCESS_TOKEN: ${accessToken ? 'Present' : 'Missing'}`);
  console.log(`- FACEBOOK_USER_ACCESS_TOKEN: ${userToken ? 'Present' : 'Missing'}`);
  console.log(`- FACEBOOK_PAGE_ACCESS_TOKEN: ${pageToken ? 'Present' : 'Missing'}\n`);
  
  // Test each token
  const tokens = [
    { name: 'FACEBOOK_ACCESS_TOKEN', token: accessToken },
    { name: 'FACEBOOK_USER_ACCESS_TOKEN', token: userToken },
    { name: 'FACEBOOK_PAGE_ACCESS_TOKEN', token: pageToken }
  ];
  
  for (const { name, token } of tokens) {
    if (!token) continue;
    
    console.log(`Testing ${name}:`);
    
    try {
      // Test basic token validity
      const meResponse = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${token}`);
      const meData = await meResponse.json();
      
      if (meData.error) {
        console.log(`❌ Token invalid: ${meData.error.message}`);
        continue;
      }
      
      console.log(`✅ Token valid - User: ${meData.name} (ID: ${meData.id})`);
      
      // Test pages access
      const pagesResponse = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${token}`);
      const pagesData = await pagesResponse.json();
      
      if (pagesData.error) {
        console.log(`⚠️ Pages access failed: ${pagesData.error.message}`);
      } else if (pagesData.data && pagesData.data.length > 0) {
        console.log(`✅ Pages found: ${pagesData.data.length}`);
        pagesData.data.forEach((page, i) => {
          console.log(`  ${i+1}. ${page.name} (ID: ${page.id})`);
        });
        
        // Test posting to first page
        const firstPage = pagesData.data[0];
        console.log(`\nTesting post to page: ${firstPage.name}`);
        
        const testResponse = await fetch(`https://graph.facebook.com/v20.0/${firstPage.id}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            message: 'Test post from TheAgencyIQ - please ignore and delete',
            access_token: firstPage.access_token
          }).toString()
        });
        
        const testResult = await testResponse.json();
        
        if (testResult.error) {
          console.log(`❌ Post failed: ${testResult.error.message}`);
        } else {
          console.log(`✅ Post succeeded: ${testResult.id}`);
          return { success: true, token: name, pageId: firstPage.id, postId: testResult.id };
        }
      } else {
        console.log(`⚠️ No pages found`);
      }
      
      // Test user timeline posting
      console.log(`\nTesting user timeline post:`);
      const timelineResponse = await fetch(`https://graph.facebook.com/v20.0/me/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          message: 'Test timeline post from TheAgencyIQ - please ignore and delete',
          access_token: token
        }).toString()
      });
      
      const timelineResult = await timelineResponse.json();
      
      if (timelineResult.error) {
        console.log(`❌ Timeline post failed: ${timelineResult.error.message}`);
      } else {
        console.log(`✅ Timeline post succeeded: ${timelineResult.id}`);
        return { success: true, token: name, type: 'timeline', postId: timelineResult.id };
      }
      
    } catch (error) {
      console.log(`❌ Error testing ${name}: ${error.message}`);
    }
    
    console.log('');
  }
  
  return { success: false, message: 'No working tokens found' };
}

// Run the test
testFacebookTokenDirect()
  .then(result => {
    console.log('\n📊 RESULT:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });