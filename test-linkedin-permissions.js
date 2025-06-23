/**
 * Comprehensive LinkedIn Token Permission Test
 * Tests all available permissions and capabilities
 */

async function testLinkedInPermissions() {
  console.log('🔍 Testing LinkedIn access token permissions...\n');
  
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN || process.env.LINKEDIN_TOKEN;
  
  if (!accessToken) {
    console.log('❌ No LinkedIn access token found');
    return;
  }
  
  console.log(`Token length: ${accessToken.length}`);
  console.log(`Token prefix: ${accessToken.substring(0, 20)}...\n`);
  
  const tests = [
    { name: 'Basic Profile (r_liteprofile)', endpoint: 'https://api.linkedin.com/v2/me', method: 'GET' },
    { name: 'Full Profile (r_basicprofile)', endpoint: 'https://api.linkedin.com/v2/people/~:(id,localizedFirstName,localizedLastName,localizedHeadline)', method: 'GET' },
    { name: 'Email Address (r_emailaddress)', endpoint: 'https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', method: 'GET' },
    { name: 'Member Social (w_member_social)', endpoint: 'https://api.linkedin.com/v2/ugcPosts', method: 'POST', testPost: true },
    { name: 'Company Admin (rw_company_admin)', endpoint: 'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee', method: 'GET' },
    { name: 'Organization Social (w_organization_social)', endpoint: 'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee', method: 'GET' },
    { name: 'Advertising API (rw_ads)', endpoint: 'https://api.linkedin.com/v2/adAccountsV2', method: 'GET' },
    { name: 'Marketing Developer (r_marketing_leadgen_forms)', endpoint: 'https://api.linkedin.com/v2/leadGenForms', method: 'GET' }
  ];
  
  const results = {};
  
  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    
    try {
      let response;
      
      if (test.testPost) {
        // Test posting capability
        const postData = {
          author: 'urn:li:person:me',
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: 'PERMISSION TEST: LinkedIn API validation - DELETE IMMEDIATELY' },
              shareMediaCategory: 'NONE'
            }
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'CONNECTIONS'
          }
        };
        
        response = await fetch(test.endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          },
          body: JSON.stringify(postData)
        });
      } else {
        response = await fetch(test.endpoint, {
          method: test.method,
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        });
      }
      
      const data = await response.json();
      
      if (response.ok) {
        results[test.name] = { status: '✅ GRANTED', code: response.status, data: data.id || 'Success' };
        console.log(`  ✅ ${test.name}: GRANTED (${response.status})`);
        
        if (test.testPost && data.id) {
          console.log(`  📝 Posted successfully: ${data.id}`);
        }
      } else {
        results[test.name] = { status: '❌ DENIED', code: response.status, error: data.message || data.error_description };
        console.log(`  ❌ ${test.name}: DENIED (${response.status}) - ${data.message || data.error_description}`);
      }
    } catch (error) {
      results[test.name] = { status: '🔥 ERROR', error: error.message };
      console.log(`  🔥 ${test.name}: ERROR - ${error.message}`);
    }
    
    console.log('');
  }
  
  // Summary
  console.log('📊 PERMISSION SUMMARY:');
  const granted = Object.values(results).filter(r => r.status.includes('✅')).length;
  const denied = Object.values(results).filter(r => r.status.includes('❌')).length;
  const errors = Object.values(results).filter(r => r.status.includes('🔥')).length;
  
  console.log(`  Granted: ${granted}/${tests.length}`);
  console.log(`  Denied: ${denied}/${tests.length}`);
  console.log(`  Errors: ${errors}/${tests.length}`);
  
  if (granted >= 2) {
    console.log('\n🎉 TOKEN IS USABLE FOR POSTING');
  } else {
    console.log('\n⚠️  TOKEN NEEDS MORE PERMISSIONS');
  }
  
  return results;
}

testLinkedInPermissions()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });