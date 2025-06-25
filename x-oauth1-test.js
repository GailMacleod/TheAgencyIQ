/**
 * Test X OAuth 1.0a Implementation - Alternative Method
 */

import crypto from 'crypto';
import OAuth from 'oauth-1.0a';

async function testXOAuth1() {
  console.log('🔄 TESTING X OAUTH 1.0a IMPLEMENTATION');
  console.log('=====================================');

  const consumerKey = process.env.X_0AUTH_CLIENT_ID;
  const consumerSecret = process.env.X_0AUTH_CLIENT_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const tokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret) {
    console.log('❌ Missing X OAuth consumer credentials');
    return false;
  }

  console.log('✅ Consumer credentials available');
  console.log('Consumer Key:', consumerKey);

  if (!accessToken || !tokenSecret) {
    console.log('❌ Missing X access token credentials');
    console.log('Need to generate OAuth 1.0a access token pair');
    return false;
  }

  console.log('✅ Access token credentials available');
  console.log('Access Token preview:', accessToken.substring(0, 20) + '...');

  try {
    const oauth = OAuth({
      consumer: { key: consumerKey, secret: consumerSecret },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string, key) {
        return crypto.createHmac('sha1', key).update(base_string).digest('base64');
      }
    });

    const token = { key: accessToken, secret: tokenSecret };
    
    const requestData = {
      url: 'https://api.twitter.com/2/tweets',
      method: 'POST',
      data: { text: 'X Platform OAuth 1.0a TEST - TheAgencyIQ operational verification!' }
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

    console.log('🚀 Posting to X with OAuth 1.0a...');

    const response = await fetch(requestData.url, {
      method: 'POST',
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData.data)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ X OAUTH 1.0a POSTING SUCCESSFUL');
      console.log('Tweet ID:', result.data.id);
      console.log('Tweet URL: https://twitter.com/i/web/status/' + result.data.id);
      console.log('✅ X PLATFORM FULLY OPERATIONAL');
      return true;
    } else {
      console.log('❌ X OAuth 1.0a posting failed:');
      console.log('Status:', response.status);
      console.log('Error:', result.title || result.detail || JSON.stringify(result));
      return false;
    }
  } catch (error) {
    console.log('💥 OAuth 1.0a error:', error.message);
    return false;
  }
}

testXOAuth1();