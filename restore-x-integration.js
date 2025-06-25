/**
 * Restore X Platform Integration - Fix OAuth 2.0 User Context
 * Generates proper user access token for posting to X platform
 */

import crypto from 'crypto';

async function restoreXIntegration() {
  console.log('🔄 RESTORING X PLATFORM INTEGRATION');
  console.log('===================================');

  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    console.log('❌ Missing X OAuth credentials');
    return;
  }

  console.log('✅ X OAuth credentials available');
  console.log('Client ID:', clientId);

  // Generate PKCE parameters
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  const state = Buffer.from(JSON.stringify({ userId: 2, timestamp: Date.now() })).toString('base64');
  
  const authUrl = new URL('https://twitter.com/i/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/api/auth/x/callback');
  authUrl.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  console.log('\n🔗 X OAUTH 2.0 USER CONTEXT AUTHORIZATION:');
  console.log(authUrl.toString());
  
  console.log('\n📋 INSTRUCTIONS:');
  console.log('1. Visit the URL above to authorize');
  console.log('2. Complete X authorization');
  console.log('3. Authorization code will be handled by callback');
  
  // Store parameters for token exchange
  global.xRestoreParams = {
    clientId,
    clientSecret,
    codeVerifier,
    redirectUri: 'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/api/auth/x/callback'
  };

  return {
    authUrl: authUrl.toString(),
    codeVerifier,
    state
  };
}

async function exchangeForUserToken(authorizationCode) {
  const params = global.xRestoreParams;
  if (!params) {
    console.log('❌ No stored parameters. Run restoreXIntegration() first.');
    return;
  }

  console.log('🔄 Exchanging authorization code for user access token...');

  try {
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${params.clientId}:${params.clientSecret}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: authorizationCode,
        redirect_uri: params.redirectUri,
        code_verifier: params.codeVerifier
      })
    });

    const result = await tokenResponse.json();

    if (tokenResponse.ok && result.access_token) {
      console.log('✅ USER ACCESS TOKEN GENERATED');
      console.log('Token Type:', result.token_type);
      console.log('Scope:', result.scope);
      
      // Test posting immediately
      const testResponse = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${result.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: 'X Platform RESTORED! TheAgencyIQ posting capability verified! 🚀'
        })
      });

      const testResult = await testResponse.json();
      
      if (testResponse.ok) {
        console.log('✅ TEST POST SUCCESSFUL');
        console.log('Tweet ID:', testResult.data.id);
        console.log('Tweet URL: https://twitter.com/i/web/status/' + testResult.data.id);
        console.log('✅ X PLATFORM FULLY OPERATIONAL');
        
        console.log('\n🔧 UPDATE REPLIT SECRETS:');
        console.log('X_USER_ACCESS_TOKEN =', result.access_token);
        if (result.refresh_token) {
          console.log('X_REFRESH_TOKEN =', result.refresh_token);
        }
        
        return result;
      } else {
        console.log('❌ Test post failed:', JSON.stringify(testResult, null, 2));
      }
    } else {
      console.log('❌ Token exchange failed:', JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.log('💥 Error:', error.message);
  }
}

// Test current stored token in database
async function testDatabaseToken() {
  console.log('🔄 TESTING DATABASE X TOKEN');
  console.log('===========================');

  // Simple database query without imports
  const { execSync } = await import('child_process');
  
  try {
    const query = `SELECT access_token FROM platform_connections WHERE platform = 'x' AND is_active = 't' ORDER BY id DESC LIMIT 1;`;
    const result = execSync(`echo "${query}" | psql $DATABASE_URL -t`, { encoding: 'utf8' });
    
    const token = result.trim();
    if (!token) {
      console.log('❌ No X token found in database');
      return false;
    }

    console.log('✅ Found X token in database');
    console.log('Token preview:', token.substring(0, 20) + '...');

    // Test with stored token
    const testResponse = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Testing X platform with database token - TheAgencyIQ operational check!'
      })
    });

    const testResult = await testResponse.json();
    
    if (testResponse.ok) {
      console.log('✅ DATABASE TOKEN WORKS - POST SUCCESSFUL');
      console.log('Tweet ID:', testResult.data.id);
      console.log('✅ X PLATFORM READY - NO ACTION NEEDED');
      return true;
    } else {
      console.log('❌ Database token failed:', testResult.title || testResult.detail);
      console.log('Need fresh OAuth 2.0 User Context token');
      return false;
    }
  } catch (error) {
    console.log('💥 Database test error:', error.message);
    return false;
  }
}

// Run diagnostic first
testDatabaseToken().then(works => {
  if (!works) {
    console.log('\n🔧 GENERATING NEW OAUTH URL...');
    restoreXIntegration();
  }
});

// Export for manual use
global.restoreXIntegration = restoreXIntegration;
global.exchangeForUserToken = exchangeForUserToken;
global.testDatabaseToken = testDatabaseToken;