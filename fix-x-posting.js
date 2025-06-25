/**
 * Quick Fix X Posting - Test with Environment Token
 */

async function fixXPosting() {
  console.log('🔄 TESTING X POSTING WITH AVAILABLE TOKENS');
  console.log('==========================================');

  // Test different token sources
  const tokens = [
    { name: 'X_OAUTH2_ACCESS_TOKEN', value: process.env.X_OAUTH2_ACCESS_TOKEN },
    { name: 'X_ACCESS_TOKEN', value: process.env.X_ACCESS_TOKEN },
    { name: 'X_USER_ACCESS_TOKEN', value: process.env.X_USER_ACCESS_TOKEN }
  ];

  for (const token of tokens) {
    if (!token.value) {
      console.log(`❌ ${token.name}: Not available`);
      continue;
    }

    console.log(`\n🔄 Testing ${token.name}...`);
    console.log(`Token preview: ${token.value.substring(0, 20)}...`);

    try {
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token.value}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: `X Platform Test - ${new Date().toLocaleTimeString()} - TheAgencyIQ operational check!`
        })
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ SUCCESS with ${token.name}`);
        console.log(`Tweet ID: ${result.data.id}`);
        console.log(`Tweet URL: https://twitter.com/i/web/status/${result.data.id}`);
        console.log('✅ X PLATFORM RESTORED AND WORKING');
        
        // Update database with working token
        await updateDatabaseToken(token.value);
        return true;
      } else {
        console.log(`❌ Failed with ${token.name}:`);
        console.log(`Error: ${result.title || result.detail}`);
      }
    } catch (error) {
      console.log(`💥 Network error with ${token.name}: ${error.message}`);
    }
  }

  console.log('\n❌ No working tokens found. Need fresh OAuth 2.0 User Context token.');
  return false;
}

async function updateDatabaseToken(workingToken) {
  try {
    const { execSync } = await import('child_process');
    
    const updateQuery = `UPDATE platform_connections SET access_token = '${workingToken}' WHERE platform = 'x' AND is_active = 't';`;
    execSync(`echo "${updateQuery}" | psql $DATABASE_URL`, { encoding: 'utf8' });
    
    console.log('✅ Database updated with working token');
  } catch (error) {
    console.log('⚠️ Database update failed:', error.message);
  }
}

// Run the fix
fixXPosting();