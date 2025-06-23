/**
 * Debug Facebook Token Structure
 * Examines token format and signature generation
 */

import crypto from 'crypto';

async function debugFacebookTokens() {
  console.log('🔧 Debugging Facebook token structure...\n');
  
  const tokens = {
    'FACEBOOK_ACCESS_TOKEN': process.env.FACEBOOK_ACCESS_TOKEN,
    'FACEBOOK_USER_ACCESS_TOKEN': process.env.FACEBOOK_USER_ACCESS_TOKEN,
    'FACEBOOK_PAGE_ACCESS_TOKEN': process.env.FACEBOOK_PAGE_ACCESS_TOKEN
  };
  
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  console.log(`App Secret: ${appSecret ? 'Present' : 'Missing'}\n`);
  
  for (const [name, token] of Object.entries(tokens)) {
    if (!token) {
      console.log(`${name}: Missing`);
      continue;
    }
    
    console.log(`${name}: Present`);
    console.log(`- Length: ${token.length}`);
    console.log(`- First 10 chars: ${token.substring(0, 10)}...`);
    console.log(`- Last 10 chars: ...${token.substring(token.length - 10)}`);
    
    if (appSecret) {
      // Generate signature
      const proof = crypto.createHmac('sha256', appSecret).update(token).digest('hex');
      console.log(`- Generated proof: ${proof.substring(0, 16)}...`);
      
      // Test basic API call with proof
      try {
        const response = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${token}&appsecret_proof=${proof}`);
        const data = await response.json();
        
        if (data.error) {
          console.log(`- API Test: FAILED - ${data.error.message}`);
          
          // Try without proof for comparison
          const response2 = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${token}`);
          const data2 = await response2.json();
          
          if (data2.error) {
            console.log(`- Without proof: FAILED - ${data2.error.message}`);
          } else {
            console.log(`- Without proof: SUCCESS - ${data2.name || data2.id}`);
          }
        } else {
          console.log(`- API Test: SUCCESS - ${data.name} (${data.id})`);
        }
      } catch (error) {
        console.log(`- API Test: ERROR - ${error.message}`);
      }
    }
    
    console.log('');
  }
  
  // Test token introspection
  console.log('Testing token introspection...');
  for (const [name, token] of Object.entries(tokens)) {
    if (!token) continue;
    
    try {
      const response = await fetch(`https://graph.facebook.com/v20.0/me?access_token=${token}&fields=id,name,email`);
      const data = await response.json();
      
      if (data.error) {
        console.log(`${name} introspection: ${data.error.message}`);
      } else {
        console.log(`${name} introspection: ${data.name} (${data.id})`);
      }
    } catch (error) {
      console.log(`${name} introspection error: ${error.message}`);
    }
  }
}

// Run the debug
debugFacebookTokens()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Debug failed:', error);
    process.exit(1);
  });