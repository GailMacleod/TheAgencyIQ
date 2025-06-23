/**
 * X OAuth 1.0a Direct Implementation
 * Uses existing credentials without portal configuration changes
 */

import crypto from 'crypto';

function hash_function(base_string, key) {
  return crypto.createHmac('sha1', key).update(base_string).digest('base64');
}

async function getRequestToken() {
  console.log('🔑 X OAUTH 1.0A DIRECT IMPLEMENTATION');
  console.log('====================================');
  
  const consumerKey = process.env.X_0AUTH_CLIENT_ID;
  const consumerSecret = process.env.X_0AUTH_CLIENT_SECRET;
  
  if (!consumerKey || !consumerSecret) {
    console.log('❌ Missing X OAuth credentials');
    return;
  }

  console.log('✅ Using OAuth 1.0a (works with existing app configuration)');
  console.log('✅ Consumer Key:', consumerKey.substring(0, 15) + '...');

  // OAuth 1.0a request token parameters
  const oauth_nonce = crypto.randomBytes(16).toString('hex');
  const oauth_timestamp = Math.floor(Date.now() / 1000).toString();
  const oauth_callback = 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/';

  const oauth_params = {
    oauth_callback: oauth_callback,
    oauth_consumer_key: consumerKey,
    oauth_nonce: oauth_nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: oauth_timestamp,
    oauth_version: '1.0'
  };

  // Create parameter string
  const param_string = Object.keys(oauth_params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauth_params[key])}`)
    .join('&');

  // Create signature base string
  const base_string = `POST&${encodeURIComponent('https://api.twitter.com/oauth/request_token')}&${encodeURIComponent(param_string)}`;
  
  // Create signing key
  const signing_key = `${encodeURIComponent(consumerSecret)}&`;
  
  // Generate signature
  const oauth_signature = hash_function(base_string, signing_key);

  // Create authorization header
  const auth_params = {
    ...oauth_params,
    oauth_signature: oauth_signature
  };

  const auth_header = 'OAuth ' + Object.keys(auth_params)
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(auth_params[key])}"`)
    .join(', ');

  try {
    console.log('\n📡 REQUESTING OAUTH TOKEN...');
    const response = await fetch('https://api.twitter.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': auth_header,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const responseText = await response.text();
    console.log('📋 Response status:', response.status);
    console.log('📋 Response:', responseText);

    if (response.ok) {
      const params = new URLSearchParams(responseText);
      const oauth_token = params.get('oauth_token');
      const oauth_token_secret = params.get('oauth_token_secret');

      if (oauth_token) {
        const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauth_token}`;
        
        console.log('\n✅ SUCCESS! Request token obtained');
        console.log('🔗 Authorization URL:');
        console.log(authUrl);
        console.log('\n📝 OAuth Token:', oauth_token);
        console.log('📝 OAuth Token Secret:', oauth_token_secret);
        
        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Visit the authorization URL above');
        console.log('2. Authorize the app');
        console.log('3. You will be redirected with oauth_token and oauth_verifier');
        console.log('4. Use these to get the final access token');

        return {
          oauth_token,
          oauth_token_secret,
          authUrl
        };
      }
    } else {
      console.log('❌ Request token failed');
      console.log('This suggests the app is configured for OAuth 2.0 only');
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

// Try OAuth 1.0a approach
getRequestToken();