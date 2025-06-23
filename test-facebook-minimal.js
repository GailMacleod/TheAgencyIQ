/**
 * Minimal Facebook Test - Direct Posting
 * Tests basic posting functionality with working tokens
 */

import crypto from 'crypto';

async function testFacebookMinimal() {
  console.log('Testing minimal Facebook posting...\n');
  
  const userToken = process.env.FACEBOOK_USER_ACCESS_TOKEN;
  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  
  if (!userToken || !pageToken || !appSecret) {
    console.log('Missing required credentials');
    return;
  }
  
  // Test 1: User token posting to timeline
  console.log('Test 1: User timeline posting');
  try {
    const proof1 = crypto.createHmac('sha256', appSecret).update(userToken).digest('hex');
    
    const response1 = await fetch(`https://graph.facebook.com/v20.0/me/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        message: 'TEST: TheAgencyIQ publishing system test - please ignore',
        access_token: userToken,
        appsecret_proof: proof1
      }).toString()
    });
    
    const result1 = await response1.json();
    
    if (result1.error) {
      console.log(`❌ User timeline failed: ${result1.error.message}`);
    } else {
      console.log(`✅ User timeline success: ${result1.id}`);
    }
  } catch (error) {
    console.log(`❌ User timeline error: ${error.message}`);
  }
  
  // Test 2: Get pages and post to first page
  console.log('\nTest 2: Page posting');
  try {
    const proof2 = crypto.createHmac('sha256', appSecret).update(userToken).digest('hex');
    
    // Get pages
    const pagesResponse = await fetch(`https://graph.facebook.com/v20.0/me/accounts?access_token=${userToken}&appsecret_proof=${proof2}`);
    const pagesData = await pagesResponse.json();
    
    if (pagesData.error) {
      console.log(`❌ Pages fetch failed: ${pagesData.error.message}`);
      return;
    }
    
    if (!pagesData.data || pagesData.data.length === 0) {
      console.log('❌ No pages found');
      return;
    }
    
    const page = pagesData.data[0];
    console.log(`Found page: ${page.name} (${page.id})`);
    
    const pageProof = crypto.createHmac('sha256', appSecret).update(page.access_token).digest('hex');
    
    const response2 = await fetch(`https://graph.facebook.com/v20.0/${page.id}/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        message: 'TEST: TheAgencyIQ page posting test - please ignore',
        access_token: page.access_token,
        appsecret_proof: pageProof
      }).toString()
    });
    
    const result2 = await response2.json();
    
    if (result2.error) {
      console.log(`❌ Page posting failed: ${result2.error.message}`);
    } else {
      console.log(`✅ Page posting success: ${result2.id}`);
    }
  } catch (error) {
    console.log(`❌ Page posting error: ${error.message}`);
  }
  
  // Test 3: Direct page token (if available)
  console.log('\nTest 3: Direct page token');
  try {
    const proof3 = crypto.createHmac('sha256', appSecret).update(pageToken).digest('hex');
    
    const response3 = await fetch(`https://graph.facebook.com/v20.0/me/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        message: 'TEST: TheAgencyIQ direct page token test - please ignore',
        access_token: pageToken,
        appsecret_proof: proof3
      }).toString()
    });
    
    const result3 = await response3.json();
    
    if (result3.error) {
      console.log(`❌ Direct page token failed: ${result3.error.message}`);
    } else {
      console.log(`✅ Direct page token success: ${result3.id}`);
    }
  } catch (error) {
    console.log(`❌ Direct page token error: ${error.message}`);
  }
}

testFacebookMinimal()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });