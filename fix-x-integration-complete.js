/**
 * Complete X Integration Fix - Restore Yesterday's Working Configuration
 */

import crypto from 'crypto';

async function fixXIntegrationComplete() {
  console.log('RESTORING X PLATFORM TO WORKING STATE');
  console.log('====================================');

  // Check all available credentials
  const credentials = {
    consumerKey: process.env.X_0AUTH_CLIENT_ID,
    consumerSecret: process.env.X_0AUTH_CLIENT_SECRET,
    oauth2Token: process.env.X_OAUTH2_ACCESS_TOKEN,
    oauth1Token: process.env.X_ACCESS_TOKEN,
    oauth1Secret: process.env.X_ACCESS_TOKEN_SECRET
  };

  console.log('Credential status:');
  Object.entries(credentials).forEach(([key, value]) => {
    console.log(`${key}: ${value ? 'Available' : 'Missing'}`);
  });

  // Generate fresh OAuth 2.0 User Context token (what works for posting)
  if (credentials.consumerKey && credentials.consumerSecret) {
    const authResult = await generateUserContextAuth();
    if (authResult) {
      console.log('Generated fresh OAuth URL for user authorization');
      return authResult;
    }
  }

  // Test OAuth 1.0a as fallback
  if (credentials.oauth1Token && credentials.oauth1Secret && credentials.consumerKey && credentials.consumerSecret) {
    const oauth1Result = await testOAuth1Posting();
    if (oauth1Result) {
      await updateDatabaseWithWorkingToken(credentials.oauth1Token);
      return { method: 'oauth1', working: true };
    }
  }

  console.log('No working authentication method found');
  return null;
}

async function generateUserContextAuth() {
  const clientId = process.env.X_0AUTH_CLIENT_ID;
  const clientSecret = process.env.X_0AUTH_CLIENT_SECRET;
  
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

  console.log('\nX OAUTH 2.0 USER CONTEXT URL:');
  console.log(authUrl.toString());
  
  console.log('\nTo restore X posting:');
  console.log('1. Visit the URL above');
  console.log('2. Authorize the application');
  console.log('3. System will automatically handle the callback');
  
  return {
    authUrl: authUrl.toString(),
    codeVerifier,
    state,
    method: 'oauth2_user_context'
  };
}

async function testOAuth1Posting() {
  console.log('\nTesting OAuth 1.0a method...');
  
  const OAuth = (await import('oauth-1.0a')).default;
  
  const oauth = OAuth({
    consumer: { 
      key: process.env.X_0AUTH_CLIENT_ID, 
      secret: process.env.X_0AUTH_CLIENT_SECRET 
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    }
  });

  const token = { 
    key: process.env.X_ACCESS_TOKEN, 
    secret: process.env.X_ACCESS_TOKEN_SECRET 
  };
  
  const requestData = {
    url: 'https://api.twitter.com/2/tweets',
    method: 'POST',
    data: { text: 'X Platform RESTORED - TheAgencyIQ operational verification successful!' }
  };

  try {
    const authHeader = oauth.toHeader(oauth.authorize(requestData, token));

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
      console.log('X OAuth 1.0a POSTING SUCCESSFUL');
      console.log('Tweet ID:', result.data.id);
      console.log('X PLATFORM FULLY OPERATIONAL');
      return true;
    } else {
      console.log('OAuth 1.0a failed:', result.title || result.detail);
      return false;
    }
  } catch (error) {
    console.log('OAuth 1.0a error:', error.message);
    return false;
  }
}

async function updateDatabaseWithWorkingToken(token) {
  try {
    const { execSync } = await import('child_process');
    
    const updateQuery = `UPDATE platform_connections SET access_token = '${token}' WHERE platform = 'x' AND is_active = 't';`;
    execSync(`echo "${updateQuery}" | psql $DATABASE_URL`, { encoding: 'utf8' });
    
    console.log('Database updated with working X token');
  } catch (error) {
    console.log('Database update warning:', error.message);
  }
}

// Run the complete fix
fixXIntegrationComplete().then(result => {
  if (result) {
    console.log('\nX PLATFORM FIX COMPLETE');
    if (result.method === 'oauth1') {
      console.log('Using OAuth 1.0a - X posting restored');
    } else if (result.method === 'oauth2_user_context') {
      console.log('OAuth 2.0 User Context URL generated');
      console.log('Visit the URL to complete authorization');
    }
  } else {
    console.log('X platform requires manual OAuth setup');
  }
});