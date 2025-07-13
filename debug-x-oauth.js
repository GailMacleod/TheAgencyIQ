/**
 * Debug X OAuth Credentials
 */

import { config } from 'dotenv';
config();

console.log('🔍 Debugging X OAuth Configuration:');
console.log('X_CONSUMER_KEY exists:', !!process.env.X_CONSUMER_KEY);
console.log('X_CONSUMER_SECRET exists:', !!process.env.X_CONSUMER_SECRET);
console.log('X_CONSUMER_KEY length:', process.env.X_CONSUMER_KEY?.length || 0);
console.log('X_CONSUMER_SECRET length:', process.env.X_CONSUMER_SECRET?.length || 0);

// Check if they're valid (not empty, not placeholders)
if (process.env.X_CONSUMER_KEY && process.env.X_CONSUMER_KEY.length > 10) {
  console.log('✅ X_CONSUMER_KEY appears valid');
} else {
  console.log('❌ X_CONSUMER_KEY appears invalid or missing');
}

if (process.env.X_CONSUMER_SECRET && process.env.X_CONSUMER_SECRET.length > 10) {
  console.log('✅ X_CONSUMER_SECRET appears valid');
} else {
  console.log('❌ X_CONSUMER_SECRET appears invalid or missing');
}

// Test OAuth library directly
console.log('\n🧪 Testing OAuth 1.0a library...');
try {
  const OAuth = require('oauth').OAuth;
  
  const oauth = new OAuth(
    'https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    process.env.X_CONSUMER_KEY,
    process.env.X_CONSUMER_SECRET,
    '1.0A',
    'https://4fc77172-459a-4da7-8c33-5014abb1b73e-00-dqhtnud4ismj.worf.replit.dev/auth/twitter/callback',
    'HMAC-SHA1'
  );
  
  oauth.getOAuthRequestToken((error, oauth_token, oauth_token_secret, results) => {
    if (error) {
      console.log('❌ Direct OAuth test failed:', error);
      console.log('Error data:', error.data);
      console.log('Error status:', error.statusCode);
    } else {
      console.log('✅ Direct OAuth test successful');
      console.log('OAuth token:', oauth_token);
    }
  });
} catch (error) {
  console.log('❌ OAuth library test failed:', error.message);
}