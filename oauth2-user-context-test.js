/**
 * OAuth 2.0 User Context Test for X Platform
 * Tests X posting with OAuth 2.0 User Context authentication
 */

import crypto from 'crypto';

async function testXOAuth2UserContext() {
  console.log('🔄 Testing X OAuth 2.0 User Context Authentication\n');

  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  
  if (!clientId || !clientSecret || !accessToken) {
    console.log('❌ Missing X credentials');
    return;
  }

  try {
    // Method 1: Try Bearer token with User Context
    console.log('📤 Testing Bearer token authentication...');
    
    const bearerResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        text: 'Test from TheAgencyIQ - OAuth 2.0 User Context! DELETE THIS POST' 
      })
    });

    const bearerResult = await bearerResponse.json();

    if (bearerResponse.ok) {
      console.log('✅ X POSTING SUCCESSFUL with Bearer token!');
      console.log(`Post ID: ${bearerResult.data?.id}`);
      return true;
    } else {
      console.log('❌ Bearer token failed:', bearerResult.detail || bearerResult.title);
    }

    // Method 2: Try Basic Auth with client credentials
    console.log('\n📤 Testing Basic Auth with client credentials...');
    
    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const basicResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        text: 'Test from TheAgencyIQ - Basic Auth! DELETE THIS POST' 
      })
    });

    const basicResult = await basicResponse.json();

    if (basicResponse.ok) {
      console.log('✅ X POSTING SUCCESSFUL with Basic Auth!');
      console.log(`Post ID: ${basicResult.data?.id}`);
      return true;
    } else {
      console.log('❌ Basic Auth failed:', basicResult.detail || basicResult.title);
    }

    // Method 3: Generate OAuth 2.0 User Context token
    console.log('\n📤 Attempting OAuth 2.0 User Context token generation...');
    
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const tokenResult = await tokenResponse.json();
    
    if (tokenResponse.ok && tokenResult.access_token) {
      console.log('✅ Generated OAuth 2.0 token');
      
      const newTokenResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenResult.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          text: 'Test from TheAgencyIQ - Generated token! DELETE THIS POST' 
        })
      });

      const newTokenResult = await newTokenResponse.json();

      if (newTokenResponse.ok) {
        console.log('✅ X POSTING SUCCESSFUL with generated token!');
        console.log(`Post ID: ${newTokenResult.data?.id}`);
        return true;
      } else {
        console.log('❌ Generated token failed:', newTokenResult.detail || newTokenResult.title);
      }
    }

    return false;

  } catch (error) {
    console.log('❌ X authentication error:', error.message);
    return false;
  }
}

async function testFacebookPagePosting() {
  console.log('\n🔄 Testing Facebook Page Posting\n');

  const pageToken = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  const appId = process.env.FACEBOOK_APP_ID;
  
  if (!pageToken || !appSecret || !appId) {
    console.log('❌ Missing Facebook credentials');
    return false;
  }

  try {
    // Test page info first
    console.log('📤 Testing page access...');
    
    const pageInfoResponse = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${pageToken}`);
    const pageInfo = await pageInfoResponse.json();
    
    if (pageInfo.error) {
      console.log('❌ Page access failed:', pageInfo.error.message);
      return false;
    }
    
    console.log(`✅ Page access successful: ${pageInfo.name}`);
    
    // Test posting with app secret proof
    console.log('📤 Testing Facebook posting with app secret proof...');
    
    const appsecret_proof = crypto.createHmac('sha256', appSecret).update(pageToken).digest('hex');
    
    const postResponse = await fetch('https://graph.facebook.com/v21.0/me/feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Test from TheAgencyIQ - Facebook posting working! DELETE THIS POST',
        access_token: pageToken,
        appsecret_proof
      })
    });

    const postResult = await postResponse.json();

    if (postResponse.ok) {
      console.log('✅ FACEBOOK POSTING SUCCESSFUL!');
      console.log(`Post ID: ${postResult.id}`);
      return true;
    } else {
      console.log('❌ Facebook posting failed:', postResult.error?.message);
      
      // Try without app secret proof
      console.log('📤 Retrying without app secret proof...');
      
      const retryResponse = await fetch(`https://graph.facebook.com/v21.0/me/feed?access_token=${pageToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test from TheAgencyIQ - Facebook retry! DELETE THIS POST'
        })
      });

      const retryResult = await retryResponse.json();

      if (retryResponse.ok) {
        console.log('✅ FACEBOOK POSTING SUCCESSFUL (without app secret proof)!');
        console.log(`Post ID: ${retryResult.id}`);
        return true;
      } else {
        console.log('❌ Facebook retry failed:', retryResult.error?.message);
      }
    }

    return false;

  } catch (error) {
    console.log('❌ Facebook error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 PLATFORM AUTHENTICATION TEST - OAUTH 2.0 USER CONTEXT\n');
  
  const xSuccess = await testXOAuth2UserContext();
  const fbSuccess = await testFacebookPagePosting();
  
  console.log('\n📊 LAUNCH READINESS STATUS:');
  console.log(`X Platform: ${xSuccess ? '✅ OPERATIONAL' : '❌ NEEDS FIXING'}`);
  console.log(`Facebook Platform: ${fbSuccess ? '✅ OPERATIONAL' : '❌ NEEDS FIXING'}`);
  
  if (xSuccess && fbSuccess) {
    console.log('\n🎯 BOTH PLATFORMS OPERATIONAL - READY FOR 9:00 AM JST LAUNCH!');
  } else {
    console.log('\n⚠️  PLATFORMS NEED FIXING BEFORE LAUNCH');
    if (!xSuccess) {
      console.log('- X: Generate new OAuth 2.0 User Context token');
    }
    if (!fbSuccess) {
      console.log('- Facebook: Generate Page Access Token with admin permissions');
    }
  }
}

main().catch(console.error);